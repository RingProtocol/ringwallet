import { loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))
const env = loadEnv('test', root, '')
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  test: {
    include: ['test/chain/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 120_000,
    hookTimeout: 60_000,
    poolOptions: {
      threads: { singleThread: true },
    },
  },
})
