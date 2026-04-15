import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import babel from '@rolldown/plugin-babel'
import path from 'node:path'
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

function b2SignerPlugin(env: Record<string, string>) {
  return {
    name: 'b2-private-signing-endpoint',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: any, res: any) => void) => void } }) {
      server.middlewares.use('/b2/sign-download', async (req, res) => {
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
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      basicSsl(),
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
      https: {},
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
