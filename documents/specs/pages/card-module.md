# Card Module — Architecture Note

## Views matrix

| View | Trigger | Component | Exits to |
|------|---------|-----------|----------|
| Onboarding list | `accounts.length === 0` | `CardOnboardingView` | KYC (Apply Now) |
| KYC | `kycUrl !== null` | `KYCWebView` | Main (onDismiss / onError / onComplete) |
| Dashboard fullscreen | `activeCard && cardDetailFullscreen` | `CardDashboardView presentation="fullscreen"` → portal | Dashboard inline (Back) |
| Dashboard inline | `activeCard && !cardDetailFullscreen` | `CardDashboardView presentation="inline"` | — |
| Top-up | `currentView === 'topup'` | `TopUp*` components | Main |
| Settings | `currentView === 'settings'` | `CardSettingsView` | Main |

## State ownership

All navigation and KYC state lives in `CardApp` (the router):

- `kycUrl: string | null` — non-null ↔ KYC view is visible; cleared on dismiss, error, or complete.
- `currentView: 'main' | 'topup' | 'settings'` — secondary routing for post-dashboard flows.
- `cardDetailFullscreen: boolean` — controls portal vs inline presentation of the dashboard; resets to `true` whenever a new `activeCard.id` appears.
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

## Presentation modes — Dashboard

`CardDashboardView` supports two presentations:

- **`fullscreen`** — rendered via `createPortal` into `document.body`; uses `position: fixed; inset: 0; z-index: 500`. Includes a `TitleBar` with Back.
- **`inline`** — rendered in the normal DOM flow inside the Card tab; `.card-dashboard-page--inline` resets `position/inset/z-index` so it does not escape its container.

The `Back` button in fullscreen mode sets `cardDetailFullscreen = false`, switching to inline. There is no navigation back from inline (the tab itself is the exit).

## Adapter boundary

`src/features/card/services/adapter/` isolates all provider-specific code behind a uniform interface (`ICardAdapter`). `MemoryBackedCardAdapter` is the sandbox/test implementation; `ImmersveAdapter` wraps the production API. `CardApp` never imports adapters directly — it accesses them via `useCardProvider()` and `cardProviderRegistry`.
