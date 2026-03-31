import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const env = loadEnv('', __dirname, '')

for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}

export default defineConfig({
  test: {
    // Node.js environment: Buffer / crypto are available natively,
    // so no Vite node-polyfills plugin is needed here.
    environment: 'node',
    globals: true,
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/services/solana*.ts', 'src/utils/tokenStorage.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
