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
  publicDir: path.resolve(projectRoot, 'public'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
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
            src: 'icons/ringcorn.svg',
            sizes: 'any',
            type: 'image/svg+xml'
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
    allowedHosts: ['wallet.testring.org', 'bridget-tritheistical-talia.ngrok-free.dev']
  }
})
