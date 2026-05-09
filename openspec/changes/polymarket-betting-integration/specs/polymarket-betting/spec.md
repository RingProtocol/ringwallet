## ADDED Requirements

### Requirement: User can place a buy order on a Polymarket outcome

The system SHALL allow the user to select an outcome, enter a USDC amount, and submit a buy order on Polygon chain.

#### Scenario: Successful buy order

- **WHEN** user is on the Polymarket detail page for an active market
- **AND** the wallet active chain is Polygon
- **AND** user selects an outcome and enters a valid USDC amount
- **AND** user confirms the transaction
- **THEN** the system SHALL sign and broadcast a buy transaction to the CTFExchange contract
- **AND** display a pending state
- **AND** upon confirmation, show the transaction hash and update the user's position

#### Scenario: Active chain is not Polygon

- **WHEN** user attempts to place an order while the active chain is not Polygon
- **THEN** the system SHALL prompt the user to switch to Polygon before proceeding
- **AND** disable the confirm button until the chain is switched

#### Scenario: Insufficient USDC balance

- **WHEN** user enters a USDC amount greater than their wallet balance
- **THEN** the system SHALL display an error indicating insufficient balance
- **AND** prevent transaction submission

### Requirement: Order confirmation shows estimated outcome and price impact

The system SHALL display an order review screen before signing that includes the estimated number of outcome tokens, price per share, and maximum potential return.

#### Scenario: Review screen displayed

- **WHEN** user proceeds to confirm an order
- **THEN** the system SHALL show the selected outcome, USDC amount, estimated shares, and worst-case execution price
- **AND** require explicit user confirmation before signing

### Requirement: System handles transaction failures gracefully

The system SHALL catch and display user-friendly error messages for common transaction failures.

#### Scenario: Transaction reverted

- **WHEN** a submitted transaction is reverted on-chain
- **THEN** the system SHALL display the revert reason if parseable
- **AND** allow the user to retry

#### Scenario: RPC timeout

- **WHEN** the transaction broadcast exceeds 30 seconds without confirmation
- **THEN** the system SHALL show a timeout message
- **AND** inform the user that the transaction may still complete and to check their activity later
