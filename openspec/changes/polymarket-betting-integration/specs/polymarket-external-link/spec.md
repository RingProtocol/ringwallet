## ADDED Requirements

### Requirement: User can open the original Polymarket event page

The system SHALL provide a visible control on the market detail page that opens the corresponding Polymarket event URL in an external browser.

#### Scenario: External link opened

- **WHEN** user taps the "Open on Polymarket" button on the market detail page
- **THEN** the system SHALL open `https://polymarket.com/event/{slug}` in a new browser tab
- **AND** use `noopener,noreferrer` for security

### Requirement: External link is accessible even before wallet is connected

The system SHALL show the external link regardless of whether the user has placed any bets or connected a wallet.

#### Scenario: View-only user

- **WHEN** a user is browsing market details without placing an order
- **THEN** the "Open on Polymarket" button SHALL remain visible and functional
