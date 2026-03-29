import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const projectRoot = path.resolve(__dirname, '../..')
const apiProxyTarget =
  process.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000'

export default defineConfig({
  root,
  // Load .env from repo root so `vite build` picks up VITE_* same as local dev
  envDir: projectRoot,
  publicDir: path.resolve(projectRoot, 'public'),
  plugins: [
    wasm(),
    topLevelAwait(),
    nodePolyfills({ protocolImports: true }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.png', 'icons/logo.png'],
      manifestFilename: 'manifest.json',
      workbox: {
        // Exclude large vendor chunks from SW precache; they are loaded on demand
        globPatterns: ['**/*.{html,css}', 'assets/index-*.js'],
        maximumFileSizeToCacheInBytes: 600 * 1024,
        // Use development mode to avoid workbox's internal terser minification
        // which crashes on large precache manifests (workbox-build v7 known issue)
        mode: 'development',
      },
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
            type: 'image/png',
          },
          {
            src: 'icons/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          solana: ['@solana/web3.js', '@solana/spl-token', 'ed25519-hd-key'],
          ethers: ['ethers'],
          bitcoin: ['bitcoinjs-lib', 'bip32', 'tiny-secp256k1'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['bridget-tritheistical-talia.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
