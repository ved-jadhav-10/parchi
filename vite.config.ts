/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // brands.json is over 1 MB; Workbox skips anything above 2 MiB by default, which would silently break offline checks as the data grows.
      workbox: { globPatterns: ['**/*.{js,css,html,json,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 8 * 1024 * 1024 },
      manifest: {
        name: 'Parchi',
        short_name: 'Parchi',
        theme_color: '#122056',
        background_color: '#fafafd',
        display: 'standalone',
        id: '/',
        scope: '/',
        description: 'Decision support for the verifying pharmacist: checks Indian brand-name prescriptions, offline.',
        // An installed app opens straight on the review queue; the landing page is for first-time visitors.
        start_url: '/#/queue',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  // Several suites build the 32k-brand resolver; run in parallel they pass the 5 s default on a busy machine.
  test: { include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'eval/**/*.test.ts'], testTimeout: 20000 },
})
