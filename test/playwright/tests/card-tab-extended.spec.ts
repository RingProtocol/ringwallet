import { test, expect } from '../fixtures/wallet.fixture'
import { TESTID } from '../../../src/components/testids'

/**
 * Extended Card-tab E2E coverage (issue #32):
 * KYC dismiss, tab-switch during KYC, second Apply after dismiss.
 *
 * Run: yarn test:e2e -- test/playwright/tests/card-tab-extended.spec.ts
 */
test.describe('Card tab — extended flows', () => {
  /**
   * User opens KYC view then closes it with the × button.
   * Onboarding list must reappear (not the dashboard or a blank screen).
   */
  test('KYC dismiss (×) returns to onboarding', async ({ wallet: { page } }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    await page.locator('.card-provider-row__apply').first().click()
    await expect(page.locator('.kyc-webview')).toBeVisible({ timeout: 15000 })

    // Close the KYC view
    await page.locator('.kyc-webview__close').click()

    // Onboarding must be visible again — no card was created
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.kyc-webview')).not.toBeVisible()
    await expect(page.locator('.card-dashboard-page')).not.toBeVisible()
  })

  /**
   * User switches to the Wallet tab while KYC is open, then returns to the Card tab.
   * The onboarding list should be shown (KYC state cleared) — the Card tab must not
   * remain stuck in the KYC view after a tab switch.
   */
  test('switching tabs during KYC and returning shows onboarding', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    await page.locator('.card-provider-row__apply').first().click()
    await expect(page.locator('.kyc-webview')).toBeVisible({ timeout: 15000 })

    // Switch to Wallet tab
    await page.getByTestId(TESTID.TAB_WALLET).click()
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({ timeout: 10000 })

    // Switch back to Card tab
    await page.getByTestId(TESTID.TAB_CARD).click()

    // KYC view should no longer overlay; card was not created so onboarding shows
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })
  })

  /**
   * After dismissing KYC the user clicks Apply Now a second time.
   * A fresh KYC session must start and the KYC view must appear again.
   */
  test('second Apply after KYC dismiss starts a fresh session', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    // First Apply
    await page.locator('.card-provider-row__apply').first().click()
    await expect(page.locator('.kyc-webview')).toBeVisible({ timeout: 15000 })

    // Dismiss
    await page.locator('.kyc-webview__close').click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 5000 })

    // Second Apply — should open KYC again
    await page.locator('.card-provider-row__apply').first().click()
    await expect(page.locator('.kyc-webview')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.kyc-webview__placeholder')).toBeVisible({ timeout: 5000 })
  })

  /**
   * KYC auto-approves → dashboard fullscreen → Back → inline.
   * Switching to Wallet tab and back to Card: the dashboard must reappear
   * (card still exists in the memory adapter), not the onboarding screen.
   * Note: the fullscreen dashboard intercepts tab-bar clicks, so Back must be
   * clicked first to collapse to inline before switching tabs.
   */
  test('tab switch after Back returns to dashboard (not onboarding)', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    await page.locator('.card-provider-row__apply').first().click()
    await expect(page.locator('.kyc-webview')).toBeVisible({ timeout: 15000 })

    // Wait for KYC auto-approval and fullscreen dashboard
    await expect(page.locator('.card-dashboard-page')).toBeVisible({ timeout: 15000 })

    // Collapse to inline so the tab bar is accessible
    await page.locator('.title-bar__back').click()
    await expect(page.locator('.card-dashboard-page--inline')).toBeVisible({ timeout: 5000 })

    // Switch to Wallet tab and back
    await page.getByTestId(TESTID.TAB_WALLET).click()
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({ timeout: 10000 })
    await page.getByTestId(TESTID.TAB_CARD).click()

    // Dashboard must appear (card still exists) — not the onboarding screen
    await expect(page.locator('.card-dashboard-page')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.card-onboarding')).not.toBeVisible()
  })
})
