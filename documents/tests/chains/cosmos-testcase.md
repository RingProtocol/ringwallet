# Cosmos wallet integration test case

> Test environment: Cosmos Hub Testnet (theta-testnet-001) via Tendermint RPC
> Framework: Vitest (unit/integration testing) + Playwright (E2E)

---

## TC-COSMOS-KEY: Key derivation test

### TC-COSMOS-KEY-01: Standard BIP44 path derived address

**Goal**: Verify that the BIP32/secp256k1 derived Cosmos address is consistent with standard wallets (Keplr, etc.)

**Prerequisite**: The addresses of masterSeed and the corresponding BIP44 standard wallet in the same path are known

**Input**:

```ts
const masterSeed = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
// Path: m/44'/118'/0'/0/0 (Cosmos Hub, coinType 118)
```

**Step**:

1. Call `plugin.deriveAccounts(masterSeed, 1, { coinType: 118, addressPrefix: 'cosmos' })`
2. Get the `address` in the return value
3. Compare with known test vector address

**Expected results**:

- Output Bech32 address starting with `cosmos1` (39-44 characters)
- Exactly the same address as the standard wallet under the same seed and path

**PASSING CRITERIA**: Address exactly matches

---

### TC-COSMOS-KEY-02: Multi-account derivation isolation

**Goal**: Different address_index derives different addresses, and the derivation is deterministic

**Step**:

1. Use the same `masterSeed` to derive index 0, 1, 2, 3, 4 respectively
2. Verify that all five addresses are different
3. Repeat the derivation of index 0 and verify that it is exactly the same as the first time

**Expected results**:

- 5 addresses are all different
- index=0, the two derivation results are 100% consistent

---

### TC-COSMOS-KEY-03: Different address prefix support

**Goal**: Verify support for different Cosmos SDK chain address prefixes

**Step**:

1. Derive addresses with different prefixes: `cosmos`, `osmo`, `juno`, `stars`
2. Verify each address has the correct prefix

**Expected results**:

- Each address starts with the specified prefix
- Addresses with different prefixes are different
- Same seed and path with different prefixes produce different addresses

---

### TC-COSMOS-KEY-04: Cross-chain key isolation

**Goal**: The private keys of Cosmos, EVM, Bitcoin derived from the same masterSeed are completely independent

**Step**:

1. Derive the Cosmos address from masterSeed (path `m/44'/118'/0'/0/0`)
2. Derive the EVM address from masterSeed (path `m/44'/60'/0'/0/0`)
3. Derive the Bitcoin address from masterSeed (path `m/44'/0'/0'/0/0`)
4. Verify that the private key bytes corresponding to the three are different

**Expected results**: The three sets of private keys are different from each other, without any byte overlap

---

### TC-COSMOS-KEY-05: Account metadata preservation

**Goal**: Verify that coinType and addressPrefix are preserved in account metadata

**Step**:

1. Derive an account with specific coinType and addressPrefix
2. Check the returned account's meta field

**Expected results**:

- `meta.coinType` equals the specified coinType (118)
- `meta.addressPrefix` equals the specified prefix ('cosmos')

---

## TC-COSMOS-ADDR: Address verification test

### TC-COSMOS-ADDR-01: Valid Cosmos address verification

**Step**: Pass the following addresses into the `isValidAddress()` function

**Input/Expected**:

| Address | Expectation | Description |
|---------|-------------|-------------|
| `cosmos1address6qa9wuw6n7r2n2qpllyf5epq5z6e5yq5` | ✅ true | Valid Cosmos address |
| `osmo1address6qa9wuw6n7r2n2qpllyf5epq5z6e5yq5` | ✅ true | Valid Osmosis address |
| `cosmos1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | ✅ true | Valid format (placeholder) |
| `0x71C7656EC7ab88b098defB751B7401B5f6d8976F` | ❌ false | EVM address |
| `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4` | ❌ false | Bitcoin address |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | ❌ false | Solana address |
| `cosmos1` | ❌ false | Too short |
| `cosmos1invalid` | ❌ false | Invalid Bech32 |
| `""` | ❌ false | Empty string |

---

### TC-COSMOS-ADDR-02: Send form address input verification

**Step**:

1. Open the sending form under the Cosmos chain
2. Enter an EVM address (`0x...`) in the `recipient` input box
3. Verify error message text
4. Clear and enter a Bitcoin address
5. Verify error message still displays
6. Clear and enter a valid `cosmos1...` address
7. Verify the error disappears and the amount input box is available

**Expected results**:

- "Please enter a valid Cosmos address" is displayed when entering a non-Cosmos address
- The error disappears after entering a valid Bech32 address

---

## TC-COSMOS-BAL: Balance query test

### TC-COSMOS-BAL-01: ATOM balance query (Testnet)

**Prerequisite**: Hold a Cosmos testnet address with ≥ 1 ATOM

**Step**:

1. Query the LCD REST endpoint: `/cosmos/bank/v1beta1/balances/{address}`
2. Parse the uatom balance from the response
3. Compare with expected value

**Expected results**:

- Returns balance in uatom (micro-ATOM, 1 ATOM = 1,000,000 uatom)
- Balance is a non-negative integer
- Response includes denom and amount fields

---

### TC-COSMOS-BAL-02: Zero balance address query

**Step**:

1. Generate a brand new Cosmos address (never received transactions)
2. Query balance via LCD endpoint

**Expected result**: Return `0` or empty balance array, no exception is thrown. UI shows balance `0 ATOM`

---

### TC-COSMOS-BAL-03: Multi-denom balance inquiry

**Prerequisite**: The address holds multiple tokens (ATOM and IBC tokens)

**Step**:

1. Query balances for an address with multiple token types
2. Parse each denom's balance

**Expected results**:

- All token balances are correctly returned
- Each balance includes denom and amount
- Tokens with zero balance may or may not be in the list

---

## TC-COSMOS-TX: Transaction Test

### TC-COSMOS-TX-01: Native ATOM transfer full process

**Prerequisites**:

- The sender holds ≥ 1 ATOM on Cosmos testnet
- The recipient is a valid Cosmos address

**Step**:

1. Record the initial balance of the sender and receiver
2. Construct a Cosmos SDK `MsgSend` transaction
3. Sign the transaction with sender's private key
4. Broadcast via Tendermint RPC `/broadcast_tx_sync` or `/broadcast_tx_commit`
5. Wait for transaction confirmation
6. Re-query the balances of both parties

**Expected results**:

- Transaction returns a hash
- The receiver's balance increases by the sent amount
- Sender balance reduced by sent amount + gas fee
- Transaction is visible on block explorer

---

### TC-COSMOS-TX-02: Transfer failed when balance is insufficient

**Step**:

1. Use an address with minimal ATOM balance
2. Try sending more ATOM than available

**Expected results**:

- Transaction fails with "insufficient funds" error
- No balance changes occur

---

### TC-COSMOS-TX-03: IBC token transfer

**Prerequisite**: The sender holds IBC tokens (e.g., OSMO transferred from Osmosis)

**Step**:

1. Query IBC token balance
2. Construct IBC transfer transaction (if supported)
3. Or verify IBC token balance is correctly displayed

**Expected results**:

- IBC token balances are correctly parsed and displayed
- Denom traces are handled correctly

---

### TC-COSMOS-TX-04: Transaction with invalid recipient address

**Step**:

1. Enter an EVM address (`0x...`) in the send form
2. Click Send

**Expected results**:

- Interception during the form verification phase
- Display error message "Invalid Cosmos address"
- No transaction is constructed

---

## TC-COSMOS-CHAIN: Chain switching test

### TC-COSMOS-CHAIN-01: EVM → Cosmos chain switching

**Step**:

1. Currently selected Ethereum Mainnet
2. Open the chain switch component (ChainSwitcher)
3. Select Cosmos Hub

**Expected results**:

- Chain icon updated to Cosmos
- Balance display changes to ATOM units
- Address display area displays `cosmos1...` format address
- Send form displays Cosmos address validation rules
- Explorer link updates to Mintscan or similar

---

### TC-COSMOS-CHAIN-02: Cosmos → Bitcoin chain switching

**Step**:

1. Cosmos Hub is currently selected
2. Switch to Bitcoin

**Expected results**:

- Balance unit changes to BTC
- Address display area displays Bitcoin `bc1q...` address
- Send form restores Bitcoin address verification rules
- API requests switch to Bitcoin API

---

### TC-COSMOS-CHAIN-03: Cosmos Hub ↔ Osmosis switching

**Step**:

1. Switch from Cosmos Hub to Osmosis

**Expected results**:

- RPC switches to Osmosis endpoint
- Balance re-queries (OSMO balance is different from ATOM)
- Address prefix changes from `cosmos1` to `osmo1`
- Chain label shows "Osmosis"

---

## TC-COSMOS-WALLET: Multi-wallet test

### TC-COSMOS-WALLET-01: Uniqueness of multi-account derived addresses

**Prerequisite**: Logged in, can derive new accounts through "Add Account"

**Step**:

1. View the Cosmos address (index 0) in the account list
2. Add a second account (index 1)

**Expected results**:

- The Cosmos addresses of the two accounts are completely different
- EVM and Bitcoin addresses of the two accounts are also different
- Balance display updates after switching accounts

---

### TC-COSMOS-WALLET-02: Address consistency after re-login

**Step**:

1. Record the Cosmos index=0 address in the current login state
2. Log out (clear memory seed)
3. Log in again using the same Passkey
4. Check the Cosmos index=0 address

**Expected results**: The address after logging in again is exactly the same as before logging out (deterministic derivation)

---

## TC-COSMOS-RPC: RPC stability test

### TC-COSMOS-RPC-01: Tendermint RPC reachability

**Step**:

1. Query Tendermint `/status` endpoint
2. Verify node info and sync status

**Expected results**:

- Returns node_info with network field
- Returns sync_info with latest_block_height
- Latest block height is a positive integer

---

### TC-COSMOS-RPC-02: LCD REST API timeout handling

**Step**:

1. Simulate LCD REST API request timeout
2. Trigger balance inquiry

**Expected results**:

- Balance display shows loading state
- After timeout, display error message
- Do not display NaN or undefined

---

### TC-COSMOS-RPC-03: Network identification

**Step**:

1. Query Tendermint `/status` endpoint
2. Verify the network field matches expected chain

**Expected results**:

- Returns correct network identifier (e.g., "theta-testnet-001" for testnet)
- Mismatched network should trigger warning

---

## TC-COSMOS-SEC: Security Test

### TC-COSMOS-SEC-01: Private keys are not leaked to storage

**Step**:

1. Complete an ATOM transfer process
2. Check LocalStorage, SessionStorage, IndexedDB
3. Check browser console logs

**Expected results**:

- No private keys are stored in any persistent storage
- No private key leaks in the console

---

### TC-COSMOS-SEC-02: Private key does not appear in network request

**Step**:

1. Open browser DevTools Network panel
2. Complete an ATOM transfer
3. Check the payload of all requests

**Expected results**:

- Private key is not included in any network request
- Only signed transaction data is broadcast

---

### TC-COSMOS-SEC-03: Bech32 address validation

**Step**:

1. Test address validation with various invalid Bech32 strings
2. Verify proper rejection of malformed addresses

**Expected results**:

- Invalid Bech32 addresses are rejected
- Proper error messages are displayed
- Checksum validation is performed

---

## Test execution instructions

### Unit Test (Vitest)

Scope of application: TC-COSMOS-KEY-*, TC-COSMOS-ADDR-*, TC-COSMOS-SEC-*

```bash
yarn test --grep "cosmos"
```

### Integration testing (Testnet)

Scope of application: TC-COSMOS-BAL-*, TC-COSMOS-TX-*, TC-COSMOS-RPC-*

Requires connection to Cosmos testnet RPC:

```bash
# Set testnet RPC URLs (optional, defaults provided)
export TEST_COSMOS_RPC_URL=https://cosmos-testnet-rpc.polkachu.com
export TEST_COSMOS_REST_URL=https://cosmos-testnet-api.polkachu.com

# Run tests
yarn test --grep "cosmos"
```

### E2E Testing (Playwright)

Scope of application: TC-COSMOS-CHAIN-*, TC-COSMOS-WALLET-*

```bash
yarn test:e2e --grep "cosmos"
```

---

## Test data reference

```typescript
// masterSeed used for testing (only for testing, no real assets included)
export const TEST_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

// Cosmos chain configuration
export const COSMOS_CONFIG = {
  COIN_TYPE: 118,
  ADDRESS_PREFIX: 'cosmos',
  TESTNET_RPC: 'https://cosmos-testnet-rpc.polkachu.com',
  TESTNET_LCD: 'https://cosmos-testnet-api.polkachu.com',
  TESTNET_CHAIN_ID: 'theta-testnet-001',
}

// Supported address prefixes
export const COSMOS_PREFIXES = {
  COSMOS_HUB: 'cosmos',
  OSMOSIS: 'osmo',
  JUNO: 'juno',
  STARGAZE: 'stars',
}

// Address format test vectors
export const COSMOS_ADDRESS_VECTORS = {
  VALID_COSMOS: 'cosmos1address6qa9wuw6n7r2n2qpllyf5epq5z6e5yq5',
  VALID_OSMO: 'osmo1address6qa9wuw6n7r2n2qpllyf5epq5z6e5yq5',
  EVM_FORMAT: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  BITCOIN: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
}

// Denom constants
export const COSMOS_DENOMS = {
  ATOM: 'uatom',           // micro-ATOM
  OSMO: 'uosmo',           // micro-OSMO
  IBC_ATOM: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
}
```
