## Why

The Predict bet-confirm modal has two UX issues that make the bet
flow confusing, especially for low-probability / longshot markets:

1. **Misleading price display**: the modal shows the price as a
   percentage rounded to 1 decimal (e.g. `0.1%`). For very low prices
   (`0.05%`, `0.05…%`) the rounding inflates the displayed value and
   the implied math (9 USDC / 0.1% = 9 000 shares) does not match the
   18 000 shares the modal actually shows. The CLOB order is
   numerically correct (it uses the raw price), but the user can't
   reconcile what they see.
2. **Button doesn't reflect in-progress work**: the confirm button
   only shows "确认中" and disables itself when `state === 'posting'`,
   but the work flow has **four** in-progress states
   (`checking_allowance` → `approving` → `signing` → `posting`). The
   first three leave the button labelled "确认" and clickable, so users
   re-tap it and either re-trigger the biometric prompt or feel like
   "nothing happened". The actual on-chain / CLOB work may already be
   in progress.

## What Changes

- **wallet — `PolymarketBettingPanel` modal**: replace the rounded
  `价格: X%` row with `单价: 0.000500 USDC` (6 decimals, matches
  Polymarket CLOB USDC decimals). Add the `predictUnitPrice` i18n key
  in both `en` and `zh`.
- **wallet — `PolymarketBettingPanel` confirm button**: show "确认中"
  (`t('confirming')`) and disable the button for **all** in-progress
  states (`checking_allowance`, `approving`, `signing`, `posting`),
  not only `posting`. The button label becomes a single source of
  truth: idle → "确认", any work-in-progress → "确认中" + disabled.

## Capabilities

### New Capabilities

- `predict-bet-modal-display`: The bet-confirm modal must show the
  unit price in USDC (matching the CLOB value the order signs with)
  and must reflect in-progress work on the confirm button.

### Modified Capabilities

_None — `openspec/specs/` is empty; no existing requirement is
changing. The `predict-detail-multi-market` change already added
`predictCandidates` but no requirement was violated._

## Impact

- `wallet`:
  - `src/components/predict/PolymarketBettingPanel.tsx` — replace the
    price row format and broaden the in-progress predicate.
  - `src/i18n.tsx` — add `predictUnitPrice` in both languages.
- `wallet-api`: untouched.
- No new dependencies. No breaking API changes. No DB schema.
- Risk: the CLOB order is unchanged (still signs with the raw price
  in `usePolymarketBetting`), so this is a pure presentation /
  interaction fix; no on-chain risk.
