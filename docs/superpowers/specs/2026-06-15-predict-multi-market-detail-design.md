# Predict Detail — Multi-Market (Candidate) View

> Date: 2026-06-15
> Status: Approved
> Author: SOLO (brainstormed with user)
> Related: 2026-06-15 predict-detail-500 fix (commit not yet made)

---

## 1. Background & Problem

The Predict tab's detail page (`PolymarketDetailPage`) currently renders a Yes/No betting panel for any market, regardless of whether the underlying event contains one or many child markets. This produces confusing UX for "candidate" events where the meaningful choice is _which_ market to bet on, not Yes/No.

**Example**: opening the "World Cup Winner" event shows:

- Title: `World Cup Winner`
- Outcomes: `[Yes, No]` with prices `[16.1%, 83.8%]`

This is wrong. Polymarket's Gamma API represents "World Cup Winner" as a parent **event** containing ~32 child **markets**, one per team (`Will Spain win?`, `Will Brazil win?`, …). Each child market has its own Yes/No outcomes. Today's code only shows the first child market's outcomes, so the user thinks they are buying "World Cup Winner = Yes", when they are actually buying "Spain wins = Yes".

### Goal

For multi-candidate events, show the list of candidates and let the user pick one before betting. For single-market events (sports, single Yes/No questions), keep the current simple behavior.

### Non-Goals

- No changes to the list page (still shows one row per event).
- No changes to the World Cup category-fetching rules.
- No new event-level aggregated token — tokens are still per-market.

---

## 2. Current Behavior

- `wallet-api/src/service/prediction-market-service.ts::eventToUnifiedMarket` flattens each event to a single `UnifiedMarket` by picking the first active child market. The other child markets are discarded.
- `PolymarketDetailPage` calls `fetchPolymarketMarketDetail(slug)`, renders the event title and that single market's outcomes, then mounts `PolymarketBettingPanel` with `outcomes` / `outcomePrices`.
- `PolymarketBettingPanel` lets the user pick an outcome index, enter a USDC amount, and calls `usePolymarketBetting.placeBuyOrder({ slug, outcomeIndex, ... })`. The hook uses `slug` (the event slug) to fetch the first market's tokens via `wallet-api GET /v1/prediction_markets/tokens`.

---

## 3. Proposed Behavior

### Detection

A single rule drives the UI:

- `event.markets.length > 1` → **Candidate view** (list of child markets, user picks one)
- `event.markets.length <= 1` → **Simple view** (current Yes/No panel, unchanged)

This keeps sports match events (which typically have 1–2 child markets per event) on the existing simple path, and only changes "candidate" events.

### Candidate list

- Render only markets that pass `active === true && closed === false`.
- Sort the visible candidates by `volume` descending.
- Default the selected candidate to the first (highest volume).
- Each row shows: candidate's `question` (e.g. "Will Spain win the 2026 FIFA World Cup?") + current YES price as a percentage.
- Tapping a row switches the betting panel to that market.

### Betting flow

- Betting panel now binds to the **selected market** (not the event).
- The amount input, outcome buttons, and review modal are scoped to the selected market's outcomes & prices.
- Switching the candidate resets:
  - `selectedOutcome` → `null`
  - `amount` → `''`
  - any prior betting state (via existing `usePolymarketBetting.reset()`)

### Empty / error states

- If after filtering there are 0 active, non-closed markets, show the existing `predictNoMarkets` empty state (matches list page rule).
- If the tokens endpoint returns 404 / 500 for a market, surface the existing error UI on the betting panel (no new design needed).

---

## 4. Data Model Changes

### 4.1 Backend (`wallet-api`)

#### `getEventDetail` response — extend the unified market shape

Add a `markets` array and a `marketCount` integer to the per-event payload. Keep all existing fields (the "representative market" fields on the top level) so list-page and any other callers do not break.

```ts
interface UnifiedMarket {
  // ...existing fields (id, question, slug, image, volume24hr, volume,
  //    outcomes, outcomePrices, eventVolume24hr, eventVolume,
  //    eventLiquidity, category, subcategory, endDate)...

  marketCount: number
  markets: Array<{
    id: string
    slug: string // child market slug, e.g. "will-spain-win-…-963"
    question: string // "Will Spain win the 2026 FIFA World Cup?"
    image?: string
    volume: number // numeric; falls back to volumeNum / parseFloat(volume)
    outcomes: string // JSON: ["Yes","No"]
    outcomePrices: string // JSON: ["0.1615","0.8385"]
    active: boolean
    closed: boolean
  }>
}
```

Notes:

- `volume` is normalized to a number. The `GammaMarket.volume` field is documented as a string, with `volumeNum` as the numeric companion — use `volumeNum ?? parseFloat(volume) ?? 0`.
- `markets` is empty if `event.markets` is missing or all children fail the normalization.
- The top-level `outcomes` / `outcomePrices` continue to be the **first active** market's values (unchanged) so the list page and the simple-view detail page don't break.

#### `getMarketTokens` — switch from event slug to market slug

The endpoint is already named "tokens" (a child-market concept), but it currently takes an event slug and returns the first child market's tokens. Change it to take a **market slug** and return that specific market's tokens.

- New upstream URL: `GET https://gamma-api.polymarket.com/markets/slug/{slug}?` (no `with_markets` needed; a single market has no nested children).
- If the market has no `clobTokenIds`, return an empty array (still `200`).
- Schema field name `slug` stays as-is for minimal caller changes; only the _semantic_ changes. This is a breaking change for any existing caller that still passes an event slug — the only known caller is the new betting-panel candidate switcher, so a coordinated release is fine.

```ts
// Response (unchanged shape)
{ data: { clobTokenIds: string[], conditionId?: string } }
```

#### Schema

`MarketTokensBody` keeps `{ source, slug }` — no new field. A short comment must be added to the schema declaration explaining that `slug` is now a **market** slug, not an event slug.

### 4.2 Frontend (`wallet`)

#### `polymarketService.ts` — type & fetchers

- Extend `PolymarketMarketDetail` (or the equivalent) with `marketCount: number` and `markets: Array<{ id, slug, question, image?, volume, outcomes, outcomePrices, active, closed }>`.
- `fetchPolymarketMarketDetail(slug)` already returns the response's `data`; callers consume the new fields through the type only. No fetcher change needed.

#### `PolymarketDetailPage.tsx`

- Read `detail?.marketCount`.
- If `> 1`:
  - Compute `activeMarkets = markets.filter(m => m.active && !m.closed).sort((a, b) => b.volume - a.volume)`.
  - Default `selectedMarket = activeMarkets[0]`.
  - Render a candidate list above the betting panel (or replace the outcomes section). Each row = `<button>` that updates `selectedMarket` via `setSelectedMarket`.
  - Pass `selectedMarket` to `PolymarketBettingPanel`.
- If `<= 1`:
  - Render exactly the current detail layout. `PolymarketBettingPanel` continues to receive `outcomes` and `outcomePrices` derived from `detail` as before. Pass a default `{ slug, outcomes, outcomePrices }` to the panel.

#### `PolymarketBettingPanel.tsx`

- Change props from `{ slug, outcomes, outcomePrices }` to `{ market: { slug, outcomes, outcomePrices } }`.
- The internal `usePolymarketBetting.placeBuyOrder` is called with `market.slug` (was `slug` prop).
- Add a `key={market.slug}` to force a fresh internal state when the market changes (covers `selectedOutcome`, `amount`, `usePolymarketBetting` state).
- All other behavior (review modal, biometric gate, USDC approval, error display) is unchanged.

#### i18n

Add a new key in `src/i18n.tsx` (primary language is `zh-CN`, matching existing entries like `introSelfCustodySub`):

- `predictCandidates`: `'选择候选人'` for `zh-CN`.

Reuse existing keys (`predictOutcomes`, `predictOutcome`, `predictPlaceBet`, `predictReviewOrder`, etc.) for everything else.

---

## 5. Data Flow

### Multi-market (candidate) view

```
PolymarketDetailPage
  │
  ├─ detail = fetchPolymarketMarketDetail(eventSlug)
  │     └─ POST /v1/prediction_markets/detail  →  { data: { …, marketCount, markets[] } }
  │
  ├─ activeMarkets = markets.filter(active && !closed).sort(volume desc)
  ├─ selectedMarket = activeMarkets[0]
  │
  ├─ <CandidateList markets={activeMarkets} onSelect={setSelectedMarket} />
  │
  └─ <PolymarketBettingPanel
        key={selectedMarket.slug}                  // remount → fresh state
        market={selectedMarket}
     />
       │
       └─ usePolymarketBetting.placeBuyOrder({ slug: market.slug, outcomeIndex, … })
            │
            └─ fetchMarketTokens(market.slug)
                 └─ POST /v1/prediction_markets/tokens
                      └─ wallet-api  →  GET gamma-api.polymarket.com/markets/slug/{slug}
                      └─ returns { data: { clobTokenIds, conditionId } }
```

### Single-market (simple) view

Unchanged. `PolymarketBettingPanel` still receives a synthesized `{ slug, outcomes, outcomePrices }` from the existing event-top-level fields.

---

## 6. Out of Scope

- No changes to `PolymarketListPage` (list rows still show one entry per event with a representative title).
- No changes to category fetching (the World Cup `tag_id` rules in `documents/tech/polymarket-betting.md` and `AGENTS.md` are untouched).
- No changes to `eventToUnifiedMarket`'s representative-market logic at the top level (we only _augment_ the payload with `markets[]`).
- No new endpoints, no new env vars, no DB schema changes.
- No new dependencies.
- `wallet/src/service/prediction-market-service.ts` (the in-wallet mirror of the wallet-api service) is not touched in this design — it has its own stale URL bug (the one we just fixed on the wallet-api side) but is not on the runtime path; handling it is a separate concern.

---

## 7. Testing Plan

### `wallet-api` unit tests

- `eventToUnifiedMarket` (extend existing test file `test/unit/prediction-market-service.test.ts`):
  - For a multi-market event (e.g. 3 markets): asserts `marketCount === 3`, `markets.length === 3`, each market's `volume` is a number, the first element is the first active child, `outcomes` / `outcomePrices` at the top level still point to the first active market.
  - For a 0-market event: `marketCount === 0`, `markets === []`, `data === null` (existing behavior preserved).
  - For a 1-market event: `marketCount === 1`, `markets.length === 1`, top-level `outcomes` / `outcomePrices` equal the one market's.
- `getMarketTokens` (new test, mocked fetch): given a market slug, calls `GET gamma-api…/markets/slug/{slug}` (not `/events/slug/…`) and returns `clobTokenIds` + `conditionId` for that market.

### `wallet` tests

- `PolymarketDetailPage` (snapshot or smoke): renders a candidate list when `marketCount > 1`, with the first sorted-by-volume row selected.
- `PolymarketBettingPanel` (smoke): switching the `market` prop changes the displayed outcomes and resets the amount.

### E2E

- Open Predict → click "World Cup Winner" → see candidate list → switch candidate → enter USDC amount → review modal shows the selected market's price. Manual QA via Playwright (existing setup) is sufficient; no new e2e suite required.

---

## 8. Risks & Mitigations

- **Stale `markets` data after a market is suspended mid-session.** Mitigation: if a selected market becomes inactive / closed between detail load and bet, `placeBuyOrder` will fail with "Invalid outcome index" / 404. The existing error UI surfaces this; no new handling needed. (Future: refetch on focus — out of scope.)
- **`getMarketTokens` semantic change breaks any other caller.** Mitigation: a `git grep` of `prediction_markets/tokens` shows only the new candidate switcher will call it after this change. Document the breaking change in `getMarketTokens` JSDoc and in the PR description.
- **Sort by `volume` exposes an in-wallet inconsistency if Gamma's `volume` units change.** Mitigation: the `formatPolymarketVolume` AI contract (`documents/tech/polymarket-betting.md` §6) already says Gamma's volume is already-scaled; we use the same convention. No new formatter.

---

## 9. Rollout

1. Merge backend change to `wallet-api`, deploy, verify list page + simple-view detail page unchanged.
2. Merge frontend change to `wallet`, release.
3. Monitor: 500 rate on `/v1/prediction_markets/detail` and `/v1/prediction_markets/tokens`; manual click-through of one multi-candidate event.
