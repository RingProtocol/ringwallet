import type { Page } from '@playwright/test'
import {
  ACCOUNT_ASSETS_URL,
  buildAccountAssetsApi2MockBody,
} from '../fixtures/accountAssetsApi2Mock'

/** Mock `account_assets` with the api2.md sample response for the given wallet address. */
export async function setupAccountAssetsApi2Mock(
  page: Page,
  walletAddress: string
): Promise<void> {
  const body = buildAccountAssetsApi2MockBody(walletAddress)
  await page.route(ACCOUNT_ASSETS_URL, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    })
  })
}
