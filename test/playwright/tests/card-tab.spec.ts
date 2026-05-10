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
  test('Apply Now on Immersve shows KYC view with blank iframe (no mock-kyc host)', async ({
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
    void sender // fixture requires destructuring even if unused
  })

  /**
   * Regression test for issue #27:
   * After KYC auto-approves → dashboard appears fullscreen →
   * user clicks Back → dashboard must switch to inline (position:static),
   * NOT remain as a fixed full-screen overlay that blocks the tab bar.
   */
  test('dashboard back button collapses to inline, does not overlay tab bar (regression #27)', async ({
    wallet: { page },
  }) => {
    await page.getByTestId(TESTID.TAB_CARD).click()

    // Onboarding list must be visible
    await expect(page.locator('.card-onboarding')).toBeVisible({
      timeout: 10000,
    })

    // Click Apply Now on first available provider
    const applyBtn = page
      .locator('.card-provider-row__apply')
      .first()
    await applyBtn.click()

    // KYC view appears
    await expect(page.locator('.kyc-webview')).toBeVisible({
      timeout: 15000,
    })

    // Memory adapter auto-approves after ~3 s; poll fires at ~3.5 s.
    // Wait for the dashboard to appear (KYC view dismissed automatically).
    await expect(page.locator('.card-dashboard-page')).toBeVisible({
      timeout: 15000,
    })

    // At this point the dashboard is in fullscreen (portal) mode —
    // it should NOT have the --inline modifier yet.
    await expect(page.locator('.card-dashboard-page--inline')).not.toBeVisible()

    // Click Back to collapse to inline mode
    await page.locator('.title-bar__back').click()

    // Dashboard inline element must now be present
    await expect(page.locator('.card-dashboard-page--inline')).toBeVisible({
      timeout: 5000,
    })

    // Bug check: computed position must be 'static', not 'fixed'.
    // Before the fix, --inline inherited position:fixed from .card-dashboard-page.
    const position = await page
      .locator('.card-dashboard-page--inline')
      .evaluate((el) => window.getComputedStyle(el).position)
    expect(position).toBe('static')

    // Interaction check: tab bar must be clickable — a fixed overlay at z-index:500
    // would intercept all pointer events and make the tabs unreachable.
    await page.getByTestId(TESTID.TAB_WALLET).click()
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({
      timeout: 10000,
    })
  })
})
