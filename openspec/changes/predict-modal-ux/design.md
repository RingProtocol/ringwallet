## Context

The Predict tab's bet-confirm modal currently:

1. Shows the price as `(parseFloat(price) * 100).toFixed(1) + '%'`. For
   very low prices this rounds `0.05%` to `0.1%`, which doesn't match
   the math used by `estimatedShares = (usdc / price).toFixed(2)` and
   the CLOB `makerAmount` / `takerAmount` ratio. The underlying order
   is signed with the raw price and is correct; only the display is
   off.
2. Wires the confirm button to `state === 'posting'` for both label
   and `disabled`, but the work flow has four in-progress states
   (`checking_allowance` → `approving` → `signing` → `posting`). The
   first three states let the user re-tap "确认", which either
   re-prompts the biometric (in `handleConfirm`'s
   `PasskeyService.verifyIdentity`) or feels like the click is
   ignored because the on-chain work is already in flight.

Both issues live entirely in the wallet frontend
(`PolymarketBettingPanel.tsx` and `i18n.tsx`). The wallet-api, the
CLOB order construction, and the biometric flow are not changing.

## Goals / Non-Goals

**Goals:**

- Make the modal's price row reflect the actual CLOB unit price
  (`0.0005 USDC`, not `0.1%`).
- Make the confirm button a single source of truth: "确认" when
  idle, "确认中" + disabled for any of the four in-progress states.

**Non-Goals:**

- No change to the CLOB order construction, signer flow, or
  biometric gate.
- No new translations beyond the new `predictUnitPrice` key; the
  existing `confirming` key is reused for the in-progress label.
- No change to the `predictPrice` key (it stays in case other code
  uses it; can be removed in a follow-up if it ends up unused).
- No change to the modal's overall layout or field set.

## Decisions

### D1. Show price in USDC, 6 decimals

Considered:

- _Show 2-3 decimal percent (e.g. `0.05%`)_ — still loses precision
  for sub-`0.01%` longshots and ties display to a percentage framing
  the user has to mentally invert.
- _Show price-per-share in USDC with 6 decimals (`0.000500 USDC`)_ —
  matches the on-chain USDC decimals (Polymarket CLOB uses 6
  decimals, see `POLYMARKET_DECIMALS` in
  `polymarketClobService.ts`), exactly mirrors what the CLOB order
  signs, and the user can read it as "I pay 0.0005 USDC for each
  share I get".

The 6-decimal USDC view is the CLOB's native representation and is
the only one that makes `amount * price == shares` obviously correct
at a glance.

### D2. Treat all in-progress states as "确认中"

Considered:

- _Show distinct labels per state (`approving` → "批准中", `signing`
  → "签名中", `posting` → "提交中")_ — most informative, but adds 3
  new i18n keys and the user-facing value is marginal because
  USDC approval and EIP-712 sign are sub-second on Polygon.
- _Single "确认中" for all four states_ — reuses the existing
  `confirming` key, keeps the modal copy tight, and is exactly what
  the user asked for.

Single label is the minimal change that solves the reported bug.

### D3. Define in-progress via a single `isProcessing` predicate

Considered:

- _Inline `['checking_allowance','approving','signing','posting'].includes(state)`_ — verbose, easy to drift.
- _Add a `isProcessing` getter on `usePolymarketBetting`_ — cleaner
  long-term, but the hook has many call sites and the only consumer
  is this modal; not worth a refactor.
- _Compute a local `isProcessing` constant in the component_ — zero
  blast radius, single source of truth inside the file that owns
  the button.

Local `const` in the component. If another caller needs the same
predicate, lift it then.

## Risks / Trade-offs

- **Risk**: a user who taps "确认" rapidly during `signing` will
  see the button briefly show "确认中" instead of "确认". Mitigation:
  this is the desired behavior — the previous behavior re-triggered
  the biometric prompt, which is worse.
- **Risk**: `confirming` is already used elsewhere (e.g. for token
  approval) with the same text. Mitigation: the meaning is
  consistent — "this action is being processed".
- **Risk**: for prices that round to `0.000000 USDC` (i.e. price <
  0.0000005, theoretically possible on a long tail), the displayed
  price will read `0.000000 USDC` and look wrong. Mitigation: 6
  decimals is the CLOB's precision; values below that are not
  representable in the order anyway, and Polymarket markets with
  less than 1 bp price effectively never get clicked through.

## Migration Plan

1. Merge + release as a single PR. Wallet only.
2. Smoke-check on testflight / dev: open _World Cup Winner_, pick
   the first candidate, enter 9 USDC, open the review modal,
   confirm the price reads `0.000500 USDC` (or whatever the actual
   value is), and confirm the button is disabled + shows "确认中"
   the entire time the work is in flight.
3. Rollback: revert the single wallet PR; no data migration needed.

## Open Questions

_None._
