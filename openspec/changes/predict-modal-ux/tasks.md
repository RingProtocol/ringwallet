## 1. i18n

- [x] 1.1 Add `predictUnitPrice: 'Unit Price'` to `messages.en` in
      `src/i18n.tsx`.
- [x] 1.2 Add `predictUnitPrice: '单价'` to `messages.zh` in
      `src/i18n.tsx`.
      (Both were already added in the prior turn; verified by
      `grep`.)

## 2. `PolymarketBettingPanel` modal — price row

- [x] 2.1 Replace the `t('predictPrice')` row in the bet-confirm
      modal (around `PolymarketBettingPanel.tsx:202`) with a
      `t('predictUnitPrice')` row.
      (Already in place from the prior turn.)
- [x] 2.2 Render the value as
      `${parseFloat(outcomePrices[selectedOutcome]).toFixed(6)} USDC`
      (6 decimals, USDC suffix; fall back to `-` if missing).
      (Already in place.)

## 3. `PolymarketBettingPanel` modal — confirm button

- [x] 3.1 Add a local `const isProcessing = ['checking_allowance',
    'approving', 'signing', 'posting'].includes(state)` near the
      top of the component (after the destructured `state`).
- [x] 3.2 Change the confirm button's `disabled` prop from
      `state === 'posting'` to `isProcessing`.
- [x] 3.3 Change the confirm button's label from
      `state === 'posting' ? t('confirming') : t('confirm')` to
      `isProcessing ? t('confirming') : t('confirm')`.

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` for the wallet — must be clean.
- [x] 4.2 Run the existing vitest suite for the predict components
      (`npx vitest run test/unit/components/predict/`) — must stay
      green. (4/4 pass.)
- [ ] 4.3 Manual: open _World Cup Winner_, pick the first candidate,
      enter 9 USDC, open the review modal. Confirm the price row
      reads `单价: 0.000500 USDC` (or whatever the actual value is)
      and the confirm button shows `确认中` and is disabled the
      entire time the work is in flight. (Pending deploy.)
