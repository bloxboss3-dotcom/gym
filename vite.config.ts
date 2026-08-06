import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { forgedServiceWorker } from './scripts/sw-plugin'

// GitHub Pages serves this project from https://<user>.github.io/gym/.
// BASE_PATH is overridable so the same build works on Netlify/Vercel/root domains.
const base = process.env.BASE_PATH ?? '/gym/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), forgedServiceWorker({ base })],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // React and the router change far less often than the app does, so a
        // separate vendor chunk survives most deploys in the user's cache.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
