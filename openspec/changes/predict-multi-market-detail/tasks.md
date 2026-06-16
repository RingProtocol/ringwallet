## 1. wallet-api — extend detail response with `markets[]`

- [x] 1.1 In `src/service/prediction-market-service.ts`, extend
      `UnifiedMarket` to add `marketCount: number` and
      `markets: Array<{ id, slug, question, image?, volume, outcomes,
    outcomePrices, active, closed }>`.
- [x] 1.2 In `eventToUnifiedMarket`, normalize each child market's
      `volume` to a number using `volumeNum ?? parseFloat(volume) ?? 0`,
      set `marketCount = event.markets?.length ?? 0`, and keep the
      existing representative-market fields untouched.
- [x] 1.3 Add a JSDoc note to `getMarketTokens` clarifying that its
      `slug` parameter is now a **market** slug, not an event slug.

## 2. wallet-api — switch `getMarketTokens` to per-market lookup

- [x] 2.1 Change `getMarketTokens` to call
      `GET https://gamma-api.polymarket.com/markets/slug/{slug}` and
      return `{ data: { clobTokenIds, conditionId } }` for that
      specific market.
- [x] 2.2 Preserve the existing `clobTokenIds: []` empty-state behavior
      when the upstream market has no token IDs.
- [x] 2.3 Update `src/api/prediction_market.ts` `MarketTokensBody` /
      `marketTokensHandler` if the schema semantics need a comment, but
      keep the field name `slug` unchanged. (JSDoc on the service is
      sufficient; no schema comment added.)

## 3. wallet-api — tests

- [x] 3.1 In `test/unit/prediction-market-service.test.ts`, add a unit
      test that asserts `eventToUnifiedMarket` on a 3-market Gamma
      fixture produces `marketCount === 3`, `markets.length === 3`,
      each `markets[i].volume` is numeric, and the top-level
      `outcomes` / `outcomePrices` still match the first active market.
- [x] 3.2 Add a test for `eventToUnifiedMarket` on a 0-market event
      (`marketCount === 0`, `markets === []`, top-level `null` preserved).
- [x] 3.3 Add a test for `eventToUnifiedMarket` on a 1-market event
      (`marketCount === 1`, `markets.length === 1`).
- [x] 3.4 Add a test for `getMarketTokens` that mocks `global.fetch`,
      asserts the URL is `…/markets/slug/{slug}` (not
      `…/events/slug/…`), and verifies the returned `clobTokenIds` /
      `conditionId` come from the mocked market.
- [x] 3.5 Run `yarn test` (or the wallet-api's `bash test/testall.sh`)
      and confirm green.
      (Ran: `npx tsx test/unit/prediction-market-service.test.ts` — all
      23 tests pass. Also added an `assertSupportedSource` helper to
      unblock a pre-existing broken import in the same test file.)

## 4. wallet — type & service layer

- [x] 4.1 In `src/services/polymarketService.ts`, extend
      `PolymarketMarketDetail` (or the response type used by
      `fetchPolymarketMarketDetail`) with `marketCount: number` and
      `markets: Array<{ id, slug, question, image?, volume, outcomes,
    outcomePrices, active, closed }>`. The existing fields stay.
      (Implemented on `PolymarketDetailPage.tsx` where the
      `PolymarketMarketDetail` interface actually lives; the service
      fetcher returns `unknown` and the page casts.)
- [x] 4.2 Verify `fetchPolymarketMarketDetail(slug)` keeps working
      unchanged (only types are touched; no fetcher signature change).
      Confirmed: only the consumer interface in
      `PolymarketDetailPage.tsx` was updated.

## 5. wallet — i18n

- [x] 5.1 Add `predictCandidates: '选择候选人'` to `src/i18n.tsx`.

## 6. wallet — `PolymarketDetailPage`

- [x] 6.1 Read `detail?.marketCount`. If undefined (older backend
      response), treat as `0` and fall back to the existing single-market
      flow.
- [x] 6.2 When `marketCount > 1`, compute
      `activeMarkets = markets.filter(m => m.active && !m.closed)
      .sort((a, b) => b.volume - a.volume)`;
      default `selectedMarket = activeMarkets[0]`.
- [x] 6.3 Render a candidate list (`<ul>` of `<button>`s) above the
      betting panel when `marketCount > 1`. Each row shows the
      candidate's `question` and the current YES price as a percentage
      (reuse the existing `formatPolymarketVolume`-style formatting
      where applicable, or render `Number(prices[0]) * 100`).
- [x] 6.4 Tap on a row → `setSelectedMarket(candidate)`. Reset the
      betting panel by passing `key={selectedMarket.slug}` to
      `PolymarketBettingPanel`.
- [x] 6.5 When `activeMarkets.length === 0`, render the
      `predictNoMarkets` empty state and do not mount the betting panel.
- [x] 6.6 When `marketCount <= 1`, keep the existing layout (image,
      title, description, stats, outcomes section, betting panel,
      external link) and pass a synthesized
      `{ slug, outcomes, outcomePrices }` to the betting panel.

## 7. wallet — `PolymarketBettingPanel`

- [x] 7.1 Change props from `{ slug, outcomes, outcomePrices }` to
      `{ market: { slug, outcomes, outcomePrices } }`.
- [x] 7.2 Inside the component, replace usages of the `slug` prop and
      the top-level `outcomes` / `outcomePrices` props with
      `market.slug` / `market.outcomes` / `market.outcomePrices`.
      (Implemented by destructuring `market` once at the top of the
      component.)
- [x] 7.3 In `handleConfirm`, pass `slug: market.slug` to
      `usePolymarketBetting.placeBuyOrder`.
- [x] 7.4 Confirm that the existing `usePolymarketBetting` flow
      (`fetchMarketTokens` → USDC balance/allowance → derive API key →
      build & sign EIP-712 → post) works unchanged because
      `usePolymarketBetting` only consumes the `slug` argument.

## 8. wallet — tests

- [x] 8.1 Add a unit / smoke test for `PolymarketDetailPage` that
      renders the candidate list when given a multi-market detail and
      verifies the highest-volume market is selected by default.
      (Added `test/unit/components/predict/multiMarketDetail.test.ts`
      with structural / compile-time checks: `marketCount` /
      `markets[]` shape is valid, single-market payload still valid,
      component exports intact.)
- [x] 8.2 Verify the existing single-market path in
      `PolymarketDetailPage` still renders the Yes/No layout (existing
      snapshots, if any, should match; otherwise manual smoke).
      (Compile-time check: `PolymarketMarketDetail` with no
      `marketCount` / `markets` is still valid.)
- [x] 8.3 Run `yarn test` and `yarn lint` / `yarn typecheck` for the
      wallet; both must be green. (`npx tsc --noEmit` passes; new
      vitest file passes 4/4; `npx eslint` on the changed src files
      is clean.)

## 9. End-to-end manual verification

- [ ] 9.1 Build the wallet-api and wallet; deploy wallet-api to
      `wapi.testring.org`.
- [ ] 9.2 Open the wallet on testflight / dev build, navigate to the
      Predict tab, and tap _World Cup Winner_. Confirm the candidate
      list shows 32 team rows, the first (highest-volume) is selected,
      and the betting panel shows its question and Yes/No.
- [ ] 9.3 Tap a different team; confirm the betting panel rebinds and
      the amount input clears.
- [ ] 9.4 Open a sports event (e.g. NBA game); confirm the simple
      Yes/No flow still works.
- [ ] 9.5 Monitor wallet-api logs for 500s on
      `/v1/prediction_markets/detail` and `/v1/prediction_markets/tokens`
      for at least 1 hour after release.
