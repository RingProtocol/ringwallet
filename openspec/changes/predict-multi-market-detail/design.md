## Context

The Predict tab in Ring Wallet lists Polymarket events. When the user taps an
event row, `PolymarketDetailPage` fetches the event detail and renders a
Yes/No betting panel. Today this panel binds to the **first** child market of
the event, regardless of how many child markets the event contains. For
"candidate" events like _World Cup Winner_ (32 child markets) the user is
shown `Yes / No` with no indication of _which_ candidate they are betting on.

Gamma's data model is event → markets, and a "candidate" event has many
binary markets (one per candidate). The wallet needs to expose this
structure to the user: list the candidates, let the user pick one, then bet
Yes/No on that single market. Single-market events (typical sports matches)
must keep their current simple Yes/No behavior.

The change touches two repos that share a release boundary:

- `wallet-api` (backend; deployed at `wapi.testring.org`) — owns the Gamma
  fetch + normalization.
- `wallet` (frontend) — owns the detail page + betting panel.

## Goals / Non-Goals

**Goals:**

- Detail page renders a candidate list when the underlying event contains
  more than one market; default selection = the highest-volume market.
- Switching candidates resets the betting panel and lazily fetches new
  market tokens.
- Single-market events keep the existing Yes/No flow untouched.
- `getMarketTokens` aligns with its name: it returns tokens for a single
  market, taking a market slug.

**Non-Goals:**

- No changes to the list page (still one row per event).
- No changes to category fetching rules (the World Cup `tag_id` rules in
  `documents/tech/polymarket-betting.md` and `AGENTS.md` are untouched).
- No new endpoints, no new env vars, no new dependencies, no DB changes.
- No real-time price streaming; tokens are fetched on selection only.
- `wallet/src/service/prediction-market-service.ts` (the in-wallet mirror
  of the wallet-api service) is not part of this change. It has the same
  URL bug fixed elsewhere; its runtime path is not used by the wallet UI.

## Decisions

### D1. Detection rule: `event.markets.length > 1`

A single boolean drives the UI split. We considered alternatives:

- _Filter by `outcomes` shape_ — only show the candidate view when each
  child market has exactly `["Yes","No"]`. More precise, but adds a
  stringly-typed check and bakes Polymarket's convention into the UI.
- _Filter by event category / tag_ — needs the wallet-api to tag events,
  which we don't currently do.

`markets.length > 1` is the simplest, robust heuristic. The case where an
event has 1 closed + 1 active market is intentionally folded into the
"multi" branch — list the active market; if no active markets, the existing
empty state covers it. The single-market branch therefore means "the event
is effectively one binary bet".

### D2. Default selection = highest-volume market

Considered alternatives:

- _First market as returned by Gamma_ — alphabetical / creation order, not
  intuitive for users.
- _Highest YES price (most likely to happen)_ — accurate to "favorite" but
  `YES` price is not always present or reliable in early markets.
- _Highest volume_ — proxies "most traded / most popular" which is the
  user's mental default ("show me the front-runner"). Same convention the
  Predict list uses.

Sort filter `active && !closed` first, then `volume` desc, then `markets[0]`
of that.

### D3. Tokens fetched per-market, not batched

Considered:

- _Include all child tokens in the detail response_ — fewer round trips
  but bloats the detail payload (32 teams × 2 token IDs each ≈ a few KB)
  and changes a public-facing endpoint's shape more invasively.
- _Lazy fetch on selection_ — first candidate has tokens cached after the
  initial click; switching is one round trip per switch. The betting flow
  is interactive and slow enough that one round trip is invisible.

Lazy fetch keeps the detail response shape small and aligns the
`/v1/prediction_markets/tokens` endpoint with its actual purpose (per
market, not per event). The breaking change is acceptable because the only
caller in production will be the new candidate switcher.

### D4. `PolymarketBettingPanel` rebinds on market change via `key`

Considered:

- _Manually reset `selectedOutcome` / `amount` / `usePolymarketBetting`
  state on prop change_ — works but easy to miss a piece of state.
- _Use `key={market.slug}` to force a remount_ — idiomatic React, no chance
  of stale state, no impact on first mount.

`key` is one line and the React-recommended way to reset a component's
state.

### D5. `getMarketTokens` upstream URL: `GET /markets/slug/{slug}`

Considered:

- _Keep using `/events/slug/{slug}` and find the matching market server
  side_ — extra work, still needs the new "market slug" semantic, and
  Gamma has a first-class `/markets/slug/{slug}` endpoint that returns a
  single market in one call.

Direct call to `/markets/slug/{slug}` is simpler and is the
documented Gamma endpoint for "get one market by slug".

## Risks / Trade-offs

- **Stale candidate list after a market is suspended mid-session** →
  Mitigation: existing error UI on the betting panel surfaces
  "Invalid outcome index" / 404. No new handling.
- **`getMarketTokens` semantic change breaks any other caller** →
  Mitigation: a `git grep` of `prediction_markets/tokens` shows only the
  new candidate switcher will call it. JSDoc note added.
- **Sort by `volume` exposes an in-wallet inconsistency if Gamma's volume
  units change** → Mitigation: the `formatPolymarketVolume` AI contract
  in `documents/tech/polymarket-betting.md` §6 already states Gamma's
  volume is already-scaled; we use the same convention.
- **Defaulting to the highest-volume market may bias users toward
  popular candidates** → Mitigation: by design; the alternative (e.g.
  alphabetical) is worse. Documented in the spec.

## Migration Plan

1. Merge + deploy `wallet-api` change (additive `markets[]` field on
   detail endpoint; semantic switch for `getMarketTokens`). No frontend
   change is required to keep the existing flow working, because the
   detail endpoint only gains fields and `getMarketTokens` is currently
   unused by the UI.
2. Merge + release `wallet` change (candidate list + panel rebind + new
   i18n key).
3. Monitor: 500 rate on `/v1/prediction_markets/detail` and
   `/v1/prediction_markets/tokens`; manual click-through of one
   multi-candidate event (e.g. _World Cup Winner_) on testflight.
4. Rollback: revert the wallet PR. The wallet-api change is additive on
   the detail side and only affects a caller that ships in the same
   release; reverting either side is safe.

## Open Questions

_None. All design decisions resolved during brainstorming._
