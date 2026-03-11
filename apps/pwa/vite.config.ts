import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const projectRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  root,
  // Load .env from repo root so `vite build` picks up VITE_* same as local dev
  envDir: projectRoot,
  publicDir: path.resolve(projectRoot, 'public'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.png', 'icons/logo.png'],
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'Ring Wallet',
        short_name: 'Ring Wallet',
        description: 'Secure Passkey Wallet',
        theme_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src')
    }
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['bridget-tritheistical-talia.ngrok-free.dev']
  }
})
