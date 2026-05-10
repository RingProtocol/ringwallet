import { test, expect } from '@playwright/test'
import { TESTID } from '../../../src/components/testids'
import {
  fundSenderOnAnvil,
  getE2EWalletEvmAddresses,
  setupAnvilRoutes,
} from '../fixtures/wallet.fixture'
import { E2E_CONFIG_EVM } from '../env'
import { setupAccountAssetsApi2Mock } from '../helpers/accountAssetsRoute'
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
} from '../helpers/webauthn'

// npx playwright test test/playwright/tests/account-assets-balance.spec.ts --config test/playwright/playwright.config.ts

test.describe('account_assets mock (api2.md response)', () => {
  test('shows portfolio USD from mocked account_assets and Sepolia token list', async ({
    page,
  }) => {
    const evmAddresses = getE2EWalletEvmAddresses()
    const sender = evmAddresses[0]

    await setupAccountAssetsApi2Mock(page, sender)
    await setupAnvilRoutes(page)
    await fundSenderOnAnvil(sender)

    await page.goto(E2E_CONFIG_EVM.baseUrl)

    const auth = await setupVirtualAuthenticator(page)
    try {
      const loginBtn = page.getByTestId(TESTID.LOGIN_BUTTON)
      await loginBtn.waitFor({ state: 'visible', timeout: 15000 })
      await loginBtn.click()

      await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({
        timeout: 20000,
      })

      await expect(
        page.locator('.balance-usd-row--secondary .balance-usd-value')
      ).toHaveText(/\$[1-9]/, { timeout: 20000 })

      await page.getByTestId(TESTID.CHAIN_SWITCHER_TRIGGER).click()
      await page.getByTestId(TESTID.CHAIN_TAB_TESTNET).click()

      const searchInput = page.getByTestId(TESTID.CHAIN_SEARCH_INPUT)
      await searchInput.fill('Sepolia')

      const chainOption = page
        .getByTestId(TESTID.CHAIN_OPTION)
        .filter({ hasText: 'Sepolia' })
      await chainOption.first().click()

      await expect(page.getByTestId(TESTID.TOKEN_NATIVE_BALANCE)).toBeVisible({
        timeout: 20000,
      })
      await expect(
        page.getByTestId(TESTID.TOKEN_NATIVE_BALANCE)
      ).not.toHaveText(/^0\.0000$/, { timeout: 20000 })

      await expect(page.getByText('ETH_V4', { exact: true })).toBeVisible({
        timeout: 25000,
      })
    } finally {
      await teardownVirtualAuthenticator(auth)
    }
  })
})
