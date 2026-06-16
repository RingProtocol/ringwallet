## 1. i18n

- [ ] 1.1 Add `predictUnitPrice: 'Unit Price'` to `messages.en` in
      `src/i18n.tsx`.
- [ ] 1.2 Add `predictUnitPrice: '单价'` to `messages.zh` in
      `src/i18n.tsx`.

## 2. `PolymarketBettingPanel` modal — price row

- [ ] 2.1 Replace the `t('predictPrice')` row in the bet-confirm
      modal (around `PolymarketBettingPanel.tsx:202`) with a
      `t('predictUnitPrice')` row.
- [ ] 2.2 Render the value as
      `${parseFloat(outcomePrices[selectedOutcome]).toFixed(6)} USDC`
      (6 decimals, USDC suffix; fall back to `-` if missing).

## 3. `PolymarketBettingPanel` modal — confirm button

- [ ] 3.1 Add a local `const isProcessing = ['checking_allowance',
    'approving', 'signing', 'posting'].includes(state)` near the
      top of the component (after the destructured `state`).
- [ ] 3.2 Change the confirm button's `disabled` prop from
      `state === 'posting'` to `isProcessing`.
- [ ] 3.3 Change the confirm button's label from
      `state === 'posting' ? t('confirming') : t('confirm')` to
      `isProcessing ? t('confirming') : t('confirm')`.

## 4. Verification

- [ ] 4.1 Run `npx tsc --noEmit` for the wallet — must be clean.
- [ ] 4.2 Run the existing vitest suite for the predict components
      (`npx vitest run test/unit/components/predict/`) — must stay
      green.
- [ ] 4.3 Manual: open _World Cup Winner_, pick the first candidate,
      enter 9 USDC, open the review modal. Confirm the price row
      reads `单价: 0.000500 USDC` (or whatever the actual value is)
      and the confirm button shows `确认中` and is disabled the
      entire time the work is in flight.
