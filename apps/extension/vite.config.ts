import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const projectRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src')
    }
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist-extension'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(root, 'popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
