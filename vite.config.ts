import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import babel from '@rolldown/plugin-babel'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { VitePWA } from 'vite-plugin-pwa'

type B2AuthResponse = {
  apiUrl: string
  authorizationToken: string
  downloadUrl: string
}

let b2AuthCache: B2AuthResponse | null = null

function getFileNameFromSourceUrl(sourceUrl: string, bucketName: string): string | null {
  try {
    const url = new URL(sourceUrl)
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    if (!pathname) return null
    if (pathname.startsWith(`${bucketName}/`)) {
      return pathname.slice(bucketName.length + 1)
    }
    return pathname
  } catch {
    return null
  }
}

function encodeObjectPath(fileName: string): string {
  return fileName
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

async function getB2Auth(keyId: string, applicationKey: string): Promise<B2AuthResponse> {
  if (b2AuthCache) return b2AuthCache
  const credentials = Buffer.from(`${keyId}:${applicationKey}`).toString('base64')
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  })
  if (!response.ok) {
    throw new Error('Failed to authorize Backblaze account')
  }
  const payload = (await response.json()) as B2AuthResponse
  b2AuthCache = payload
  return payload
}

async function getSignedBackblazeUrl(args: {
  keyId: string
  applicationKey: string
  bucketId: string
  bucketName: string
  fileName: string
  ttlSeconds: number
}): Promise<string> {
  const auth = await getB2Auth(args.keyId, args.applicationKey)
  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId: args.bucketId,
      fileNamePrefix: args.fileName,
      validDurationInSeconds: args.ttlSeconds,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to get Backblaze download authorization')
  }

  const payload = (await response.json()) as { authorizationToken: string }
  const encodedPath = encodeObjectPath(args.fileName)
  return `${auth.downloadUrl}/file/${args.bucketName}/${encodedPath}?Authorization=${encodeURIComponent(payload.authorizationToken)}`
}

type ConnectMiddlewares = {
  use: (path: string, handler: (req: any, res: any) => void | Promise<void>) => void
}

type DevAudioSession = { url: string; exp: number }

const devAudioProxySessions = new Map<string, DevAudioSession>()
const DEV_AUDIO_SESSION_TTL_MS = 20 * 60 * 1000

function pruneDevAudioProxySessions() {
  const now = Date.now()
  for (const [id, entry] of devAudioProxySessions) {
    if (entry.exp < now) devAudioProxySessions.delete(id)
  }
}

function assertAllowedBackblazeTarget(targetUrl: string): URL | null {
  let remote: URL
  try {
    remote = new URL(targetUrl)
  } catch {
    return null
  }
  if (remote.protocol !== 'https:' && remote.protocol !== 'http:') {
    return null
  }
  const host = remote.hostname.toLowerCase()
  if (!host.includes('backblazeb2.com') && !host.includes('backblaze')) {
    return null
  }
  return remote
}

async function pipeRemoteAudioToResponse(
  req: { method?: string; headers: { range?: string | string[] } },
  res: any,
  targetUrl: string,
) {
  const forwardHeaders: Record<string, string> = {}
  const range = req.headers.range
  if (typeof range === 'string') {
    forwardHeaders.Range = range
  }

  const upstream = await fetch(targetUrl, {
    method: req.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: forwardHeaders,
    redirect: 'follow',
  })

  if (!upstream.ok) {
    const snippet = await upstream.text()
    res.statusCode = upstream.status
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(
      `Backblaze fetch failed (${upstream.status}). ${snippet.slice(0, 500)}${snippet.length > 500 ? '…' : ''}`,
    )
    return
  }

  res.statusCode = upstream.status
  const passthrough = [
    'content-type',
    'content-length',
    'accept-ranges',
    'content-range',
    'etag',
    'last-modified',
  ] as const
  for (const name of passthrough) {
    const v = upstream.headers.get(name)
    if (v) res.setHeader(name, v)
  }

  if (req.method === 'HEAD' || upstream.status === 204) {
    res.end()
    return
  }

  if (!upstream.body) {
    res.end()
    return
  }

  const nodeStream = Readable.fromWeb(upstream.body as import('stream/web').ReadableStream)
  nodeStream.on('error', () => {
    if (!res.writableEnded) {
      res.destroy()
    }
  })
  res.on('close', () => {
    nodeStream.destroy()
  })
  nodeStream.pipe(res)
}

/**
 * Presigned B2/S3 URLs must not be nested in another query string (double-encoding breaks signatures).
 * Register the full URL via POST, then stream with a short same-origin path.
 */
function installDevAudioProxyMiddleware(middlewares: ConnectMiddlewares) {
  // `enforce: 'pre'` + first plugin: run before Vite's HTML/SPA fallback so GET /dev-audio-proxy/s/:id
  // is not answered with index.html (which breaks <audio>).
  const handler = async (req: any, res: any) => {
    // Under `use('/dev-audio-proxy', …)`, Connect strips that prefix from `req.url`.
    const pathOnly = (req.url ?? '/').split('?')[0]
    let pathname = pathOnly.replace(/\/$/, '') || '/'
    if (!pathname.startsWith('/dev-audio-proxy')) {
      pathname = `/dev-audio-proxy${pathname}`
    }

    if (pathname === '/dev-audio-proxy/session') {
      if (req.method === 'POST') {
        try {
          const bodyChunks: Uint8Array[] = []
          for await (const chunk of req) bodyChunks.push(chunk as Uint8Array)
          const raw = Buffer.concat(bodyChunks).toString('utf8')
          const parsed = raw ? (JSON.parse(raw) as { url?: string }) : {}
          const targetUrl = parsed.url?.trim()
          if (!targetUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: 'Missing url' }))
            return
          }
          if (!assertAllowedBackblazeTarget(targetUrl)) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: 'Host not allowed' }))
            return
          }
          pruneDevAudioProxySessions()
          const id = randomUUID()
          devAudioProxySessions.set(id, { url: targetUrl, exp: Date.now() + DEV_AUDIO_SESSION_TTL_MS })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ id }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              message: error instanceof Error ? error.message : 'Session error',
            }),
          )
        }
        return
      }
      res.statusCode = 405
      res.end()
      return
    }

    const streamMatch = pathname.match(/^\/dev-audio-proxy\/s\/([^/]+)\/?$/)
    if (streamMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      pruneDevAudioProxySessions()
      const id = streamMatch[1]
      const session = devAudioProxySessions.get(id)
      if (!session) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain')
        res.end('Unknown or expired session')
        return
      }

      try {
        await pipeRemoteAudioToResponse(req, res, session.url)
      } catch (err) {
        if (!res.headersSent) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'text/plain')
          res.end(err instanceof Error ? err.message : 'Proxy fetch failed')
        }
      }
      return
    }

    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain')
    res.end('Not found')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- connect typings omit `next`; mount is correct at runtime
  ;(middlewares as any).use('/dev-audio-proxy', handler)
}

function devAudioProxyPlugin() {
  return {
    name: 'dev-audio-proxy',
    enforce: 'pre' as const,
    configureServer(server: { middlewares: ConnectMiddlewares }) {
      installDevAudioProxyMiddleware(server.middlewares)
    },
    configurePreviewServer(server: { middlewares: ConnectMiddlewares }) {
      installDevAudioProxyMiddleware(server.middlewares)
    },
  }
}

function installB2SignDownloadMiddleware(middlewares: ConnectMiddlewares, env: Record<string, string>) {
  middlewares.use('/b2/sign-download', async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ message: 'Method not allowed' }))
      return
    }

    const keyId = env.B2_KEY_ID
    const applicationKey = env.B2_APPLICATION_KEY
    const bucketId = env.B2_BUCKET_ID
    const bucketName = env.B2_BUCKET_NAME
    const ttlSeconds = Number(env.B2_SIGNED_URL_TTL_SECONDS || '3600')

    if (!keyId || !applicationKey || !bucketId || !bucketName) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ message: 'Missing Backblaze server env values' }))
      return
    }

    try {
      const bodyChunks: Uint8Array[] = []
      for await (const chunk of req) bodyChunks.push(chunk)
      const raw = Buffer.concat(bodyChunks).toString('utf8')
      const parsed = raw ? (JSON.parse(raw) as { sourceUrl?: string; fileName?: string }) : {}

      const derivedFileName =
        parsed.fileName ||
        (parsed.sourceUrl ? getFileNameFromSourceUrl(parsed.sourceUrl, bucketName) : null)

      if (!derivedFileName) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ message: 'Invalid source URL or file name' }))
        return
      }

      const url = await getSignedBackblazeUrl({
        keyId,
        applicationKey,
        bucketId,
        bucketName,
        fileName: derivedFileName,
        ttlSeconds,
      })

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ url, fileName: derivedFileName, expiresIn: ttlSeconds }))
    } catch (error) {
      b2AuthCache = null
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          message: error instanceof Error ? error.message : 'Unable to sign Backblaze URL',
        }),
      )
    }
  })
}

function b2SignerPlugin(env: Record<string, string>) {
  return {
    name: 'b2-private-signing-endpoint',
    configureServer(server: { middlewares: ConnectMiddlewares }) {
      installB2SignDownloadMiddleware(server.middlewares, env)
    },
    configurePreviewServer(server: { middlewares: ConnectMiddlewares }) {
      installB2SignDownloadMiddleware(server.middlewares, env)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Set `VITE_DEV_HTTPS=false` in `.env` to use http://localhost (no self-signed cert warning). Localhost is still a secure context for most APIs. */
  const useDevHttps = env.VITE_DEV_HTTPS !== 'false' && env.VITE_DEV_HTTPS !== '0'

  return {
    plugins: [
      devAudioProxyPlugin(),
      ...(useDevHttps ? [basicSsl()] : []),
      b2SignerPlugin(env),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      VitePWA({
        devOptions: {
          enabled: false,
        },
        registerType: 'autoUpdate',
        strategies: 'generateSW',
        injectRegister: 'script',
        manifest: {
          name: 'AudioDec',
          short_name: 'AudioDec',
          description: 'Audiodec web app',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          id: '/?source=pwa',
          background_color: '#000000',
          theme_color: '#000000',
          icons: [
            {
              src: '/favicon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: '/favicon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './src'),
      },
    },
    server: {
      https: useDevHttps ? {} : false,
      proxy: {
        '/backend': {
          target: 'https://audiodec-api.onrender.com',
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/backend/, ''),
        },
      },
    },
  }
})
