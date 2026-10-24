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
        icons: [],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts', 'src/**/*.test.ts'] },
})
