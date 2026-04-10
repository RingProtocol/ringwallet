# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evm-transfer.spec.ts >> EVM Transfer (Sepolia) >> login and see wallet address
- Location: test/playwright/tests/evm-transfer.spec.ts:87:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('balance-amount')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTestId('balance-amount')

```

# Page snapshot

```yaml
- generic [ref=e1]:
    - generic [ref=e3]:
        - generic [ref=e4]:
            - generic [ref=e5]:
                - heading "Account" [level=3] [ref=e6]
                - button "✕" [ref=e7] [cursor=pointer]
            - generic [ref=e8]:
                - generic [ref=e9] [cursor=pointer]:
                    - generic [ref=e10]: 🔄
                    - generic [ref=e11]: Switch wallet
                    - generic [ref=e12]: ›
                - generic [ref=e13] [cursor=pointer]:
                    - generic [ref=e14]: 🔔
                    - generic [ref=e15]: NotificationsBlocked
                - generic [ref=e16] [cursor=pointer]:
                    - generic [ref=e17]: 🌐
                    - generic [ref=e18]: LanguageEnglish
                - generic [ref=e19] [cursor=pointer]:
                    - generic [ref=e20]: 💬
                    - generic [ref=e21]: Feedback
                - generic [ref=e22] [cursor=pointer]:
                    - generic [ref=e23]: ℹ️
                    - generic [ref=e24]: About
                - generic [ref=e25] [cursor=pointer]:
                    - generic [ref=e26]: ↩️
                    - generic [ref=e27]: Log out
        - generic [ref=e28]:
            - img [ref=e31]
            - generic [ref=e33]:
                - button "Log in" [active] [ref=e34] [cursor=pointer]
                - button "Create account" [ref=e35] [cursor=pointer]
                - paragraph [ref=e36]: 'Tip: If you haven’t created a passkey before, tap “Create account”.'
            - region "Product introduction" [ref=e37]:
                - paragraph [ref=e38]: Sign in with your fingerprint, keep your keys, no platform fees. We believe ownership should feel natural, safe, and open.
                - generic [ref=e39]:
                    - generic [ref=e40]:
                        - term [ref=e41]: No password, no mnemonic
                        - definition [ref=e42]: Log in with your fingerprint. No seed phrases to write down or lose.
                    - generic [ref=e43]:
                        - term [ref=e44]: Self-custody
                        - definition [ref=e45]: Your keys, your assets. We don’t hold them for you.
                    - generic [ref=e46]:
                        - term [ref=e47]: No platform fee
                        - definition [ref=e48]: We don’t add platform fees on top of network costs.
                    - generic [ref=e49]:
                        - term [ref=e50]: AI Agent friendly
                        - definition [ref=e51]: Built so agents and automation can interact with your wallet in a secure, programmable way.
                    - generic [ref=e52]:
                        - term [ref=e53]: Developer friendly
                        - definition [ref=e54]: Built-in dev tools and 1000+ chains. Get Test Token easy
                    - generic [ref=e55]:
                        - term [ref=e56]: Listener to your voice
                        - definition [ref=e57]: Designed to respond to how you want to use crypto—simple when you want simple, powerful when you need it.
                - paragraph [ref=e58]:
                    - text: Ring Wallet is
                    - strong [ref=e59]:
                        - link "open source" [ref=e60] [cursor=pointer]:
                            - /url: https://github.com/ringprotocol/ringwallet#readme
                    - text: . We want to build in the open and with the community. Long-term support by Ring.
                - paragraph [ref=e61]: Own your keys. Own your future.
        - contentinfo [ref=e62]: version:1.0.88
    - button "Open Next.js Dev Tools" [ref=e68] [cursor=pointer]:
        - img [ref=e69]
    - alert [ref=e72]
```

# Test source

```ts
  1  | import { test as base, expect, type Page } from '@playwright/test'
  2  | import { TESTID } from '../../../src/components/testids'
  3  | import { ChainFamily } from '../../../src/models/ChainType'
  4  | import { chainRegistry } from '../../../src/services/chainplugins/registry'
  5  | import '../../../src/services/chainplugins/evm/evmPlugin' // side-effect: registers EvmChainPlugin
  6  | import { E2E_CONFIG } from '../env'
  7  | import {
  8  |   setupVirtualAuthenticator,
  9  |   teardownVirtualAuthenticator,
  10 |   type VirtualAuthenticator,
  11 | } from '../helpers/webauthn'
  12 |
  13 | export interface WalletContext {
  14 |   page: Page
  15 |   auth: VirtualAuthenticator
  16 |   /** EVM addresses derived from test seed: [sender, recipient, ...] */
  17 |   evmAddresses: string[]
  18 | }
  19 |
  20 | /**
  21 |  * Fixture that provides a fully logged-in wallet page.
  22 |  *
  23 |  * Uses Login (not Create Account) so the app calls navigator.credentials.get(),
  24 |  * which returns the virtual credential's userHandle containing our test masterSeed.
  25 |  * Create Account would generate a new random seed and ignore our credential.
  26 |  */
  27 | export const test = base.extend<{ wallet: WalletContext }>({
  28 |   wallet: async ({ page }, use) => {
  29 |     // Derive expected addresses using project's EvmChainPlugin
  30 |     const seedBytes = new Uint8Array(Buffer.from(E2E_CONFIG.masterSeed, 'hex'))
  31 |     const evmPlugin = chainRegistry.get(ChainFamily.EVM)!
  32 |     const evmAccounts = evmPlugin.deriveAccounts(seedBytes, 5)
  33 |     const evmAddresses = evmAccounts.map((a) => a.address)
  34 |
  35 |     // Navigate to app
  36 |     await page.goto(E2E_CONFIG.baseUrl)
  37 |
  38 |     // Setup virtual authenticator with pre-loaded credential before clicking login
  39 |     const auth = await setupVirtualAuthenticator(page)
  40 |
  41 |     // Click "Login" — triggers navigator.credentials.get() which returns our
  42 |     // virtual credential's userHandle (masterSeed + username)
  43 |     const loginBtn = page.getByTestId(TESTID.LOGIN_BUTTON)
  44 |     await loginBtn.waitFor({ state: 'visible', timeout: 15000 })
  45 |     await loginBtn.click()
  46 |
  47 |     // Wait for wallet to be fully loaded (balance display appears)
> 48 |     await expect(page.getByTestId(TESTID.BALANCE_AMOUNT)).toBeVisible({
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  49 |       timeout: 15000,
  50 |     })
  51 |
  52 |     await use({ page, auth, evmAddresses })
  53 |
  54 |     // Cleanup
  55 |     await teardownVirtualAuthenticator(auth)
  56 |   },
  57 | })
  58 |
  59 | export { expect }
  60 |
```
