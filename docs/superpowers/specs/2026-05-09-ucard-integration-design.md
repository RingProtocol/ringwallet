# UCard In-App Integration Design

> Date: 2026-05-09
> Status: Draft
> Author: SOLO

---

## 1. Background & Problem

UCard (U卡) is currently the third tab in the bottom navigation bar of Ring Wallet. It displays 5 third-party crypto card providers (Immersve, Ether.fi, Holyheld, Baanx, Reap), but the only interaction is `window.open()` to external websites. There is no in-app functionality, no API integration, and no business logic.

**Problem**: Users land on a page that is essentially a link directory, which is a poor experience and wastes a prime navigation position.

## 2. Goal

Transform UCard from a link directory into a deeply integrated in-app card management feature. The first integration partner is **Immersve** (Mastercard non-custodial crypto card). The design uses a **Provider Adapter pattern** to remain extensible for future providers.

### Core Features (v1)

1. **Onboarding & KYC** — Apply for a card and complete KYC within the app
2. **Top-up** — Fund the card from wallet crypto assets (on-chain transfer)
3. **Balance & Transactions** — View card balance and transaction history
4. **Card Management** — Freeze/unfreeze, spending limits, reveal card details

### Constraints

- Design a generic adapter framework first; actual Immersve API details will be filled in during integration
- Use MockAdapter for development and testing before real API access
- Follow existing project patterns (chainplugins registry, hooks, services structure)

---

## 3. Architecture

### 3.1 Layer Diagram

```
┌─────────────────────────────────────────────┐
│                  UI Layer                     │
│  CardTabHeader / CardTabBody                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ CardList │ │ CardDetail│ │ TopUpFlow    │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
└───────┼─────────────┼──────────────┼─────────┘
        │             │              │
┌───────┼─────────────┼──────────────┼─────────┐
│       ▼      Hooks & State Layer   ▼         │
│  useCardAccounts / useCardTransactions       │
│  useCardTopUp / useCardManagement            │
├──────────────────────────────────────────────┤
│         CardProviderAdapter (interface)       │
│  ┌──────────────────────────────────────┐    │
│  │ ImmersveAdapter                      │    │
│  │  - auth / kyc                        │    │
│  │  - card lifecycle                    │    │
│  │  - top-up (crypto → card)            │    │
│  │  - balance & transactions            │    │
│  │  - card management                   │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ MockAdapter (development / testing)  │    │
│  └──────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│         Storage Layer                         │
│  cardStore (IndexedDB) — card state cache     │
└──────────────────────────────────────────────┘
```

### 3.2 Page Flow

```
CardTab (bottom tab entry)
  │
  ├─ No linked card → CardOnboardingView
  │    ├─ Provider intro (Immersve features, supported regions)
  │    ├─ "Apply Now" → startKYC()
  │    ├─ KYC WebView (in-app)
  │    └─ KYC complete → auto create virtual card → CardDashboardView
  │
  └─ Has linked card → CardDashboardView
       ├─ Card overview (balance, status, visual card)
       ├─ Transaction list (paginated)
       ├─ Top-up entry → TopUpFlow
       │    ├─ Select asset (from wallet balances, filtered by supported)
       │    ├─ Enter amount (quick buttons: $50/$100/$500/custom)
       │    ├─ Confirm page (amount, fee estimate, recipient address)
       │    ├─ Wallet signature popup
       │    └─ Processing → success/failure
       └─ Card settings → CardSettingsView
            ├─ Freeze / unfreeze toggle
            ├─ Spending limits (daily / monthly / per-transaction)
            └─ Reveal card number / CVC / expiry (biometric auth, 60s auto-hide)
```

---

## 4. Data Model

### 4.1 CardAccount

```ts
interface CardAccount {
  id: string
  provider: string                    // 'immersve'
  status: 'pending_kyc' | 'active' | 'frozen' | 'closed'
  type: 'virtual' | 'physical'
  last4: string                       // Last 4 digits of card number
  balance: string                     // Fiat balance, e.g. "150.00"
  currency: string                    // "USD" | "EUR" | ...
  createdAt: number                   // Unix timestamp
  cardholderName: string
}
```

### 4.2 CardTransaction

```ts
interface CardTransaction {
  id: string
  cardId: string
  type: 'purchase' | 'topup' | 'refund' | 'fee'
  amount: string
  currency: string
  merchant?: string                   // Merchant name for purchases
  status: 'pending' | 'completed' | 'failed'
  timestamp: number
}
```

### 4.3 TopUp

```ts
interface TopUpParams {
  cardId: string
  asset: string                       // 'USDC' | 'ETH' | ...
  chain: string                       // 'ethereum' | 'arbitrum' | ...
  amount: string                      // '100.00'
}

interface TopUpOrder {
  id: string
  fromAddress: string                 // User wallet address
  toAddress: string                   // Provider top-up contract address
  asset: string
  chain: string
  amount: string                      // Exact amount with precision
  gasEstimate?: string
  expiresAt: number
}

interface TopUpResult {
  orderId: string
  txHash: string                      // On-chain transaction hash
  status: 'pending' | 'confirmed' | 'failed'
  estimatedArrival: number            // Estimated seconds to arrival
}
```

### 4.4 KYC

```ts
interface KYCSession {
  sessionId: string
  url: string                         // KYC flow URL (for WebView)
  expiresAt: number
}

type KYCStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected'
```

---

## 5. CardProviderAdapter Interface

```ts
interface CardProviderAdapter {
  // ─── Identity ───
  readonly id: string
  readonly displayName: string
  readonly supportedAssets: string[]       // ['ETH', 'USDC', 'USDT', ...]
  readonly supportedChains: string[]       // ['ethereum', 'arbitrum', ...]
  readonly supportedCurrencies: string[]   // ['USD', 'EUR', ...]
  readonly supportedRegions: string[]      // ['Global', 'EU', 'APAC', ...]
  readonly cardTypes: ('virtual' | 'physical')[]

  // ─── Lifecycle ───
  initialize(config: ProviderConfig): Promise<void>
  isLinked(): boolean
  disconnect(): Promise<void>
  healthCheck(): Promise<boolean>

  // ─── KYC & Card Creation ───
  startKYC(): Promise<KYCSession>
  getKYCStatus(): Promise<KYCStatus>
  createCard(type: 'virtual' | 'physical'): Promise<CardAccount>

  // ─── Card Management ───
  getCards(): Promise<CardAccount[]>
  getCardBalance(cardId: string): Promise<string>
  freezeCard(cardId: string): Promise<void>
  unfreezeCard(cardId: string): Promise<void>
  getCardDetails(cardId: string): Promise<CardDetail>
  updateSpendingLimit(cardId: string, limits: SpendingLimits): Promise<void>

  // ─── Top-up ───
  getSupportedTopUpAssets(): Promise<TopUpAsset[]>
  createTopUp(params: TopUpParams): Promise<TopUpOrder>
  executeTopUp(order: TopUpOrder, signature: string): Promise<TopUpResult>
  getTopUpStatus(orderId: string): Promise<TopUpResult>

  // ─── Transactions ───
  getTransactions(
    cardId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<CardTransaction>>

  // ─── Reserved Extensions ───
  setupContactless?(cardId: string): Promise<ContactlessConfig>
  getMultiCurrencyAccounts?(cardId: string): Promise<CurrencyAccount[]>
  requestPhysicalCard?(cardId: string, address: ShippingAddress): Promise<PhysicalCardOrder>
  onTransactionCallback?(callback: (tx: CardTransaction) => void): void
  getExchangeRate?(from: string, to: string): Promise<number>
  getCardImage?(cardId: string): Promise<string>  // URL to card visual
}

interface ProviderConfig {
  apiKey: string
  apiSecret?: string
  environment: 'sandbox' | 'production'
  walletAddress: string
}

interface CardDetail extends CardAccount {
  cardNumber?: string          // Full card number (masked by default)
  cvc?: string
  expiryMonth?: number
  expiryYear?: number
  spendingLimits: SpendingLimits
  contactlessEnabled: boolean
}

interface SpendingLimits {
  daily: string | null         // null = no limit
  monthly: string | null
  perTransaction: string | null
}

interface PaginationParams {
  page: number
  pageSize: number
  cursor?: string
}

interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

interface TopUpAsset {
  symbol: string               // 'USDC'
  chain: string                // 'ethereum'
  balance: string              // User's wallet balance
  decimals: number
  minAmount: string
  maxAmount: string
  estimatedFee: string
  processingTime: string       // '~30 seconds'
}

// Reserved extension types
interface ContactlessConfig {
  enabled: boolean
  provisionUrl?: string        // For Apple Pay / Google Pay provisioning
}

interface CurrencyAccount {
  currency: string
  balance: string
  isDefault: boolean
}

interface PhysicalCardOrder {
  orderId: string
  status: 'ordered' | 'shipped' | 'delivered'
  trackingNumber?: string
  estimatedDelivery?: string
}
```

### 5.1 Registry

```ts
// src/features/card/services/registry.ts

const cardProviderRegistry = new Map<string, CardProviderAdapter>()

function registerCardProvider(adapter: CardProviderAdapter): void
function getCardProvider(id: string): CardProviderAdapter | undefined
function getActiveProvider(): CardProviderAdapter | undefined
function getRegisteredProviders(): CardProviderAdapter[]
```

---

## 6. File Structure

```
src/features/card/
├── components/
│   ├── CardTab.tsx                    # Entry point (refactor existing)
│   ├── Card.css                       # Styles (refactor existing)
│   │
│   ├── onboarding/
│   │   ├── CardOnboardingView.tsx     # Guide page when no card linked
│   │   ├── ProviderIntroCard.tsx      # Provider feature highlights
│   │   └── KYCWebView.tsx             # KYC flow container (WebView)
│   │
│   ├── dashboard/
│   │   ├── CardDashboardView.tsx      # Main view when card is linked
│   │   ├── CardOverview.tsx           # Card visual + balance display
│   │   ├── CardStatusBadge.tsx        # Active / Frozen / Pending badge
│   │   └── TransactionList.tsx        # Transaction history (paginated)
│   │
│   ├── topup/
│   │   ├── TopUpEntry.tsx             # Top-up entry point
│   │   ├── TopUpAssetSelect.tsx       # Select crypto asset to top up
│   │   ├── TopUpAmountInput.tsx       # Enter amount with quick buttons
│   │   ├── TopUpConfirm.tsx           # Confirmation page with signature
│   │   └── TopUpResult.tsx            # Processing / success / failure
│   │
│   ├── management/
│   │   ├── CardSettingsView.tsx       # Card management hub
│   │   ├── CardFreezeToggle.tsx       # Freeze / unfreeze switch
│   │   ├── SpendingLimit.tsx          # Spending limit configuration
│   │   └── CardDetailsReveal.tsx      # Reveal card number / CVC (biometric)
│   │
│   └── shared/
│       ├── CardProviderCard.tsx       # Provider card (refactor existing)
│       ├── CurrencyAmount.tsx         # Fiat amount display
│       └── EmptyCardState.tsx         # Empty state placeholder
│
├── hooks/
│   ├── useCardProvider.ts             # Get current provider adapter
│   ├── useCardAccounts.ts             # Card account list + status
│   ├── useCardTransactions.ts         # Transaction history (paginated)
│   ├── useCardTopUp.ts                # Top-up flow state machine
│   └── useCardManagement.ts           # Card management operations
│
├── services/
│   ├── adapter/
│   │   ├── types.ts                   # Adapter interface + all type definitions
│   │   ├── ImmersveAdapter.ts         # Immersve implementation (stub)
│   │   └── MockAdapter.ts             # Mock implementation for dev/test
│   ├── registry.ts                    # Provider registry
│   └── cardStorage.ts                 # IndexedDB persistence for card state
│
└── index.ts                           # Public exports
```

---

## 7. Key Interaction Details

### 7.1 KYC & Onboarding

1. User taps "Get a Card" on the onboarding view
2. Provider intro card shows Immersve features, supported regions, card types
3. User taps "Apply Now" → `startKYC()` returns a session with URL
4. `KYCWebView` opens in-app (not external browser) for seamless experience
5. After KYC completion, poll `getKYCStatus()` until `approved`
6. Auto-create virtual card → navigate to `CardDashboardView`
7. Cache card state in IndexedDB for offline/speed

### 7.2 Top-up Flow

1. From card dashboard, tap "Top Up"
2. `TopUpAssetSelect` shows wallet assets filtered by `getSupportedTopUpAssets()`
3. User selects asset and enters amount (quick buttons: $50 / $100 / $500 / custom)
4. `TopUpConfirm` shows: amount, estimated fee, recipient address, processing time
5. User confirms → wallet signature popup (ERC-20 approve + transfer, or native ETH)
6. After signature → `executeTopUp()` submits to provider
7. Show processing state → poll `getTopUpStatus()` → success notification + balance update

### 7.3 Card Management

- **Freeze/Unfreeze**: Toggle switch on settings page, calls `freezeCard()` / `unfreezeCard()`, immediate effect
- **Reveal Details**: Tap "Show card details" → biometric prompt (fingerprint/PIN) → show full card number, CVC, expiry for 60 seconds then auto-hide
- **Spending Limits**: Set daily / monthly / per-transaction limits with number inputs, calls `updateSpendingLimits()`

---

## 8. Storage & Caching

### IndexedDB Schema

```
cardStore
├── accounts: CardAccount[]            # Cached card accounts
├── transactions: CardTransaction[]    # Cached transactions (last 100)
├── topUpOrders: TopUpOrder[]          # Pending/recent top-up orders
├── providerState: {                   # Provider connection state
│     providerId: string
│     isLinked: boolean
│     kycStatus: KYCStatus
│     linkedAt: number
│   }
└── settings: {                        # User preferences
│     defaultCardId: string | null
│     lastUsedAsset: string | null
│   }
```

### Cache Strategy

- Card balance: Cache with 30-second TTL, background refresh
- Transactions: Cache last 100, pull-to-refresh for latest
- Top-up orders: Persist pending orders, clean up after 24h

---

## 9. Error Handling

| Scenario | Handling |
|----------|----------|
| KYC rejected | Show rejection reason, offer "Try Again" or "Contact Support" |
| Top-up failed (insufficient balance) | Show clear error, suggest alternative asset |
| Top-up failed (network) | Retry button, persist order for later completion |
| Card frozen by provider | Show notification, disable top-up, enable unfreeze |
| API timeout | Show loading state, retry with exponential backoff |
| Provider API down | Show maintenance message, keep cached data visible |

---

## 10. Security Considerations

- **No private keys sent to provider**: Top-up uses wallet's native signing flow; only signed transactions are submitted
- **Card details protection**: Full card number / CVC require biometric auth, auto-hide after 60s
- **KYC data**: Handled entirely within provider's WebView; wallet does not intercept or store KYC data
- **API keys**: Stored in environment variables, never in client-side code
- **HTTPS only**: All provider API communication over HTTPS

---

## 11. Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Adapter unit tests | Vitest | MockAdapter behavior, interface compliance |
| Hook tests | Vitest | useCardAccounts, useCardTopUp state machines |
| Component tests | Vitest + Testing Library | Rendering, user interactions |
| Integration tests | Vitest | Full top-up flow with MockAdapter |
| E2E tests | Playwright | KYC → top-up → balance check flow |

---

## 12. Future Considerations (Out of Scope for v1)

- Multiple provider support (Ether.fi, Baanx, etc.)
- Physical card ordering and tracking
- Apple Pay / Google Pay provisioning
- Multi-currency card accounts
- Push notifications for transactions
- Card-to-card transfers
- Rewards / cashback programs
