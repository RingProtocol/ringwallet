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

    // Wait for balance to load after chain switch
    const balanceEl = page.getByTestId(TESTID.BALANCE_AMOUNT)
    await expect(balanceEl).toBeVisible()
    await expect(balanceEl).not.toHaveText(/^0\.0000\s/, { timeout: 15000 })

    const balanceBefore = parseFloat(
      (await balanceEl.textContent())!.replace(/[^\d.]/g, '')
    )

    // ---- 2. Open Send form ----
    await page.getByTestId(TESTID.SEND_BUTTON).click()

    const toInput = page.getByTestId(TESTID.SEND_TO_INPUT)
    await toInput.waitFor({ state: 'visible' })
    await toInput.fill(recipient)

    const amountInput = page.getByTestId(TESTID.SEND_AMOUNT_INPUT)
    await amountInput.fill(chain.sendAmount)

    // ---- 3. Sign transaction ----
    await page.getByTestId(TESTID.SEND_SIGN_BUTTON).click()

    const broadcastBtn = page.getByTestId(TESTID.SEND_BROADCAST_BUTTON)
    await expect(broadcastBtn).toBeVisible({ timeout: 30000 })

    // ---- 4. Broadcast transaction ----
    await broadcastBtn.click()

    const broadcastSuccess = page.getByTestId(TESTID.BROADCAST_SUCCESS)
    await expect(broadcastSuccess).toBeVisible({ timeout: 30000 })

    const hashEl = page.getByTestId(TESTID.BROADCAST_HASH)
    await expect(hashEl).toBeVisible()
    const hashText = await hashEl.textContent()
    expect(hashText).toBeTruthy()
    expect(hashText!.length).toBeGreaterThan(10)

    // ---- 5. Close send form; assert outcome via UI balance (not RPC) ----
    // Home balance is polled on an interval (see BALANCE_POLL_INTERVAL_MS), so allow
    // time after broadcast for the next fetch to reflect a confirmed transfer + gas spend.
    await page.getByTestId(TESTID.SEND_CLOSE_BUTTON).click()

    const sendAmount = parseFloat(chain.sendAmount)
    await expect(async () => {
      const text = await balanceEl.textContent()
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
