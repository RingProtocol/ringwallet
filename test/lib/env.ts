import { loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)

let merged = false

/** Merge `.env.test` (and siblings) into process.env — idempotent. */
export function ensureTestEnv(): void {
  if (merged) return
  const env = loadEnv('test', repoRoot, '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
  merged = true
}

/**
 * Same key resolution as `getAlchemyApiKey` but does not throw (for optional test URLs).
 */
export function tryGetAlchemyApiKey(): string | null {
  ensureTestEnv()
  const key =
    process.env.ALCHEMY_API_KEY?.trim() ||
    process.env.VITE_ALCHEMY_RPC_KEY?.trim()
  return key || null
}

/**
 * API key for Alchemy fork URLs (Node / CLI only).
 * Falls back to VITE_ALCHEMY_RPC_KEY so one key works for app + tests.
 */
export function getAlchemyApiKey(): string {
  const key = tryGetAlchemyApiKey()
  if (!key) {
    throw new Error(
      'Missing ALCHEMY_API_KEY (or VITE_ALCHEMY_RPC_KEY). Add it to .env.test — see documents/testchain/env.test.example'
    )
  }
  return key
}
