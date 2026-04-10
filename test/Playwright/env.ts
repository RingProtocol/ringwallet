import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Minimal .env parser — avoids adding dotenv as a dependency.
 */
function loadEnv(): Record<string, string> {
  const envPath = resolve(__dirname, '../../.env')
  try {
    const content = readFileSync(envPath, 'utf-8')
    const vars: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      let value = trimmed.slice(eqIndex + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      vars[key] = value
    }
    return vars
  } catch {
    return {}
  }
}

const env = { ...loadEnv(), ...process.env }

export const E2E_CONFIG = {
  baseUrl: env.E2E_BASE_URL || 'http://localhost:3000',
  masterSeed:
    env.E2E_MASTER_SEED ||
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  evmChainId: env.E2E_EVM_CHAIN_ID || '11155111',
  evmSendAmount: env.E2E_EVM_SEND_AMOUNT || '0.0001',
}
