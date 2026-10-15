/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable, and the app shell works offline. Speech and in-browser models are cached
    // separately by transformers.js in the Cache API after their first download.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AutoFormat',
        short_name: 'AutoFormat',
        description: 'Talk the way you talk. Get back writing that still sounds like you.',
        theme_color: '#f3eee4',
        background_color: '#f3eee4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // The ONNX runtime's WebAssembly is ~27 MB; cache it on first use instead of precaching.
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: { cacheName: 'onnx-runtime', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  // The ML worker bundles transformers.js (~550 kB) and is loaded on demand, off the main thread.
  build: { chunkSizeWarningLimit: 600 },
  // transformers.js ships its own WASM/ONNX runtime; let it load lazily instead of pre-bundling.
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
