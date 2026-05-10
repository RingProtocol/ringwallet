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

/**
 * Card tab: onboarding → Immersve Apply → KYC shell (iframe uses about:blank until real hosted URL).
 * Run: yarn test:e2e -- test/playwright/tests/card-tab.spec.ts
 */
test.describe('Card tab', () => {
  test('opens Card tab, Apply Now on Immersve shows KYC view with blank iframe (no mock-kyc host)', async ({
    page,
  }) => {
    const evmAddresses = getE2EWalletEvmAddresses()
    const sender = evmAddresses[0]

    await setupAccountAssetsApi2Mock(page, sender)
    await setupAnvilRoutes(page)
    await fundSenderOnAnvil(sender)

    let mockKycRequested = false
    await page.route(/mock-kyc\.example\.com/, (route) => {
      mockKycRequested = true
      return route.abort()
    })

    await page.goto(E2E_CONFIG_EVM.baseUrl)

    const auth = await setupVirtualAuthenticator(page)
    try {
      const loginBtn = page.getByTestId(TESTID.LOGIN_BUTTON)
      await loginBtn.waitFor({ state: 'visible', timeout: 15000 })
      await loginBtn.click()

      await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({
        timeout: 20000,
      })

      await page.getByTestId(TESTID.TAB_CARD).click()

      await expect(page.locator('.card-onboarding')).toBeVisible({
        timeout: 10000,
      })

      const applyBtn = page
        .locator('.card-provider-row')
        .filter({ hasText: 'Immersve' })
        .getByRole('button', { name: /Apply Now|立即申请/i })
      await applyBtn.click()

      await expect(page.locator('.kyc-webview')).toBeVisible({
        timeout: 15000,
      })

      const iframe = page.locator('.kyc-webview__iframe')
      await expect(iframe).toHaveAttribute('src', 'about:blank', {
        timeout: 10000,
      })
      expect(mockKycRequested).toBe(false)
    } finally {
      await teardownVirtualAuthenticator(auth)
    }
  })
})
