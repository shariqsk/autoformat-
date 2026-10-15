/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
