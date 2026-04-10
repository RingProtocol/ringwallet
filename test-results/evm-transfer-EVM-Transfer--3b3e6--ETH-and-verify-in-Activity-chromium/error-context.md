# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evm-transfer.spec.ts >> EVM Transfer (Sepolia) >> send native ETH and verify in Activity
- Location: test/playwright/tests/evm-transfer.spec.ts:6:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('tx-row').first()
Expected: visible
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 60000ms
  - waiting for getByTestId('tx-row').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
    - generic [ref=e4]:
        - generic [ref=e5]:
            - generic [ref=e7] [cursor=pointer]:
                - img "SepoliaETH" [ref=e9]
                - generic [ref=e11]: Sepolia Testnet
                - generic [ref=e12]: ▼
            - button "Menu" [ref=e13] [cursor=pointer]
        - generic [ref=e17]:
            - generic [ref=e18]:
                - heading "Account" [level=3] [ref=e19]
                - button "✕" [ref=e20] [cursor=pointer]
            - generic [ref=e21]:
                - generic [ref=e22]: 🔐
                - generic [ref=e23]:
                    - generic [ref=e24]: 'Wallet #1'
                    - generic [ref=e25]:
                        - generic [ref=e26]: 0x9fe8...e620
                        - button "📋Copy" [ref=e27] [cursor=pointer]
            - generic [ref=e28]:
                - generic [ref=e29] [cursor=pointer]:
                    - generic [ref=e30]: 🔄
                    - generic [ref=e31]: Switch wallet
                    - generic [ref=e32]: ›
                - generic [ref=e33] [cursor=pointer]:
                    - generic [ref=e34]: 🔔
                    - generic [ref=e35]: NotificationsBlocked
                - generic [ref=e36] [cursor=pointer]:
                    - generic [ref=e37]: 🌐
                    - generic [ref=e38]: LanguageEnglish
                - generic [ref=e39] [cursor=pointer]:
                    - generic [ref=e40]: 💬
                    - generic [ref=e41]: Feedback
                - generic [ref=e42] [cursor=pointer]:
                    - generic [ref=e43]: ℹ️
                    - generic [ref=e44]: About
                - generic [ref=e45] [cursor=pointer]:
                    - generic [ref=e46]: ↩️
                    - generic [ref=e47]: Log out
        - generic [ref=e48]:
            - generic [ref=e49]:
                - generic [ref=e50]:
                    - text: '0.0498'
                    - generic [ref=e51]:
                        - img "SepoliaETH" [ref=e52]
                        - text: SepoliaETH
                - generic [ref=e53]: 0x9fe8...e620
            - generic [ref=e55]:
                - button "📤 Send" [ref=e56] [cursor=pointer]
                - button "📥 Receive" [ref=e57] [cursor=pointer]
            - generic [ref=e58]:
                - generic [ref=e59]:
                    - button "Assets" [ref=e60] [cursor=pointer]
                    - button "Activity" [active] [ref=e61] [cursor=pointer]
                    - button "DApps" [ref=e62] [cursor=pointer]
                - generic [ref=e65]:
                    - generic [ref=e66]: 📭
                    - generic [ref=e67]: No transactions yet
        - contentinfo [ref=e68]: version:1.0.88
    - button "Open Next.js Dev Tools" [ref=e74] [cursor=pointer]:
        - img [ref=e75]
    - alert [ref=e78]
```

# Test source

```ts
  1   | import { test, expect } from '../fixtures/wallet.fixture'
  2   | import { TESTID } from '../../../src/components/testids'
  3   | import { E2E_CONFIG } from '../env'
  4   |
  5   | test.describe('EVM Transfer (Sepolia)', () => {
  6   |   test('send native ETH and verify in Activity', async ({ wallet }) => {
  7   |     const { page, evmAddresses } = wallet
  8   |     const recipient = evmAddresses[1] // account 0 → account 1
  9   |
  10  |     // ---- 1. Switch to Sepolia testnet ----
  11  |     await page.getByTestId(TESTID.CHAIN_SWITCHER_TRIGGER).click()
  12  |     await page.getByTestId(TESTID.CHAIN_TAB_TESTNET).click()
  13  |
  14  |     // Search for Sepolia and select it
  15  |     const searchInput = page.getByTestId(TESTID.CHAIN_SEARCH_INPUT)
  16  |     await searchInput.fill('Sepolia')
  17  |
  18  |     const sepoliaOption = page
  19  |       .getByTestId(TESTID.CHAIN_OPTION)
  20  |       .filter({ hasText: 'Sepolia' })
  21  |     await sepoliaOption.first().click()
  22  |
  23  |     // Wait for balance to refresh after chain switch
  24  |     await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible()
  25  |     // Brief wait for RPC balance to load
  26  |     await page.waitForTimeout(2000)
  27  |
  28  |     // ---- 2. Open Send form ----
  29  |     await page.getByTestId(TESTID.SEND_BUTTON).click()
  30  |
  31  |     // Fill recipient address
  32  |     const toInput = page.getByTestId(TESTID.SEND_TO_INPUT)
  33  |     await toInput.waitFor({ state: 'visible' })
  34  |     await toInput.fill(recipient)
  35  |
  36  |     // Fill amount
  37  |     const amountInput = page.getByTestId(TESTID.SEND_AMOUNT_INPUT)
  38  |     await amountInput.fill(E2E_CONFIG.evmSendAmount)
  39  |
  40  |     // ---- 3. Sign transaction ----
  41  |     const signBtn = page.getByTestId(TESTID.SEND_SIGN_BUTTON)
  42  |     await signBtn.click()
  43  |
  44  |     // Wait for signing to complete — the broadcast button should appear
  45  |     const broadcastBtn = page.getByTestId(TESTID.SEND_BROADCAST_BUTTON)
  46  |     await expect(broadcastBtn).toBeVisible({ timeout: 30000 })
  47  |
  48  |     // ---- 4. Broadcast transaction ----
  49  |     await broadcastBtn.click()
  50  |
  51  |     // Wait for broadcast success
  52  |     const broadcastSuccess = page.getByTestId(TESTID.BROADCAST_SUCCESS)
  53  |     await expect(broadcastSuccess).toBeVisible({ timeout: 30000 })
  54  |
  55  |     // Verify tx hash is displayed
  56  |     const hashEl = page.getByTestId(TESTID.BROADCAST_HASH)
  57  |     await expect(hashEl).toBeVisible()
  58  |     const hashText = await hashEl.textContent()
  59  |     expect(hashText).toBeTruthy()
  60  |     expect(hashText!.length).toBeGreaterThan(10)
  61  |
  62  |     // ---- 5. Close send form and check Activity ----
  63  |     await page.getByTestId(TESTID.SEND_CLOSE_BUTTON).click()
  64  |
  65  |     // Switch to Activity tab.
  66  |     // Note: TransactionHistory only mounts when Activity tab is active,
  67  |     // and emitPendingTransaction only dispatches a window event (no cache write).
  68  |     // So the pending tx event was lost while we were on Assets tab.
  69  |     // We rely on the History API polling (every 15s) to pick up the tx.
  70  |     await page.getByTestId(TESTID.TAB_ACTIVITY).click()
  71  |
  72  |     // Wait for initial "Loading..." to finish
  73  |     await expect(page.getByTestId(TESTID.TX_LOADING)).toBeHidden({
  74  |       timeout: 15000,
  75  |     })
  76  |
  77  |     // Wait for tx row — Etherscan needs time to index the new tx,
  78  |     // and the history API polls every 15s. Allow up to 60s.
  79  |     const txRow = page.getByTestId(TESTID.TX_ROW).first()
> 80  |     await expect(txRow).toBeVisible({ timeout: 60000 })
      |                         ^ Error: expect(locator).toBeVisible() failed
  81  |
  82  |     // Verify the tx row shows the recipient address (shortened)
  83  |     const recipientShort = `${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`
  84  |     await expect(txRow).toContainText(recipientShort)
  85  |   })
  86  |
  87  |   test('login and see wallet address', async ({ wallet }) => {
  88  |     const { page, evmAddresses } = wallet
  89  |
  90  |     // Verify the wallet address is displayed (shortened format)
  91  |     const addrEl = page.getByTestId(TESTID.WALLET_ADDRESS)
  92  |     await expect(addrEl).toBeVisible()
  93  |     const displayed = await addrEl.textContent()
  94  |
  95  |     // The default chain after login may be Ethereum mainnet (account 0)
  96  |     const expectedShort = `${evmAddresses[0].slice(0, 6)}...${evmAddresses[0].slice(-4)}`
  97  |     expect(displayed).toBe(expectedShort)
  98  |   })
  99  | })
  100 |
```
