## ADDED Requirements

### Requirement: User can view active Polymarket positions

The system SHALL display all active positions for the current wallet address on Polymarket.

#### Scenario: Positions page loads successfully

- **WHEN** user navigates to the "My Positions" page from the prediction markets section
- **THEN** the system SHALL query and display a list of active markets where the user holds outcome tokens
- **AND** for each position show the market question, outcome held, quantity, average entry price, current estimated value, and PnL

#### Scenario: Subgraph is unavailable

- **WHEN** the Subgraph query fails
- **THEN** the system SHALL attempt to query balances directly from the ConditionalTokens contract
- **AND** display a warning that data may be incomplete or delayed

#### Scenario: No active positions

- **WHEN** the user has no active Polymarket positions
- **THEN** the system SHALL display an empty state with a prompt to explore markets

### Requirement: User can view order history

The system SHALL display historical orders (filled and pending) for the current wallet address.

#### Scenario: Order history loads

- **WHEN** user views the order history section
- **THEN** the system SHALL display past orders with market name, outcome, side (buy/sell), amount, price, transaction hash, and timestamp
- **AND** orders SHALL be sorted by timestamp descending

#### Scenario: Order is pending

- **WHEN** an order transaction is submitted but not yet confirmed
- **THEN** the system SHALL display it in the history with a "Pending" status
- **AND** update the status upon confirmation

### Requirement: Position values update with latest market prices

The system SHALL use the latest outcome prices from the market data to estimate current position values.

#### Scenario: Price update

- **WHEN** market price data is refreshed
- **THEN** the system SHALL recalculate the estimated value and PnL for each active position
- **AND** update the display without requiring a page refresh
