# Polymarket Betting — Architecture Decisions

This document captures the architectural decisions behind the Predict tab's
data pipeline. It exists so that future changes (human or AI) do not regress
to a known-broken approach: using the free-text `search` endpoint as if it
were a category filter.

The companion "non-negotiable" rules live in `../../CLAUDE.md` and
`../../AGENTS.md` under "Polymarket — Category Fetching Rules". This file
provides the rationale, evidence, and maintenance guidance.

## 1. Background

The Predict tab is a Polymarket feed rendered inside the wallet. Users see
a row of category tabs (`Hot`, `World Cup`, `Sports`, `Crypto`, `Politics`,
`World`, `Entertainment`, `Science`) and a paginated list of markets.

Two recurring failure modes prompted this document:

- The `World Cup` tab showed `No prediction markets found` during a live
  World Cup, even though polymarket.com listed hundreds of qualifying
  markets. Root cause: the tab used the `?search=` query, which is a
  full-text relevance endpoint, not a category filter.
- Volume numbers rendered as `$12` or `$37` for markets that should show
  millions. Root cause: the UI formatter divided by `1_000_000` for no
  documented reason. Polymarket's Gamma API does not document any such
  micro-unit.

## 2. Authoritative Sources

- Polymarket Gamma — Fetching Markets guide:
  https://docs.polymarket.com/market-data/fetching-markets
  - Explicitly recommends "By Tags" for category/sport filtering.
  - Demonstrates `events?tag_id=...&related_tags=true&order=volume`.
- Polymarket Gamma — Events list:
  https://docs.polymarket.com/api-reference/events/list-events
- Polymarket Gamma — Sports metadata:
  https://docs.polymarket.com/api-reference/sports/get-sports-metadata-information
  - Source for resolving `tag_id` from a sport name like `World Cup`.
- Polymarket Gamma — Tags:
  https://docs.polymarket.com/api-reference/tags/list-tags
  - General tag discovery; `?search=` is NOT a category filter.

The wallet-api README (`wallet-api/README.md`) records the same conclusions
in its `Polymarket Notes` section, including the volume-unit findings.

## 3. Data Flow (Current)

```
Predict tab
   │
   ▼
usePolymarketMarkets()               (src/hooks/usePolymarketMarkets.ts)
   │
   ├── worldCup category
   │      │
   │      ▼
   │   getWorldCupTagId()            (memoized)
   │      │   resolves via:
   │      ▼
   │   GET /v1/prediction_markets/sports
   │      │   proxies Gamma /sports
   │      ▼
   │   fetchPolymarketMarketsWithOptions({ tagId, relatedTags: true })
   │      │
   │      ▼
   │   POST /v1/prediction_markets
   │      │   proxies Gamma /events
   │      │   enforces server-side final sort by total volume
   │      ▼
   │   If page is empty on first page, fall back to keyword search pool
   │   (last-resort, see Section 5).
   │
   ├── other category
   │      │
   │      ▼
   │   fetchPolymarketMarkets(limit, offset, serverCategory)
   │      │
   │      ▼
   │   POST /v1/prediction_markets
   │
   ▼
   PolymarketListPage renders results
   - If list is empty AND no Hot fallback, shows `predictNoMarkets`.
   - If list is empty AND Hot fallback is available, shows a friendly
     banner ("暂无相关预测，已为你展示热门市场。") above the fallback.
```

## 4. Why tag_id, Not search

Gamma's `events?search=...` is a free-text relevance endpoint:

- It is biased by relevance scoring, not volume.
- Short queries like `world cup` lose to high-volume markets that contain
  more common terms.
- During the live 2025 World Cup window we observed 0 results even though
  polymarket.com was running 100+ World Cup events.

Gamma's `events?tag_id=...&related_tags=true` is the documented category
filter:

- It returns the union of the sport tag and its related tags (qualifiers,
  women's tournament, etc.).
- It can be combined with `order=volume&ascending=false` for a stable sort.
- It does not depend on title wording.

## 5. Why We Keep a Search Fallback

The `World Cup` flow is a hybrid:

1. Try `tag_id` first (correct path).
2. If the tag cannot be resolved (e.g. /sports endpoint down) OR the tag
   query returns 0 markets on the first page, fall back to a pooled
   keyword search using terms like `world cup`, `fifa world cup`, `wcq`,
   `world cup qualifier`, `fifa qualifier`, `uefa qualifiers`,
   `soccer world cup`, `international football`.
3. The fallback exists purely for resilience. The user-visible end state
   is sorted by total volume, deduplicated by `slug`.

The fallback is not a license to revert `World Cup` to `search`-only.
Removal of the `tag_id` step must be re-justified against current Gamma
docs before it can be merged.

## 6. Volume Units

- Gamma event-level `volume` / `volume24hr` are documented as plain
  numbers in the Events API reference.
- Gamma market-level `volume` is documented as a plain string, with
  `volumeNum` as the numeric companion.
- The wallet-ui treats these as already-scaled values. Do not divide by
  `1_000_000` in any formatter without first re-validating against
  official docs.

## 7. Empty State Policy

- When a category tab returns 0 markets, the UI shows the `predictNoMarkets`
  empty state and nothing else.
- **Do not** splice a `Hot` (or any other category's) market list into the
  current tab as a "fallback". That misleads users into betting on unrelated
  events (a previous attempt at this caused a Crime / Law market to appear
  under the `World Cup` tab).
- A future iteration may hide seasonal tabs entirely during off-season
  windows, but an in-tab fallback list is forbidden by the project rules.

## 8. When To Update This Document

- Gamma adds new endpoints or deprecates existing ones.
- A new category tab is introduced.
- A category stops resolving via `tag_id` reliably.
- Unit tests for the World Cup fallback need to be expanded.
