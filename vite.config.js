import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifestFilename: 'manifest.json', // 强制使用标准文件名
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
  ], // 暂时移除 basicSsl
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['wallet.testring.org']
  }
})