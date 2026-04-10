import { test as base, expect, type Page } from '@playwright/test'
import { TESTID } from '../../../src/components/testids'
import { ChainFamily } from '../../../src/models/ChainType'
import { chainRegistry } from '../../../src/services/chainplugins/registry'
import '../../../src/services/chainplugins/evm/evmPlugin' // side-effect: registers EvmChainPlugin
import { E2E_CONFIG } from '../env'
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
  type VirtualAuthenticator,
} from '../helpers/webauthn'

export interface WalletContext {
  page: Page
  auth: VirtualAuthenticator
  /** EVM addresses derived from test seed: [sender, recipient, ...] */
  evmAddresses: string[]
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
    const seedBytes = new Uint8Array(Buffer.from(E2E_CONFIG.masterSeed, 'hex'))
    const evmPlugin = chainRegistry.get(ChainFamily.EVM)!
    const evmAccounts = evmPlugin.deriveAccounts(seedBytes, 5)
    const evmAddresses = evmAccounts.map((a) => a.address)

    // Navigate to app
    await page.goto(E2E_CONFIG.baseUrl)

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
