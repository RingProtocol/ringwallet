import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 自动更新 Service Worker 更新策略
      registerType: 'autoUpdate',
      // 指定需要缓存的额外静态资源（请确保这些文件存在于 public 文件夹下）
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: 'React Ethers AppKit PWA',
        short_name: 'AppKit PWA',
        description: 'A React application with Ethers and AppKit featuring PWA functionality',
        theme_color: '#000000',  // 可按需调整主题颜色，与 AppKit 中主题变量保持一致
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
