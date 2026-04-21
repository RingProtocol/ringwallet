import { test, expect } from '@playwright/test'
import { setupSolanaRoutes } from '../fixtures/wallet.fixture'
import { SOLANA_DEVNET_RPC_URLS } from '../env'

test('devnet RPC URLs reach local validator via route', async ({ page }) => {
  test.skip(
    process.env.SOLANA_E2E_LOCAL !== '1',
    'Set SOLANA_E2E_LOCAL=1 and run solana-test-validator on 127.0.0.1:8899'
  )

  await setupSolanaRoutes(page)
  await page.goto('about:blank')

  const url = SOLANA_DEVNET_RPC_URLS[0]
  const ok = await page.evaluate(async (rpcUrl: string) => {
    const r = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLatestBlockhash',
        params: [{ commitment: 'confirmed' }],
      }),
    })
    if (!r.ok) return false
    const j = (await r.json()) as { result?: unknown; error?: unknown }
    return !j.error && j.result != null
  }, url)

  expect(ok).toBe(true)
})
