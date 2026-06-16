## ADDED Requirements

### Requirement: Bet-confirm modal shows the CLOB unit price

The Predict bet-confirm modal SHALL show the outcome's CLOB unit
price in USDC with 6 decimal places (matching the on-chain USDC
decimals used by Polymarket CLOB), so the user can verify the
`amount / price == shares` math at a glance.

#### Scenario: Unit price is displayed in USDC

- **WHEN** the user opens the bet-confirm modal with a selected
  outcome whose `outcomePrices[selectedOutcome]` is, for example,
  `"0.0005"`
- **THEN** the modal MUST render a row whose label is the
  `predictUnitPrice` i18n key and whose value is
  `0.000500 USDC` (6-decimal, no percentage sign)

#### Scenario: Unit price is missing

- **WHEN** the selected outcome has no price (empty / undefined)
- **THEN** the modal MUST render a placeholder `-` (consistent with
  the existing fallback in the modal)

### Requirement: Confirm button reflects in-progress work

The bet-confirm modal's confirm button SHALL show the
`confirming` label and SHALL be disabled for **all** in-progress
states of the underlying betting flow, not just the `posting`
state. The idle / success / error states SHALL keep the button
enabled with the regular `confirm` label.

#### Scenario: Confirm during the in-progress flow

- **WHEN** the user has clicked "确认" and the betting flow is in
  any of the in-progress states
  (`checking_allowance`, `approving`, `signing`, `posting`)
- **THEN** the button MUST be disabled
- **AND** the button label MUST be the `confirming` i18n key
  (`确认中…` / `Confirming...`)

#### Scenario: Confirm when idle

- **WHEN** the betting flow is in the `idle` state
- **THEN** the button MUST be enabled
- **AND** the button label MUST be the `confirm` i18n key
  (`确认` / `Confirm`)

#### Scenario: Confirm after a failure

- **WHEN** the betting flow is in the `error` state
- **THEN** the button MUST be enabled again so the user can retry
  (the `error` row is shown above the actions)
