import { test, expect } from '../fixtures/wallet.fixture'
import { TESTID } from '../../../src/components/testids'
import { E2E_CONFIG } from '../env'

test.describe('EVM Transfer (Sepolia)', () => {
  test('send native ETH and verify in Activity', async ({ wallet }) => {
    const { page, evmAddresses } = wallet
    const recipient = evmAddresses[1] // account 0 → account 1

    // ---- 1. Switch to Sepolia testnet ----
    await page.getByTestId(TESTID.CHAIN_SWITCHER_TRIGGER).click()
    await page.getByTestId(TESTID.CHAIN_TAB_TESTNET).click()

    // Search for Sepolia and select it
    const searchInput = page.getByTestId(TESTID.CHAIN_SEARCH_INPUT)
    await searchInput.fill('Sepolia')

    const sepoliaOption = page
      .getByTestId(TESTID.CHAIN_OPTION)
      .filter({ hasText: 'Sepolia' })
    await sepoliaOption.first().click()

    // Wait for balance to refresh after chain switch
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible()
    // Brief wait for RPC balance to load
    await page.waitForTimeout(2000)

    // ---- 2. Open Send form ----
    await page.getByTestId(TESTID.SEND_BUTTON).click()

    // Fill recipient address
    const toInput = page.getByTestId(TESTID.SEND_TO_INPUT)
    await toInput.waitFor({ state: 'visible' })
    await toInput.fill(recipient)

    // Fill amount
    const amountInput = page.getByTestId(TESTID.SEND_AMOUNT_INPUT)
    await amountInput.fill(E2E_CONFIG.evmSendAmount)

    // ---- 3. Sign transaction ----
    const signBtn = page.getByTestId(TESTID.SEND_SIGN_BUTTON)
    await signBtn.click()

    // Wait for signing to complete — the broadcast button should appear
    const broadcastBtn = page.getByTestId(TESTID.SEND_BROADCAST_BUTTON)
    await expect(broadcastBtn).toBeVisible({ timeout: 30000 })

    // ---- 4. Broadcast transaction ----
    await broadcastBtn.click()

    // Wait for broadcast success
    const broadcastSuccess = page.getByTestId(TESTID.BROADCAST_SUCCESS)
    await expect(broadcastSuccess).toBeVisible({ timeout: 30000 })

    // Verify tx hash is displayed
    const hashEl = page.getByTestId(TESTID.BROADCAST_HASH)
    await expect(hashEl).toBeVisible()
    const hashText = await hashEl.textContent()
    expect(hashText).toBeTruthy()
    expect(hashText!.length).toBeGreaterThan(10)

    // ---- 5. Close send form and check Activity ----
    await page.getByTestId(TESTID.SEND_CLOSE_BUTTON).click()

    // Switch to Activity tab.
    // Note: TransactionHistory only mounts when Activity tab is active,
    // and emitPendingTransaction only dispatches a window event (no cache write).
    // So the pending tx event was lost while we were on Assets tab.
    // We rely on the History API polling (every 15s) to pick up the tx.
    await page.getByTestId(TESTID.TAB_ACTIVITY).click()

    // Wait for initial "Loading..." to finish
    await expect(page.getByTestId(TESTID.TX_LOADING)).toBeHidden({
      timeout: 15000,
    })

    // Wait for tx row — Etherscan needs time to index the new tx,
    // and the history API polls every 15s. Allow up to 60s.
    const txRow = page.getByTestId(TESTID.TX_ROW).first()
    await expect(txRow).toBeVisible({ timeout: 60000 })

    // Verify the tx row shows the recipient address (shortened)
    const recipientShort = `${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`
    await expect(txRow).toContainText(recipientShort)
  })

  test('login and see wallet address', async ({ wallet }) => {
    const { page, evmAddresses } = wallet

    // Verify the wallet address is displayed (shortened format)
    const addrEl = page.getByTestId(TESTID.WALLET_ADDRESS)
    await expect(addrEl).toBeVisible()
    const displayed = await addrEl.textContent()

    // The default chain after login may be Ethereum mainnet (account 0)
    const expectedShort = `${evmAddresses[0].slice(0, 6)}...${evmAddresses[0].slice(-4)}`
    expect(displayed).toBe(expectedShort)
  })
})
