import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const reactPath = fileURLToPath(new URL('./node_modules/react', import.meta.url))
const reactDomPath = fileURLToPath(new URL('./node_modules/react-dom', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@shared': fileURLToPath(new URL('../biz-app-shared/src', import.meta.url)),
      'react/jsx-runtime': reactPath + '/jsx-runtime.js',
      'react/jsx-dev-runtime': reactPath + '/jsx-dev-runtime.js',
      'react': reactPath,
      'react-dom': reactDomPath,
    },
  },
  server: {
    port: 5173,
    // Frontend dev server. /api requests are proxied to the Railway backend by
    // default — so `npm run dev` lets you see frontend changes instantly without
    // running a local server. Override with VITE_API_TARGET=http://localhost:3000
    // when you also want to test backend changes locally.
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://biz-app-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
