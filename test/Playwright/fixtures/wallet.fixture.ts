import { test as base, expect, type Page } from '@playwright/test'
import { TESTID } from '../../../src/components/testids'
import { ChainFamily } from '../../../src/models/ChainType'
import { chainRegistry } from '../../../src/services/chainplugins/registry'
import '../../../src/services/chainplugins/evm/evmPlugin' // side-effect: registers EvmChainPlugin
import { E2E_CONFIG_EVM, EVM_TESTNET_CHAINS } from '../env'
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
  type VirtualAuthenticator,
} from '../helpers/webauthn'

/** Same derivation as the `wallet` fixture — for tests that need the address before `page.goto`. */
export function getE2EWalletEvmAddresses(): string[] {
  const seedBytes = new Uint8Array(
    Buffer.from(E2E_CONFIG_EVM.masterSeed, 'hex')
  )
  const evmPlugin = chainRegistry.get(ChainFamily.EVM)!
  const evmAccounts = evmPlugin.deriveAccounts(seedBytes, 5)
  return evmAccounts.map((a) => a.address)
}

export interface WalletContext {
  page: Page
  auth: VirtualAuthenticator
  /** EVM addresses derived from test seed: [sender, recipient, ...] */
  evmAddresses: string[]
}

/**
 * Intercept every RPC URL for all E2E test chains and proxy them to the
 * local Anvil instance running on the configured port.
 *
 * How this connects to evm-transfer.spec.ts:
 *   page.route() intercepts ALL fetch() calls made by the browser page, including
 *   those that happen later (chain switch, balance poll, broadcast).
 *   When the test switches chains and the app calls EvmRpcService.getBalance() /
 *   .request('eth_sendRawTransaction', ...), those are fetch() calls to the chain's
 *   rpcUrl.  Playwright catches them here and forwards to local Anvil, so the app
 *   never reaches the real testnet — it always talks to the funded local chain.
 */
export async function setupAnvilRoutes(page: Page): Promise<void> {
  for (const chain of EVM_TESTNET_CHAINS) {
    const anvilRpc = `http://127.0.0.1:${chain.anvilPort}`
    for (const rpcUrl of chain.rpcUrls) {
      await page.route(rpcUrl, async (route) => {
        try {
          const response = await fetch(anvilRpc, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: route.request().postData(),
          })
          const body = await response.text()
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body,
          })
        } catch {
          await route.abort()
        }
      })
    }
  }
}

/**
 * Set the sender's balance on each chain's Anvil fork so the test wallet
 * has funds without depending on real testnet state.
 *
 * Non-fatal: start-anvil.mjs already sets the balance at startup. This call
 * is a safety net for race conditions and is skipped silently if Anvil is not
 * yet reachable (webServer may still be initialising).
 */
export async function fundSenderOnAnvil(senderAddress: string): Promise<void> {
  const weiHex = '0x' + (100n * 10n ** 18n).toString(16) // 100 tokens
  for (const chain of EVM_TESTNET_CHAINS) {
    const anvilRpc = `http://127.0.0.1:${chain.anvilPort}`
    try {
      await fetch(anvilRpc, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'anvil_setBalance',
          params: [senderAddress, weiHex],
        }),
      })
    } catch {
      // Anvil not yet reachable — balance was already set by start-anvil.mjs at startup
    }
  }
}

/**
 * Fixture that provides a fully logged-in wallet page.
 *
 * Uses Login (not Create Account) so the app calls navigator.credentials.get(),
 * which returns the virtual credential's userHandle containing our test masterSeed.
 * Create Account would generate a new random seed and ignore our credential.
 */
export const test = base.extend<{ wallet: WalletContext }>({
  wallet: async ({ page }, use) => {
    // Derive expected addresses using project's EvmChainPlugin
    const seedBytes = new Uint8Array(
      Buffer.from(E2E_CONFIG_EVM.masterSeed, 'hex')
    )
    const evmPlugin = chainRegistry.get(ChainFamily.EVM)!
    const evmAccounts = evmPlugin.deriveAccounts(seedBytes, 5)
    const evmAddresses = evmAccounts.map((a) => a.address)

    // Intercept real testnet RPC calls → proxy to local Anvil forks
    await setupAnvilRoutes(page)

    // Ensure the sender has funds on each Anvil fork
    await fundSenderOnAnvil(evmAddresses[0])

    // Navigate to app
    await page.goto(E2E_CONFIG_EVM.baseUrl)

    // Setup virtual authenticator with pre-loaded credential before clicking login
    const auth = await setupVirtualAuthenticator(page)

    // Click "Login" — triggers navigator.credentials.get() which returns our
    // virtual credential's userHandle (masterSeed + username)
    const loginBtn = page.getByTestId(TESTID.LOGIN_BUTTON)
    await loginBtn.waitFor({ state: 'visible', timeout: 15000 })
    await loginBtn.click()

    // Wait for wallet to be fully loaded (balance display appears)
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({
      timeout: 15000,
    })

    await use({ page, auth, evmAddresses })

    // Cleanup
    await teardownVirtualAuthenticator(auth)
  },
})

export { expect }
