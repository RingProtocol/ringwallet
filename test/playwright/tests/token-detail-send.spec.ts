import { test, expect } from '../fixtures/wallet.fixture'
import { TESTID } from '../../../src/components/testids'
import { EVM_TESTNET_CHAINS, type EvmTestnetChainConfig } from '../env'

/**
 * Tests the Send flow triggered from the Token Detail page.
 *
 * Flow:
 *  1. Switch to testnet chain
 *  2. Click native token row → Token Detail page
 *  3. Click "Send" on detail page
 *  4. Fill recipient + amount → Continue
 *  5. Confirm Send → passkey auto-signs
 *  6. Verify SignedTxResult is shown
 *  7. Verify Continue button is hidden after signing (regression for form-hide bug)
 */
function tokenDetailSendTests(chain: EvmTestnetChainConfig) {
  test(`send from token detail page`, async ({ wallet }) => {
    const { page, evmAddresses } = wallet
    const recipient = evmAddresses[1]

    // ---- 1. Switch to testnet chain ----
    await page.getByTestId(TESTID.CHAIN_SWITCHER_TRIGGER).click()
    await page.getByTestId(TESTID.CHAIN_TAB_TESTNET).click()

    const searchInput = page.getByTestId(TESTID.CHAIN_SEARCH_INPUT)
    await searchInput.fill(chain.chainName)

    const chainOption = page
      .getByTestId(TESTID.CHAIN_OPTION)
      .filter({ hasText: chain.chainName })
    await chainOption.first().click()

    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible()
    const nativeBalEl = page.getByTestId(TESTID.TOKEN_NATIVE_BALANCE)
    await expect(nativeBalEl).toBeVisible({ timeout: 15000 })

    // ---- 2. Click native token → Token Detail page ----
    // The token row is the clickable parent of TOKEN_NATIVE_BALANCE
    const tokenRow = nativeBalEl.locator(
      'xpath=ancestor::div[contains(@class,"token-row")]'
    )
    await tokenRow.click()

    // Token detail page should show the Send action button
    const detailSendBtn = page.getByTestId(TESTID.TOKEN_DETAIL_SEND)
    await expect(detailSendBtn).toBeVisible({ timeout: 10000 })

    // ---- 3. Click Send on token detail ----
    await detailSendBtn.click()

    // ---- 4. Fill recipient + amount → Continue ----
    const toInput = page.getByTestId(TESTID.SEND_TO_INPUT)
    await toInput.waitFor({ state: 'visible' })
    await toInput.fill(recipient)

    const amountInput = page.getByTestId(TESTID.SEND_AMOUNT_INPUT)
    await amountInput.fill(chain.sendAmount)

    await page.getByTestId(TESTID.SEND_SIGN_BUTTON).click()

    // ---- 5. Confirm Send → passkey auto-signs ----
    const confirmBtn = page.getByTestId(TESTID.SEND_CONFIRM_BUTTON)
    await expect(confirmBtn).toBeVisible({ timeout: 10000 })
    await confirmBtn.click()

    // ---- 6. Verify signed result appears ----
    const signedResult = page.getByTestId(TESTID.SIGNED_TX_RESULT)
    await expect(signedResult).toBeVisible({ timeout: 30000 })

    // ---- 7. Regression: Continue button must NOT be visible after signing ----
    const continueBtn = page.getByTestId(TESTID.SEND_SIGN_BUTTON)
    await expect(continueBtn).not.toBeVisible()
  })
}

for (const chain of EVM_TESTNET_CHAINS) {
  test.describe(`Token Detail Send (${chain.chainName})`, () => {
    tokenDetailSendTests(chain)
  })
}
