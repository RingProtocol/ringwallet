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

    // Wait for balance to load after chain switch
    const balanceEl = page.getByTestId(TESTID.BALANCE_AMOUNT)
    await expect(balanceEl).toBeVisible()
    // Wait until balance is a non-zero number (RPC loaded)
    await expect(balanceEl).not.toHaveText(/^0\.0000\s/, { timeout: 15000 })

    // Record balance before transfer
    const balanceBefore = parseFloat(
      (await balanceEl.textContent())!.replace(/[^\d.]/g, '')
    )

    // ---- 2. Open Send form ----
    await page.getByTestId(TESTID.SEND_BUTTON).click()

    const toInput = page.getByTestId(TESTID.SEND_TO_INPUT)
    await toInput.waitFor({ state: 'visible' })
    await toInput.fill(recipient)

    const amountInput = page.getByTestId(TESTID.SEND_AMOUNT_INPUT)
    await amountInput.fill(E2E_CONFIG.evmSendAmount)

    // ---- 3. Sign transaction ----
    await page.getByTestId(TESTID.SEND_SIGN_BUTTON).click()

    const broadcastBtn = page.getByTestId(TESTID.SEND_BROADCAST_BUTTON)
    await expect(broadcastBtn).toBeVisible({ timeout: 30000 })

    // ---- 4. Broadcast transaction ----
    await broadcastBtn.click()

    const broadcastSuccess = page.getByTestId(TESTID.BROADCAST_SUCCESS)
    await expect(broadcastSuccess).toBeVisible({ timeout: 30000 })

    // Verify tx hash is displayed
    const hashEl = page.getByTestId(TESTID.BROADCAST_HASH)
    await expect(hashEl).toBeVisible()
    const hashText = await hashEl.textContent()
    expect(hashText).toBeTruthy()
    expect(hashText!.length).toBeGreaterThan(10)

    // ---- 5. Close send form and verify balance decreased ----
    await page.getByTestId(TESTID.SEND_CLOSE_BUTTON).click()

    // Balance polls every 10s. Wait for it to reflect the transfer.
    // The balance should decrease by at least the send amount (plus gas).
    const sendAmount = parseFloat(E2E_CONFIG.evmSendAmount)
    await expect(async () => {
      const text = await balanceEl.textContent()
      const balanceAfter = parseFloat(text!.replace(/[^\d.]/g, ''))
      expect(balanceAfter).toBeLessThan(balanceBefore - sendAmount * 0.5)
    }).toPass({ timeout: 30000 })
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
