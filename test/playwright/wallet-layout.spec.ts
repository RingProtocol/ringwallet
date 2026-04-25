import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3004'

test.describe('WalletMainPage layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
  })

  test('Wallet tab shows header, scrollable content and bottom tab bar', async ({
    page,
  }) => {
    // Verify top bar is visible
    const topBar = page.locator('.wallet-main-page__top-bar')
    await expect(topBar).toBeVisible()

    // Verify bottom tab bar is visible
    const bottomNav = page.locator('.wallet-bottom-nav')
    await expect(bottomNav).toBeVisible()

    // Verify scroll area exists
    const scrollArea = page.locator('.wallet-main-page__scroll')
    await expect(scrollArea).toBeVisible()

    // Take screenshot for visual regression
    await page.screenshot({
      path: 'test-results/wallet-tab-layout.png',
      fullPage: false,
    })
  })

  test('Activity tab keeps header and bottom tab bar fixed', async ({
    page,
  }) => {
    await page.click('text=Activity')
    await page.waitForTimeout(500)

    // Header should be visible
    const topBar = page.locator('.wallet-main-page__top-bar')
    await expect(topBar).toBeVisible()

    // Bottom tab bar should be visible
    const bottomNav = page.locator('.wallet-bottom-nav')
    await expect(bottomNav).toBeVisible()

    await page.screenshot({
      path: 'test-results/activity-tab-layout.png',
      fullPage: false,
    })
  })

  test('More tab shows header, content and bottom tab bar', async ({
    page,
  }) => {
    await page.click('text=More')
    await page.waitForTimeout(500)

    // Header should be visible
    const topBar = page.locator('.wallet-main-page__top-bar')
    await expect(topBar).toBeVisible()

    // Bottom tab bar should be visible
    const bottomNav = page.locator('.wallet-bottom-nav')
    await expect(bottomNav).toBeVisible()

    // Content should be visible
    const moreContent = page.locator('.wallet-main-page__more-outer')
    await expect(moreContent).toBeVisible()

    await page.screenshot({
      path: 'test-results/more-tab-layout.png',
      fullPage: false,
    })
  })

  test('More tab with expanded wallet list still shows bottom tab bar', async ({
    page,
  }) => {
    await page.click('text=More')
    await page.waitForTimeout(500)

    // Click "Switch wallet" to expand wallet list
    const switchWallet = page.locator('text=Switch wallet')
    await switchWallet.click()
    await page.waitForTimeout(500)

    // Bottom tab bar should still be visible
    const bottomNav = page.locator('.wallet-bottom-nav')
    await expect(bottomNav).toBeVisible()

    await page.screenshot({
      path: 'test-results/more-tab-expanded-layout.png',
      fullPage: false,
    })
  })

  test('Scroll area is scrollable on Wallet tab', async ({ page }) => {
    const scrollArea = page.locator('.wallet-main-page__scroll')
    const before = await scrollArea.evaluate((el) => el.scrollTop)

    // Try scrolling the content area
    await scrollArea.evaluate((el) => {
      el.scrollTop = 100
    })
    const after = await scrollArea.evaluate((el) => el.scrollTop)

    expect(after).toBe(100)
  })
})
