## ADDED Requirements

### Requirement: Detail page surfaces all child markets for multi-market events

The Predict detail page SHALL list every child market of the underlying
event when the event contains more than one market, so the user can
identify which candidate they are betting on.

#### Scenario: Multi-market event renders candidate list

- **WHEN** the detail page loads an event whose `markets[]` length is
  greater than 1
- **THEN** the page MUST render one selectable row per market, where
  each row shows the market's `question` and current `YES` price as a
  percentage
- **AND** the betting panel MUST bind to the first row in the list

#### Scenario: Default selection is the highest-volume market

- **WHEN** the candidate list is rendered
- **THEN** rows MUST be sorted by `volume` descending
- **AND** only markets with `active === true` and `closed === false`
  MUST be included
- **AND** the betting panel MUST bind to the first row of that sorted
  list

#### Scenario: Switching a candidate rebinds the betting panel

- **WHEN** the user taps a different row in the candidate list
- **THEN** the betting panel MUST show that market's `outcomes` and
  `outcomePrices`
- **AND** the betting panel's `selectedOutcome`, `amount` input, and
  internal betting state MUST be reset

#### Scenario: No active markets after filtering

- **WHEN** filtering yields zero active, non-closed markets
- **THEN** the page MUST render the existing `predictNoMarkets` empty
  state
- **AND** it MUST NOT render the betting panel

### Requirement: Single-market events keep the current Yes/No flow

The Predict detail page SHALL keep the existing single-market Yes/No
behavior for events that contain at most one market.

#### Scenario: Single-market event renders the existing Yes/No panel

- **WHEN** the detail page loads an event whose `markets[]` length is
  at most 1
- **THEN** the page MUST NOT render a candidate list
- **AND** the betting panel MUST receive outcomes and prices derived
  from the existing top-level fields on the detail response

### Requirement: Backend detail response includes every child market

The `wallet-api` `getEventDetail` response MUST include, alongside the
existing top-level representative fields, a `markets[]` array with one
entry per child market and a `marketCount` integer.

#### Scenario: Multi-market event response shape

- **WHEN** the upstream event has N markets (N > 1)
- **THEN** the response MUST set `marketCount` to N
- **AND** `markets[]` MUST contain N objects, each with at least `id`,
  `slug`, `question`, `outcomes`, `outcomePrices`, `volume` (numeric),
  `active`, `closed`
- **AND** existing top-level fields (representative market values,
  event-level volume / image / endDate) MUST remain unchanged so other
  callers are not broken

#### Scenario: Zero-market event response shape

- **WHEN** the upstream event has zero markets
- **THEN** `marketCount` MUST be 0
- **AND** `markets[]` MUST be empty
- **AND** the existing top-level shape (currently `data: null`) MUST be
  preserved

### Requirement: Tokens endpoint returns tokens for a single market

The `wallet-api` `getMarketTokens` endpoint MUST accept a **market** slug
and return the CLOB token IDs for that market only.

#### Scenario: Market slug lookup

- **WHEN** the request body contains `{ source: 'polymarket', slug }`
  where `slug` is a Polymarket market slug
- **THEN** the endpoint MUST call
  `GET https://gamma-api.polymarket.com/markets/slug/{slug}`
- **AND** MUST return `{ data: { clobTokenIds, conditionId } }` for
  that market

#### Scenario: Market with no token IDs

- **WHEN** the upstream market has no `clobTokenIds`
- **THEN** the endpoint MUST return `{ data: { clobTokenIds: [],
conditionId } }` with HTTP 200
