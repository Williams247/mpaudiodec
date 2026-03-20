import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      devOptions: {
        enabled: true,
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
})
