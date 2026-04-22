# mpaudiodec_web (Next.js)

Next.js App Router frontend with SSR + PWA, and server-side API proxy.

## Architecture

`Laravel API -> Next.js proxy (/api/upstream/*) -> Next.js SSR/UI`

## Environment

Create `.env` from `.env.example`:

- `BACKEND_API_URL`: Laravel origin (no trailing slash), server-only.
- `API_PAYLOAD_ENCRYPTION_KEY`: Base64 32-byte key used for auth payload encryption (`go`) and `fetch-music` asset decryption in proxy.

No API base URL or encryption key is exposed in client code.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
npm run start
```
