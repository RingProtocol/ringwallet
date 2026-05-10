# Card Module — Architecture Note

## Component hierarchy

```
WalletMainPage (底部 tab 控制)
  ├── CardTabHeader          → 标题栏 "Card"
  └── CardTabBody
       └── CardApp           → 核心状态机，管理所有子视图
            ├── Loading          (adapterLoading || accountsLoading)
            ├── CardOnboardingView  (供应商列表 — 始终作为 main 视图)
            │    └── CardProviderCard × N
            │         ├── "Apply Now"    → KYC 流程
            │         └── "View Details" → 全屏 Dashboard (仅已连接供应商)
            ├── KYCWebView          (KYC iframe)
            ├── CardDashboardView   (全屏 portal → document.body)
            │    ├── CardOverview
            │    └── TransactionList
            ├── CardSettingsView    (设置页)
            └── TopUp 系列
                 ├── TopUpAssetSelect
                 ├── TopUpAmountInput
                 ├── TopUpConfirm
                 └── TopUpResult
```

## Views matrix

| View | Trigger | Component | Exits to |
|------|---------|-----------|----------|
| Provider list | `currentView === 'main'` | `CardOnboardingView` | KYC (Apply) / Detail (View Details) |
| KYC | `kycUrl !== null` | `KYCWebView` | Provider list |
| Dashboard | `currentView === 'detail'` | `CardDashboardView` → fullscreen portal | Provider list (Back) |
| Top-up | `currentView === 'topup'` | `TopUp*` components | Provider list |
| Settings | `currentView === 'settings'` | `CardSettingsView` | Provider list |

## Navigation flow

```
[Card Tab] → Provider List (main)
  ├── "Apply Now"     → KYC → (approved) → reload accounts → Provider List
  ├── "View Details"  → Dashboard (fullscreen portal, z-index:500)
  │    ├── Back       → Provider List
  │    ├── Top Up     → TopUp flow → Provider List
  │    └── Settings   → CardSettingsView → Provider List
  └── "Visit site"    → external link (new tab)
```

## State ownership

All navigation and KYC state lives in `CardApp` (the router):

- `currentView: 'main' | 'detail' | 'topup' | 'settings' | 'kyc'` — primary routing.
- `detailProviderId: string | null` — which provider's card is shown in the dashboard.
- `kycUrl: string | null` — non-null ↔ KYC view is visible; cleared on dismiss, error, or complete.
- `activeProviderId: string | null` — provider that initiated the current KYC session.
- `kycPollTimeoutsRef` — holds pending `setTimeout` IDs for the KYC status poll loop; must be cleared on any KYC exit path.

Domain data is in dedicated hooks:

| Hook | Owns |
|------|------|
| `useCardProvider` | active adapter instance |
| `useCardAccounts` | `CardAccount[]`, cache-first load |
| `useCardTransactions` | paginated transaction list |
| `useCardTopUp` | top-up stage machine |

## KYC exit paths

Three distinct exits from the KYC view, each must clear `kycPollTimeoutsRef`:

| Exit | Handler | Action |
|------|---------|--------|
| User taps × | `handleKYCDismiss` | Clear timers → `kycUrl = null` → `main` |
| iframe load error | `handleKYCError` | Clear timers → `kycUrl = null` → `main` |
| KYC page signals done | `handleKYCComplete` | Clear timers → check status → create card if approved → `main` |

## Dashboard presentation

`CardDashboardView` is always rendered fullscreen via `createPortal` into `document.body` (`position: fixed; inset: 0; z-index: 500`). It includes a `TitleBar` with a Back button that returns to the provider list (`currentView = 'main'`).

## Adapter boundary

`src/features/card/services/adapter/` isolates all provider-specific code behind a uniform interface (`ICardAdapter`). `MemoryBackedCardAdapter` is the sandbox/test implementation; `ImmersveAdapter` wraps the production API. `CardApp` never imports adapters directly — it accesses them via `useCardProvider()` and `cardProviderRegistry`.
