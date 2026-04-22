# mpaudiodec_web (Next.js)

Next.js App Router frontend with SSR + PWA, and server-side API proxy.

## Architecture

`Laravel API -> Next.js proxy (/api/upstream/*) -> Next.js SSR/UI`

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

## Screenshots

### Login

![Login screen](docs/screenshots/login.png)

### Home Player

![Home player screen](docs/screenshots/home-player.png)

### Repeat Settings

![Repeat settings modal](docs/screenshots/repeat-settings.png)
