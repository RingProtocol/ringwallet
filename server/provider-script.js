/**
 * This module exports the Ring Wallet DApp SDK as a string constant,
 * so it can be used in serverless environments where filesystem reads
 * are unavailable at runtime.
 *
 * When updating the SDK, run:  node build-provider.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let PROVIDER_SCRIPT

try {
  PROVIDER_SCRIPT = readFileSync(
    join(__dirname, '..', 'skills', 'dapps', 'dappsdk.js'),
    'utf-8'
  )
} catch {
  try {
    PROVIDER_SCRIPT = readFileSync(
      join(__dirname, 'dappsdk.js'),
      'utf-8'
    )
  } catch {
    PROVIDER_SCRIPT = '// Ring Wallet DApp SDK placeholder - file not found'
    console.warn('[provider-script] Could not load dappsdk.js')
  }
}

export { PROVIDER_SCRIPT }
