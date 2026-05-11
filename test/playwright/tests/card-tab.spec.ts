import { test, expect } from '../fixtures/wallet.fixture'
import { TESTID } from '../../../src/components/testids'

/**
 * Card tab: onboarding → KYC shell → dashboard fullscreen/inline.
 * Run: yarn test:e2e -- test/playwright/tests/card-tab.spec.ts
 *
 * Note: tests use the memory-backed adapter (sandbox). KYC auto-approves after
 * ~3 s and the first status poll fires at ~3.5 s, so dashboard tests wait up to
 * 15 s for the flow to complete.
 */
test.describe('Card tab', () => {
  /**
   * When the memory adapter returns about:blank as the KYC URL, the apply page
   * should show a placeholder (not a blank iframe) and must NOT attempt to load
   * any third-party KYC host. Triggered via the "My Card" button for a
   * provider the user has not yet applied to.
   */
  test('My Card on Immersve (no account) opens apply page placeholder (no real KYC host loaded)', async ({
    wallet: { page, evmAddresses: [sender] },
  }) => {
    let mockKycRequested = false
    await page.route(/mock-kyc\.example\.com/, (route) => {
      mockKycRequested = true
      return route.abort()
    })

    await page.getByTestId(TESTID.TAB_CARD).click()

    await expect(page.locator('.card-onboarding')).toBeVisible({
      timeout: 10000,
    })

    const myCardBtn = page
      .locator('.card-provider-row')
      .filter({ hasText: 'Immersve' })
      .locator('.card-provider-row__details')
    await myCardBtn.click()

    await expect(page.locator('.card-apply-page')).toBeVisible({
      timeout: 15000,
    })

    // about:blank → placeholder shown instead of iframe
    await expect(
      page.locator('.card-apply-page__placeholder'),
    ).toBeVisible({ timeout: 10000 })
    // No real KYC host should have been requested
    expect(mockKycRequested).toBe(false)
    void sender // fixture requires destructuring even if unused
  })

  /**
   * Regression test for issue #27:
   * After dashboard fullscreen → user clicks Back → the dashboard portal
   * must be fully unmounted and the tab bar must remain reachable. Before
   * the fix the dashboard's `position:fixed` overlay (z-index 500) was left
   * mounted, intercepting all pointer events.
   */
  test('dashboard back button unmounts the portal and tab bar stays clickable (regression #27)', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()

    // Onboarding list must be visible
    await expect(page.locator('.card-onboarding')).toBeVisible({
      timeout: 10000,
    })

    // Click "My Card" on first available provider — falls back to apply flow
    // because no card exists yet.
    const myCardBtn = page
      .locator('.card-provider-row__details')
      .first()
    await myCardBtn.click()

    // Apply page (fullscreen) appears
    await expect(page.locator('.card-apply-page')).toBeVisible({
      timeout: 15000,
    })

    // Memory adapter auto-approves after ~3 s; poll fires at ~3.5 s.
    // CardApp navigates directly from apply page to the dashboard portal —
    // no intermediate onboarding flash.
    await expect(page.locator('.card-dashboard-page')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('.card-apply-page')).not.toBeVisible()

    // Back unmounts the dashboard portal entirely
    await page.locator('.card-dashboard-page .title-bar__back').click()
    await expect(page.locator('.card-dashboard-page')).not.toBeVisible({
      timeout: 5000,
    })

    // Interaction check: tab bar must be clickable — a fixed overlay at z-index:500
    // would intercept all pointer events and make the tabs unreachable.
    await page.getByTestId(TESTID.TAB_WALLET).click()
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({
      timeout: 10000,
    })
  })
})
