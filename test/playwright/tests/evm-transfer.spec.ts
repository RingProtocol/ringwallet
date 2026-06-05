import { test, expect } from '../fixtures/wallet.fixture'
import { TESTID } from '../../../src/components/testids'
import { EVM_TESTNET_CHAINS, type EvmTestnetChainConfig } from '../env'

function evmTransferTests(chain: EvmTestnetChainConfig) {
  test(`send native token and verify balance`, async ({ wallet }) => {
    const { page, evmAddresses } = wallet
    const recipient = evmAddresses[1] // account 0 → account 1

    // ---- 1. Switch to testnet chain ----
    await page.getByTestId(TESTID.CHAIN_SWITCHER_TRIGGER).click()
    await page.getByTestId(TESTID.CHAIN_TAB_TESTNET).click()

    const searchInput = page.getByTestId(TESTID.CHAIN_SEARCH_INPUT)
    await searchInput.fill(chain.chainName)

    const chainOption = page
      .getByTestId(TESTID.CHAIN_OPTION)
      .filter({ hasText: chain.chainName })
    await chainOption.first().click()

    // Hero shows USD; native quantity for assertions is on the token list.
    await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible()
    const nativeBalEl = page.getByTestId(TESTID.TOKEN_NATIVE_BALANCE)
    await expect(nativeBalEl).toBeVisible({ timeout: 15000 })
    await expect(nativeBalEl).not.toHaveText(/^0\.0000\s/, { timeout: 15000 })

    const balanceBefore = parseFloat(
      (await nativeBalEl.textContent())!.replace(/[^\d.]/g, '')
    )

    // ---- 2. Open Send form ----
    await page.getByTestId(TESTID.SEND_BUTTON).click()

    const toInput = page.getByTestId(TESTID.SEND_TO_INPUT)
    await toInput.waitFor({ state: 'visible' })
    await toInput.fill(recipient)

    const amountInput = page.getByTestId(TESTID.SEND_AMOUNT_INPUT)
    await amountInput.fill(chain.sendAmount)

    // ---- 3. Click Continue → Confirm Send dialog ----
    await page.getByTestId(TESTID.SEND_SIGN_BUTTON).click()

    // Confirm dialog should be visible
    const confirmBtn = page.getByTestId(TESTID.SEND_CONFIRM_BUTTON)
    await expect(confirmBtn).toBeVisible({ timeout: 10000 })

    // ---- 4. Click Confirm → passkey signing → signed result ----
    await confirmBtn.click()

    // After signing, SignedTxResult should appear and the form should be hidden
    const signedResult = page.getByTestId(TESTID.SIGNED_TX_RESULT)
    await expect(signedResult).toBeVisible({ timeout: 30000 })

    // Regression: Continue button must NOT be visible after signing
    const continueBtn = page.getByTestId(TESTID.SEND_SIGN_BUTTON)
    await expect(continueBtn).not.toBeVisible()

    // ---- 5. Broadcast transaction ----
    const broadcastBtn = page.getByTestId(TESTID.SEND_BROADCAST_BUTTON)
    await expect(broadcastBtn).toBeVisible()
    await broadcastBtn.click()

    const broadcastSuccess = page.getByTestId(TESTID.BROADCAST_SUCCESS)
    await expect(broadcastSuccess).toBeVisible({ timeout: 30000 })

    const hashEl = page.getByTestId(TESTID.BROADCAST_HASH)
    await expect(hashEl).toBeVisible()
    const hashText = await hashEl.textContent()
    expect(hashText).toBeTruthy()
    expect(hashText!.length).toBeGreaterThan(10)

    // ---- 6. Close send form; assert outcome via UI balance (not RPC) ----
    // Home balance is polled on an interval (see BALANCE_POLL_INTERVAL_MS), so allow
    // time after broadcast for the next fetch to reflect a confirmed transfer + gas spend.
    await page.getByTestId(TESTID.SEND_CLOSE_BUTTON).click()

    const sendAmount = parseFloat(chain.sendAmount)
    await expect(async () => {
      const text = await nativeBalEl.textContent()
      const balanceAfter = parseFloat(text!.replace(/[^\d.]/g, ''))
      expect(balanceAfter).toBeLessThan(balanceBefore - sendAmount * 0.5)
    }).toPass({ timeout: 60_000 })
  })
}

// Generate a test suite per EVM testnet chain
for (const chain of EVM_TESTNET_CHAINS) {
  test.describe(`EVM Transfer (${chain.chainName})`, () => {
    evmTransferTests(chain)
  })
}

test.describe('EVM Wallet', () => {
  test('login and see wallet address', async ({ wallet }) => {
    const { page, evmAddresses } = wallet

    const addrEl = page.getByTestId(TESTID.WALLET_ADDRESS)
    await expect(addrEl).toBeVisible()
    const displayed = await addrEl.textContent()

    const expectedShort = `${evmAddresses[0].slice(0, 6)}...${evmAddresses[0].slice(-4)}`
    expect(displayed).toBe(expectedShort)
  })
})
