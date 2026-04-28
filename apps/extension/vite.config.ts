import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const projectRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  root,
  base: '',
  plugins: [
    wasm(),
    topLevelAwait(),
    nodePolyfills({ protocolImports: true, exclude: ['vm'] }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist-extension'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(root, 'popup.html'),
        background: path.resolve(root, 'background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
