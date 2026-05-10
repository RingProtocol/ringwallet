# Card provider adapters

This folder holds **per-provider implementations** of `CardProviderAdapter` (`types.ts`). The wallet UI lists issuers from `src/config/cardProviders.ts` (`CARD_PROVIDERS`); only providers that **register** an adapter here can run in-app flows (KYC, cards, top-up, etc.).

---

## Contract

All adapters implement **`CardProviderAdapter`**: lifecycle (`initialize`, `isLinked`, `disconnect`, `healthCheck`), KYC (`startKYC`, `getKYCStatus`), cards, top-up, and transactions. See `types.ts` for the full surface.

- **`id`** must equal the **`id`** of the matching entry in `CARD_PROVIDERS` (e.g. `immersve`). The onboarding list uses `cardProviderRegistry.has(provider.id)` to decide whether **Apply** is enabled.
- **`initialize`** receives `ProviderConfig` (`apiKey`, optional `apiSecret`, `environment`, `walletAddress`). Never persist raw secrets in `localStorage`; keep session material in memory or OS secure storage as appropriate.

---

## Issuer reference (SDK / docs)

Use these as the **source of truth** when implementing or reviewing an adapter. URLs change over time; if a link breaks, search the vendor’s developer or partner portal.

| Provider `id` | Product | Official site | Integration docs / SDK |
| --- | --- | --- | --- |
| `immersve` | Immersve | https://immersve.com | https://docs.immersve.com/ — API reference, KYC, cards, webhooks; guides include custodial and Web3 wallet card issuing. |
| `etherfi` | Ether.fi Cash | https://cash.ether.fi | https://etherfi.gitbook.io/etherfi/cash/technical-documentation — Cash modules and on-chain contracts; see also https://github.com/etherfi-protocol/cash-contracts and `cash-v3` for protocol-level integration. |
| `holyheld` | Holyheld | https://holyheld.com | https://holyheld.com/sdk — `@holyheld/sdk` (npm); docs tree under https://holyheld.com/documentation (e.g. initialization, flows). |
| `baanx` | Baanx | https://baanx.com | https://docs.baanx.com/ — guides, card lifecycle, OAuth / `x-client-key`, custodial vs non-custodial wallet modes. |
| `reap` | Reap | https://reap.co | https://reap.readme.io/ — getting started, sandbox keys, card issuing API (e.g. create/list cards). |

---

## Rules for adding or changing a provider

1. **Config**  
   - Add or update the row in `src/config/cardProviders.ts` (`CARD_PROVIDERS`) so marketing copy, icon, and regions stay in sync with the app.

2. **Adapter**  
   - Add `YourAdapter.ts` implementing `CardProviderAdapter` with `readonly id` matching `CARD_PROVIDERS[].id`.  
   - Register it in `index.ts`: `cardProviderRegistry.register(yourAdapter)`.  
   - Import `index.ts` (or the adapter barrel) from a **card feature entry** that always loads with the tab (e.g. `CardApp.tsx` side-effect import) so registration runs before the UI reads the registry.

3. **Self-custody**  
   - Ring does not send **`masterSeed` or private keys** to card partners. Pass only what their API requires (e.g. wallet **address**, signed challenges, user-bound session tokens). Follow each vendor’s non-custodial / delegation model if offered.

4. **Sandbox vs production**  
   - Use `ProviderConfig.environment` (`sandbox` | `production`) and vendor-specific base URLs / keys. Do not ship production keys in client bundles; prefer short-lived tokens from a minimal backend if the partner requires server-side secrets.

5. **Testing**  
   - **`MemoryBackedCardAdapter`** (`memoryBackedCardAdapter.ts`) is a small in-memory implementation of `CardProviderAdapter` used by **`immersveAdapter`** until the real HTTP client ships. Unit tests construct **fresh instances** with a throwaway `id` (see `test/unit/card/memory-backed-adapter.test.ts`).  
   - **`startKYC()`** must return a real hosted URL from the issuer when integrated; until then it uses **`about:blank`** so the app does not request fake third-party hosts in the Network panel.

6. **Optional methods**  
   - `setupContactless`, `getMultiCurrencyAccounts`, `requestPhysicalCard`, `onTransactionCallback`, `getExchangeRate`, `getCardImage` are optional on the interface; implement when the issuer supports them.

---

## File map

| File | Role |
| --- | --- |
| `types.ts` | `CardProviderAdapter` interface. |
| `index.ts` | Registers adapters with `cardProviderRegistry`; re-exports types and public adapter instances. |
| `memoryBackedCardAdapter.ts` | `MemoryBackedCardAdapter` class (in-memory KYC/card flows for sandbox UX). |
| `ImmersveAdapter.ts` | `immersveAdapter` instance (`id: immersve`) until a dedicated HTTP implementation lands. |

---

## Automated tests

| Suite | Command | What it covers |
| --- | --- | --- |
| Vitest (unit) | `yarn vitest run test/unit/card/memory-backed-adapter.test.ts` | KYC session URL, approval timer, `createCard` for a fresh adapter instance. |
| Playwright (UI) | `yarn test:e2e -- test/playwright/tests/card-tab.spec.ts` | Logged-in flow: Card tab → Immersve **Apply** → KYC shell; asserts iframe `src` is `about:blank` and no request to `mock-kyc.example.com`. |

---

## Related code

- Registry: `../registry.ts` (`get`, `has`, `getActiveProvider`).  
- UI provider list: `src/config/cardProviders.ts`.  
- Card feature overview: `CLAUDE.md` (project root) and `docs/superpowers/specs/2026-05-09-ucard-integration-design.md` if present.
