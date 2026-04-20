#!/usr/bin/env node
import { setTimeout as delay } from 'timers/promises'

const url = process.env.TEST_SOLANA_RPC_URL || 'http://127.0.0.1:8899'
const maxAttempts = Number(process.env.SOLANA_RPC_WAIT_ATTEMPTS || 90)

async function probe() {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestBlockhash',
      params: [{ commitment: 'confirmed' }],
    }),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const j = await r.json()
  if (j.error) throw new Error(j.error.message ?? JSON.stringify(j.error))
}

for (let i = 0; i < maxAttempts; i++) {
  try {
    await probe()
    process.exit(0)
  } catch {
    await delay(1000)
  }
}
console.error(`Solana RPC not ready after ${maxAttempts}s: ${url}`)
process.exit(1)
