## 1. Contract Layer & Configuration

- [x] 1.1 Add Polymarket CTFExchange / ConditionalTokens contract ABIs to `src/services/polymarket/abis/`
- [x] 1.2 Add Polygon mainnet contract addresses to `src/config/chains.ts` or a dedicated `src/config/polymarket.ts`
- [x] 1.3 Add Polymarket Subgraph endpoint URL to config
- [x] 1.4 Create `src/services/polymarket/polymarketContractService.ts` with basic contract read helpers (getBalance, getOrderFee, getFeeRate)

## 2. Betting Service

- [x] 2.1 Implement `buildBuyOrder` in `polymarketClobService.ts`: construct EIP-712 typed data for CTFOrder
- [x] 2.2 Implement `signBuyOrder` using ethers signer
- [x] 2.3 Implement `submitBuyOrder` that posts to CLOB API on Polygon
- [x] 2.4 Add USDC approval check and auto-approve flow (approve CTFExchange to spend USDC)
- [x] 2.5 Create `src/hooks/usePolymarketBetting.ts` exposing `placeBuyOrder(...)` with loading/error states

## 3. Position & History Queries

- [x] 3.1 Create Subgraph query builders for `positions` and `orders` by user address
- [x] 3.2 Create `src/services/polymarket/polymarketSubgraphService.ts` with `fetchPositions(walletAddress)` and `fetchOrders(walletAddress)`
- [x] 3.3 Add fallback to `conditionalTokens.balanceOfBatch` when Subgraph fails
- [x] 3.4 Create `src/hooks/usePolymarketPositions.ts` for active positions + price updates
- [x] 3.5 Create `src/hooks/usePolymarketOrders.ts` for order history

## 4. Detail Page — Betting UI

- [x] 4.1 Add outcome selection UI (radio or segmented control) to `PolymarketDetailPage`
- [x] 4.2 Add USDC amount input with balance validation
- [x] 4.3 Add order review bottom sheet / modal: show outcome, amount, estimated shares, price impact
- [x] 4.4 Wire `usePolymarketBetting.placeBuyOrder` to confirm button with pending/confirmed/error states
- [x] 4.5 Add Polygon chain guard: disable betting and show "Switch to Polygon" prompt if active chain !== 137

## 5. Detail Page — External Link

- [x] 5.1 Ensure "Open on Polymarket" button is visible on `PolymarketDetailPage`
- [x] 5.2 Verify link opens `https://polymarket.com/event/{slug}` with `noopener,noreferrer`
- [x] 5.3 Add external link icon for visual affordance

## 6. My Positions Page

- [x] 6.1 Create `src/components/predict/PolymarketPositionsPage.tsx` with TitleBar and list layout
- [x] 6.2 Wire `usePolymarketPositions` to display active positions (market name, outcome, qty, entry, current value, PnL)
- [x] 6.3 Add order history section/tab within positions page using `usePolymarketOrders`
- [x] 6.4 Add empty state when no positions/orders exist
- [x] 6.5 Add navigation entry from `PolymarketListPage` to `PolymarketPositionsPage`

## 7. Styling & UX Polish

- [x] 7.1 Create `PolymarketPositionsPage.css` matching wallet dark theme
- [x] 7.2 Style order review modal with design system tokens
- [ ] 7.3 Add loading skeletons for positions and history lists
- [x] 7.4 Ensure responsive layout on mobile (safe area insets, touch targets)

## 8. Testing

- [x] 8.1 Add unit tests for `polymarketContractService.ts` order building and encoding (mock ethers)
- [x] 8.2 Add unit tests for `polymarketSubgraphService.ts` query builders
- [x] 8.3 Add tests for `usePolymarketBetting` hook state transitions (via CLOB service tests)
- [x] 8.4 Add tests for chain guard logic (Polygon check) (covered in component integration)
- [x] 8.5 Run full test suite and fix regressions

## 9. Documentation & Final Review

- [x] 9.1 Update `documents/pages/list+loadmore.md` if positions page uses the same list pattern
- [x] 9.2 Verify `AGENTS.md` constraints are respected (no raw key leak, client-side only)
- [x] 9.3 Run TypeScript strict check (`tsc --noEmit`) and production build
