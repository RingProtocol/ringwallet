import { test, expect } from '../fixtures/wallet.fixture'
import { TESTID } from '../../../src/components/testids'

/**
 * Extended Card-tab E2E coverage (issue #32):
 * Apply-page dismiss, tab-switch during apply, second apply after dismiss.
 *
 * Run: yarn test:e2e -- test/playwright/tests/card-tab-extended.spec.ts
 *
 * Note: the apply flow is triggered via the per-row "My Card" button when no
 * card exists for the provider yet. The button now branches between the
 * apply page and the card detail dashboard based on account presence.
 */
test.describe('Card tab — extended flows', () => {
  /**
   * User opens the apply page then closes it with the TitleBar back button.
   * Onboarding list must reappear (not the dashboard or a blank screen).
   */
  test('apply page back (←) returns to onboarding', async ({ wallet: { page } }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    await page.locator('.card-provider-row__details').first().click()
    await expect(page.locator('.card-apply-page')).toBeVisible({ timeout: 15000 })

    // Close the apply page via the standard TitleBar back button
    await page.locator('.card-apply-page .title-bar__back').click()

    // Onboarding must be visible again — no card was created
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.card-apply-page')).not.toBeVisible()
    await expect(page.locator('.card-dashboard-page')).not.toBeVisible()
  })

  /**
   * User switches to the Wallet tab while the apply page is open, then
   * returns to the Card tab. The onboarding list should be shown (apply
   * state cleared) — the Card tab must not remain stuck in the apply view
   * after a tab switch.
   */
  test('switching tabs during apply and returning shows onboarding', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    await page.locator('.card-provider-row__details').first().click()
    await expect(page.locator('.card-apply-page')).toBeVisible({ timeout: 15000 })

    // Switch to Wallet tab
    await page.getByTestId(TESTID.TAB_WALLET).click()
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({ timeout: 10000 })

    // Switch back to Card tab
    await page.getByTestId(TESTID.TAB_CARD).click()

    // Apply page should no longer overlay; card was not created so onboarding shows
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })
  })

  /**
   * After dismissing the apply page the user clicks "My Card" a second time.
   * A fresh apply session must start and the apply page must appear again.
   */
  test('second apply after dismiss starts a fresh session', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    // First apply
    await page.locator('.card-provider-row__details').first().click()
    await expect(page.locator('.card-apply-page')).toBeVisible({ timeout: 15000 })

    // Dismiss via TitleBar back
    await page.locator('.card-apply-page .title-bar__back').click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 5000 })

    // Second apply — should open the apply page again
    await page.locator('.card-provider-row__details').first().click()
    await expect(page.locator('.card-apply-page')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.card-apply-page__placeholder')).toBeVisible({ timeout: 5000 })
  })

  /**
   * Apply auto-approves → CardApp navigates DIRECTLY to the dashboard
   * (no detour back to onboarding). After going back, clicking "My Card"
   * again must route straight to the dashboard via the "existing card"
   * fast-path (no new KYC).
   */
  test('first-time apply lands directly on dashboard; subsequent My Card stays on dashboard', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 10000 })

    await page.locator('.card-provider-row__details').first().click()
    await expect(page.locator('.card-apply-page')).toBeVisible({ timeout: 15000 })

    // Memory adapter auto-approves after ~3 s; first poll fires at ~3.5 s.
    // The apply page should be replaced directly by the dashboard portal —
    // no flash of onboarding in between.
    await expect(page.locator('.card-dashboard-page')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('.card-apply-page')).not.toBeVisible()

    // Back to onboarding
    await page.locator('.card-dashboard-page .title-bar__back').click()
    await expect(page.locator('.card-onboarding')).toBeVisible({ timeout: 5000 })

    // Clicking "My Card" again must use the "existing card" fast-path —
    // i.e. land back on the dashboard without showing the apply page.
    await page.locator('.card-provider-row__details').first().click()
    await expect(page.locator('.card-dashboard-page')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.card-apply-page')).not.toBeVisible()
  })
})
