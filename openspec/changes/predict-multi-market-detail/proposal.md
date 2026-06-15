## Why

Polymarket's Gamma API represents "World Cup Winner" as a parent **event** that
wraps many child **markets** (one per team, each with its own Yes/No outcomes).
The current detail page only renders the first child market's outcomes, so a
user who opens "World Cup Winner" sees `Yes / No` buttons with no indication
of _what_ they are betting on — the underlying intent (pick a winner) is lost.
This makes multi-candidate events effectively unbettable from the wallet and
will only get worse as more candidate-style events appear in the Predict tab.

## What Changes

- **wallet-api**: extend the `getEventDetail` response with a `markets[]`
  array and a `marketCount` field so the frontend can render every child
  market.
- **wallet-api**: change `getMarketTokens` to accept a **market** slug (not
  an event slug) and fetch the market directly via Gamma's
  `GET /markets/slug/{slug}` endpoint. This is **BREAKING** for any caller
  that still passes an event slug (the only known caller is the new
  candidate switcher introduced by this change).
- **wallet**: render a candidate list in `PolymarketDetailPage` when
  `marketCount > 1`, default to the highest-volume market, and lazy-load
  tokens when the user switches. Single-market events keep the current
  Yes/No panel.
- **wallet**: tighten `PolymarketBettingPanel`'s props to bind to a single
  market and reset its internal state on market change.
- **wallet**: add the `predictCandidates` i18n key (zh-CN).

## Capabilities

### New Capabilities

- `predict-detail-multi-market`: Predict detail page must support events
  that contain multiple child markets, letting the user pick a candidate
  market before placing a bet, while keeping the existing single-market
  flow unchanged.

### Modified Capabilities

_None — there are no existing OpenSpec capabilities in `openspec/specs/`._

## Impact

- `wallet-api`:
  - `src/service/prediction-market-service.ts` — extend
    `eventToUnifiedMarket`; update `getMarketTokens` to call
    `GET /markets/slug/{slug}`.
  - `src/api/prediction_market.ts` — no schema change (field names stay
    the same; semantics of `getMarketTokens` change).
  - `test/unit/prediction-market-service.test.ts` — extend with
    multi-market shape and market-slug token tests.
- `wallet`:
  - `src/components/predict/PolymarketDetailPage.tsx` — branch on
    `marketCount`; render candidate list; pass selected market to the
    betting panel.
  - `src/components/predict/PolymarketBettingPanel.tsx` — accept a
    `market` prop; bind internal state to that market.
  - `src/services/polymarketService.ts` — extend the
    `PolymarketMarketDetail` type with `marketCount` / `markets[]`.
  - `src/i18n.tsx` — add `predictCandidates: '选择候选人'`.
- Runtime: changes are additive in shape, except for the
  `getMarketTokens` semantic change. Manual smoke check of one
  multi-candidate event after deploy.
- No new dependencies. No new env vars. No DB schema.
