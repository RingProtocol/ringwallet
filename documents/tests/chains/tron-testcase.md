# Tron wallet integration test case

> Test environment: Tron Local Anvil (chainId 728126428) or Tron Nile Testnet
> Framework: Vitest (unit/integration testing) + Playwright (E2E)

---

## TC-TRON-KEY: Key derivation test

### TC-TRON-KEY-01: Standard path derived address

**Goal**: Verify that the BIP32/secp256k1 derived Tron address is consistent with standard wallets (TronLink, etc.)

**Prerequisite**: The addresses of masterSeed and the corresponding BIP44 standard wallet in the same path are known

**Input**:

```ts
const masterSeed = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
// Path: m/44'/195'/0'/0/0 (Tron mainnet)
```

**Step**:

1. Call `plugin.deriveAccounts(masterSeed, 1)`
2. Get the `address` in the return value
3. Compare with known test vector address

**Expected results**:

- Output Base58 address starting with `T` (34 characters)
- Exactly the same address as the standard wallet under the same seed and path

**PASSING CRITERIA**: Address exactly matches

---

### TC-TRON-KEY-02: Multi-account derivation isolation

**Goal**: Different address_index derives different addresses, and the derivation is deterministic

**Step**:

1. Use the same `masterSeed` to derive index 0, 1, 2, 3, 4 respectively
2. Verify that all five addresses are different
3. Repeat the derivation of index 0 and verify that it is exactly the same as the first time

**Expected results**:

- 5 addresses are all different
- index=0, the two derivation results are 100% consistent

---

### TC-TRON-KEY-03: Tron address to EVM address conversion

**Goal**: Verify that Tron addresses can be converted to their underlying EVM-compatible hex addresses

**Step**:

1. Derive a Tron address from masterSeed
2. Call `tronAddressToHex(tronAddress)`
3. Compute EVM address from the same private key using ethers.js

**Expected results**:

- Returns a valid hex address starting with `0x` (42 characters)
- Hex address matches the EVM address derived from the same private key
- Conversion is deterministic and reversible

---

### TC-TRON-KEY-04: Cross-chain key isolation

**Goal**: The private keys of Tron, EVM, Bitcoin derived from the same masterSeed are completely independent

**Step**:

1. Derive the Tron address from masterSeed (path `m/44'/195'/0'/0/0`)
2. Derive the EVM address from masterSeed (path `m/44'/60'/0'/0/0`)
3. Derive the Bitcoin address from masterSeed (path `m/44'/0'/0'/0/0`)
4. Verify that the private key bytes corresponding to the three are different

**Expected results**: The three sets of private keys are different from each other, without any byte overlap

---

## TC-TRON-ADDR: Address verification test

### TC-TRON-ADDR-01: Valid Tron address verification

**Step**: Pass the following addresses into the `isValidAddress()` function

**Input/Expected**:

| Address | Expectation | Description |
|---------|-------------|-------------|
| `TJRabPrwbZy45sbavfcjPt5mBNSiU89uXz` | ✅ true | Valid Tron address |
| `THC4rDx3V1X8Yq1Y3z8Q3z9Q3z8Q3z9Q3z` | ✅ true | Valid Tron address format |
| `T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb` | ✅ true | Common Tron address |
| `0x71C7656EC7ab88b098defB751B7401B5f6d8976F` | ❌ false | EVM address |
| `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4` | ❌ false | Bitcoin address |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | ❌ false | Solana address |
| `TJRabPrwbZy45sbavfcjPt5mBNSiU89uX` | ❌ false | Too short (33 chars) |
| `TJRabPrwbZy45sbavfcjPt5mBNSiU89uXzz` | ❌ false | Too long (35 chars) |
| `INVALID` | ❌ false | Invalid format |
| `""` | ❌ false | Empty string |

---

### TC-TRON-ADDR-02: Send form address input verification

**Step**:

1. Open the sending form under the Tron chain
2. Enter an EVM address (`0x...`) in the `recipient` input box
3. Verify error message text
4. Clear and enter a Bitcoin address
5. Verify error message still displays
6. Clear and enter a valid `T...` Tron address
7. Verify the error disappears and the amount input box is available

**Expected results**:

- "Please enter a valid Tron address" is displayed when entering a non-Tron address
- The error disappears after entering a valid Base58 address starting with `T`

---

## TC-TRON-BAL: Balance query test

### TC-TRON-BAL-01: TRX balance query (Local Anvil)

**Prerequisite**: Hold an address with ≥ 1 TRX (funded via Anvil dev account)

**Step**:

1. Initialize provider with Tron RPC endpoint
2. Convert Tron address to hex format
3. Call `eth_getBalance` with hex address
4. Compare balance values

**Expected results**:

- Return value is a positive bigint, unit is wei (like EVM)
- Balance matches expected value from funding

---

### TC-TRON-BAL-02: Zero balance address query

**Step**:

1. Generate a brand new Tron address (never received transactions)
2. Convert to hex and call `getBalance`

**Expected result**: Return `0n`, no exception is thrown. UI shows balance `0 TRX`

---

### TC-TRON-BAL-03: TRX-20 token balance inquiry

**Prerequisite**: The address holds TRC-20 tokens (e.g., USDT on Tron)

**Step**:

1. Call `balanceOf(address)` on TRC-20 contract
2. Compare with on-chain data

**Expected result**: Return the correct token amount

---

## TC-TRON-TX: Transaction Test (Local Anvil)

### TC-TRON-TX-01: Native TRX transfer full process

**Prerequisites**:

- Local Anvil running with Tron chainId (728126428)
- The sender holds ≥ 1 TRX (funded from Anvil dev account)
- The recipient is a new address

**Step**:

1. Derive sender and receiver Tron addresses from masterSeed
2. Convert both addresses to hex format
3. Fund sender hex address from Anvil dev account
4. Record initial balances
5. Create EVM transaction using sender's private key and receiver's hex address
6. Broadcast transaction
7. Wait for confirmation
8. Verify balance changes

**Expected results**:

- Transaction is mined successfully (status = 1)
- Receiver's balance increases by the sent amount
- Sender's balance decreases by sent amount + gas fee

---

### TC-TRON-TX-02: Transfer failed when balance is insufficient

**Step**:

1. Use an address with minimal TRX balance
2. Try sending more TRX than available

**Expected results**:

- Throws an error, message contains "insufficient funds"
- No transactions are broadcast

---

### TC-TRON-TX-03: Address conversion consistency in transactions

**Goal**: Verify that Tron address to hex conversion works correctly in transaction flow

**Step**:

1. Derive a Tron address
2. Convert to hex using `tronAddressToHex()`
3. Verify the hex address can be used in EVM-compatible transactions
4. Verify balance queries work with hex address

**Expected results**:

- Hex address is valid EVM format (0x + 40 hex chars)
- Transactions to hex address are processed correctly
- Balance queries return correct values

---

### TC-TRON-TX-04: Transaction with invalid recipient address

**Step**:

1. Enter an EVM address (`0x...`) in the send form (without Tron conversion)
2. Click Send

**Expected results**:

- Interception during the form verification phase
- Display error message "Invalid Tron address"
- No transaction is constructed

---

## TC-TRON-CHAIN: Chain switching test

### TC-TRON-CHAIN-01: EVM → Tron chain switching

**Step**:

1. Currently selected Ethereum Mainnet
2. Open the chain switch component (ChainSwitcher)
3. Select Tron

**Expected results**:

- Chain icon updated to Tron
- Balance display changes to TRX units
- Address display area displays `T...` format Tron address
- Send form displays Tron address validation rules
- Explorer link updates to Tronscan

---

### TC-TRON-CHAIN-02: Tron → Solana chain switching

**Step**:

1. Tron is currently selected
2. Switch to Solana Mainnet

**Expected results**:

- Balance unit changes to SOL
- Address display area displays Solana Base58 address
- Send form restores Solana address verification rules
- API requests are no longer sent to Tron RPC

---

## TC-TRON-WALLET: Multi-wallet test

### TC-TRON-WALLET-01: Uniqueness of multi-account derived addresses

**Prerequisite**: Logged in, can derive new accounts through "Add Account"

**Step**:

1. View the Tron address (index 0) in the account list
2. Add a second account (index 1)

**Expected results**:

- The Tron addresses of the two accounts are completely different
- EVM and Solana addresses of the two accounts are also different
- Balance display updates after switching accounts

---

### TC-TRON-WALLET-02: Address consistency after re-login

**Step**:

1. Record the Tron index=0 address in the current login state
2. Log out (clear memory seed)
3. Log in again using the same Passkey
4. Check the Tron index=0 address

**Expected results**: The address after logging in again is exactly the same as before logging out (deterministic derivation)

---

## TC-TRON-RPC: RPC stability test

### TC-TRON-RPC-01: RPC timeout handling

**Step**:

1. Simulate RPC request timeout
2. Trigger balance inquiry

**Expected results**:

- Balance display shows loading state
- After timeout, display error message
- Do not display NaN or undefined

---

### TC-TRON-RPC-02: Chain ID verification

**Step**:

1. Connect to Tron RPC endpoint
2. Call `eth_chainId`
3. Verify the returned chain ID

**Expected results**:

- Returns Tron chain ID: 728126428 (0x2b6653dc)
- Mismatched chain ID should trigger warning or error

---

## TC-TRON-SEC: Security Test

### TC-TRON-SEC-01: Private keys are not leaked to storage

**Step**:

1. Complete a TRX transfer process
2. Check LocalStorage, SessionStorage, IndexedDB
3. Check browser console logs

**Expected results**:

- No private keys are stored in any persistent storage
- No private key leaks in the console

---

### TC-TRON-SEC-02: Private key does not appear in network request

**Step**:

1. Open browser DevTools Network panel
2. Complete a TRX transfer
3. Check the payload of all requests

**Expected results**:

- Private key is not included in any network request
- Only signed transaction data is sent

---

## Test execution instructions

### Unit Test (Vitest)

Scope of application: TC-TRON-KEY-*, TC-TRON-ADDR-*

```bash
yarn test --grep "tron"
```

### Integration testing (Local Anvil)

Scope of application: TC-TRON-BAL-*, TC-TRON-TX-*, TC-TRON-RPC-*

Requires Anvil to be running with Tron chainId:

```bash
# Start Anvil with Tron chainId
anvil --chain-id 728126428 --port 8547

# Run tests
SKIP_TRON_LOCAL=0 yarn test --grep "tron"
```

### E2E Testing (Playwright)

Scope of application: TC-TRON-CHAIN-*, TC-TRON-WALLET-*, TC-TRON-SEC-*

```bash
yarn test:e2e --grep "tron"
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

// Anvil dev account #0 — public test key, safe for local fork only
export const ANVIL_DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

// Tron chain configuration
export const TRON_CONFIG = {
  CHAIN_ID: 728126428,
  RPC_PORT: 8547,
  ADDRESS_PREFIX: 'T',
  COIN_TYPE: 195,
}

// Address format test vectors
export const TRON_ADDRESS_VECTORS = {
  VALID_1: 'TJRabPrwbZy45sbavfcjPt5mBNSiU89uXz',
  VALID_2: 'THC4rDx3V1X8Yq1Y3z8Q3z9Q3z8Q3z9Q3z',
  EVM_FORMAT: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  BITCOIN: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
}
```
