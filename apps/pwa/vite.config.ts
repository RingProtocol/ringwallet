import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const projectRoot = path.resolve(__dirname, '../..')
const apiProxyTarget =
  process.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000'

function sriPlugin() {
  return {
    name: 'sri',
    apply: 'build' as const,
    enforce: 'post' as const,
    transformIndexHtml(
      html: string,
      ctx: {
        bundle?: Record<
          string,
          { fileName: string; source?: string | Uint8Array }
        >
      }
    ) {
      if (!ctx.bundle) return html
      const getHash = (fileName: string) => {
        const chunk = ctx.bundle![fileName]
        if (!chunk || !chunk.source) return null
        const source =
          typeof chunk.source === 'string'
            ? chunk.source
            : Buffer.from(chunk.source)
        const hash = crypto
          .createHash('sha384')
          .update(source)
          .digest()
          .toString('base64')
        return `sha384-${hash}`
      }
      return html.replace(
        /<(script|link)\s+([^>]*?)\s*(?:integrity="[^"]*"\s*)?>/g,
        (match, tag, attrs) => {
          const srcMatch = attrs.match(/(?:src|href)="([^"]+)"/)
          if (!srcMatch) return match
          const src = srcMatch[1]
          if (
            src.startsWith('http') ||
            src.startsWith('//') ||
            src.startsWith('data:')
          )
            return match
          const fileName = src.replace(/^\//, '')
          const integrity = getHash(fileName)
          if (!integrity) return match
          return `<${tag} ${attrs} integrity="${integrity}" crossorigin="anonymous">`
        }
      )
    },
  }
}

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
        maximumFileSizeToCacheInBytes: 2000 * 1024,
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
    sriPlugin(),
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
    allowedHosts: ['*.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
