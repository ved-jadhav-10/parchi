/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,json,svg,png,woff2}'] },
      manifest: {
        name: 'Parchi',
        short_name: 'Parchi',
        theme_color: '#122056',
        background_color: '#fafafd',
        display: 'standalone',
        // An installed app opens straight on the checker; the landing page is for first-time visitors.
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
