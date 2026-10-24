/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,json,svg,png}'] },
      manifest: {
        name: 'Rx Safety Checker',
        short_name: 'RxCheck',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts', 'src/**/*.test.ts'] },
})
