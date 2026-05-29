import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const projectRoot = path.resolve(__dirname, '../..')

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
  base: '',
  plugins: [
    wasm(),
    topLevelAwait(),
    nodePolyfills({ protocolImports: true, exclude: ['vm'] }),
    react(),
    sriPlugin(),
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
