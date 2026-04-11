# Bitcoin wallet integration test case

> Test environment: Bitcoin Testnet (or Signet)
> Framework: Vitest (unit/integration testing) + Playwright (E2E)

---

## TC-BTC-KEY: Key derivation test

### TC-BTC-KEY-01: Standard path derived address

**Goal**: Verify that the BIP32/secp256k1 derived P2WPKH address is consistent with the third-party wallet

**Prerequisite**: The addresses of masterSeed and the corresponding BIP44 standard wallet (such as Electrum/Sparrow) in the same path are known

**enter**:

```ts
const masterSeed = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
// Path: m/44'/0'/0'/0/0 (mainnet P2WPKH)
```

**step**:

1. Call `BitcoinKeyService.deriveAccountNode(masterSeed, false, 0)`
2. Get the `address` in the return value
3. Compare with known test vector address

**Expected results**:

- Output Bech32 format address (starting with `bc1q`)
- Exactly the same address as the standard wallet under the same seed and path

**PASSING CRITERIA**: Address exactly matches

---

### TC-BTC-KEY-02: Multi-account derivation isolation

**Goal**: Different address_index derives different addresses, and the certainty is reproducible

**step**:

1. Use the same `masterSeed` to derive index 0, 1, 2, 3, 4 respectively.
2. Verify that two of the five addresses are different
3. Repeat the derivation of index 0 and verify that it is exactly the same as the first time.

**Expected results**:

- 5 addresses all different
- index=0, the two derivation results are 100% consistent

---

### TC-BTC-KEY-03: EVM/Solana/Bitcoin key isolation

**Goal**: The private keys of the three chains derived from the same masterSeed are completely independent

**step**:

1. Derive the EVM address from masterSeed (path `m/44'/60'/0'/0/0`)
2. Derive the Solana address from masterSeed (path `m/44'/501'/0'/0'`)
3. Derive the Bitcoin address from masterSeed (path `m/44'/0'/0'/0/0`)
4. Verify that the private key bytes corresponding to the three are different

**Expected results**: The three sets of private keys are different from each other, without any byte overlap.

---

### TC-BTC-KEY-04: Illegal masterSeed processing

**Goal**: There should be clear errors when entering exception seeds and should not fail silently

**step**:

1. Pass in empty `Uint8Array(0)`
2. Pass in a seed whose length is less than 16 bytes
3. Pass in all zeros 32 bytes (`Uint8Array(32).fill(0)`)

**Expected results**:

- The first two cases: throw an explicit error (such as `InvalidSeedLength`)
- all-zero seed: technically valid (BIP32 allows), should be derived normally, but the business layer should be warned

---

### TC-BTC-KEY-05: Testnet path is isolated from Mainnet path

**Goal**: When Testnet uses `coin_type = 1'', the address is completely different from Mainnet

**step**:

1. Use the same masterSeed to derive the Mainnet address (`m/44'/0'/0'/0/0`) and Testnet address (`m/44'/1'/0'/0/0`) respectively.
2. Verify that the two are different
3. Verify that the Mainnet address starts with `bc1q` and the Testnet address starts with `tb1q`

**Expected results**:

- Different addresses
- Prefixes are `bc1q` and `tb1q` respectively

---

## TC-BTC-ADDR: Address verification test

### TC-BTC-ADDR-01: Valid Bitcoin address verification

**Step**: Pass the following address into the `isValidBitcoinAddress()` function

**Input/Expected**:

| Address                                        | Expectation | Description                                |
| ---------------------------------------------- | ----------- | ------------------------------------------ |
| `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`   | ✅ true     | Valid P2WPKH address (BIP173 test vector)  |
| `bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq`   | ✅ true     | Common P2WPKH addresses                    |
| `tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx`   | ✅ true     | Valid Testnet P2WPKH address               |
| `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`           | ❌ false    | P2PKH (currently only P2WPKH is supported) |
| `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy`           | ❌ false    | P2SH (currently only P2WPKH is supported)  |
| `0x1234567890abcdef1234567890abcdef12345678`   | ❌ false    | EVM format address                         |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | ❌ false    | Solana format address                      |
| `invalid-address-string`                       | ❌ false    | random string                              |
| `""`                                           | ❌ false    | empty string                               |
| `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5`   | ❌ false    | Checksum error (last digit changed)        |

---

### TC-BTC-ADDR-02: Send form address input verification

**step**:

1. Open the sending form under the Bitcoin chain
2. Enter the EVM address (`0x...`) in the `recipient` input box
3. Verify error message text
4. Clear and enter the Solana address
5. There are still error messages during verification
6. Clear and enter the legal `bc1q...` address
7. The verification error disappears and the amount input box is available.

**Expected results**:

- "Please enter a valid Bitcoin address" is displayed when entering a non-Bitcoin address
- The error disappears after entering a valid Bech32 address

---

## TC-BTC-BAL: Balance query test

### TC-BTC-BAL-01: BTC balance inquiry (Testnet)

**Prerequisite**: Hold a Testnet address and have deposited ≥ 0.001 tBTC through Faucet

**step**:

1. Initialize `BitcoinService('https://blockstream.info/testnet/api', testnetNetwork)`
2. Call `getUtxos(address)` and accumulate `sum(utxo.value)`
3. At the same time, query the same address at [mempool.space/testnet](https://mempool.space/testnet)

**Expected results**:

- UTXO accumulated value is consistent with the balance displayed in mempool.space
- The return value unit is satoshis (integer), and the UI layer converts it to BTC for display

---

### TC-BTC-BAL-02: Zero balance address query

**step**:

1. Generate a brand new Bitcoin Testnet address (never received transactions)
2. Call `getUtxos(newAddress)`

**Expected results**: Return an empty array `[]`, no exception is thrown. UI shows balance `0 BTC`

---

### TC-BTC-BAL-03: Multi-UTXO address balance aggregation

**Precondition**: An address has received more than 3 small amounts of tBTC multiple times.

**step**:

1. Call `getUtxos(address)`
2. Verify that the number of UTXOs returned is ≥ 3
3. Verify that `sum(utxo.value)` is consistent with the total balance on the chain

**Expected results**:

- UTXO list contains all unspent outputs
- The accumulated value is correct

---

## TC-BTC-UTXO: UTXO and currency selection test

### TC-BTC-UTXO-01: Simple currency selection-exact matching

**enter**:

```ts
const utxos = [
  { txid: 'aaa...', vout: 0, value: 50000 },
  { txid: 'bbb...', vout: 1, value: 30000 },
  { txid: 'ccc...', vout: 0, value: 20000 },
]
const targetAmount = 50000 // sats
```

**Step**: Execute currency selection logic

**Expected results**: The first UTXO (50000 sats) is selected, no additional UTXO is required

---

### TC-BTC-UTXO-02: Simple currency selection—requires multiple UTXOs

**enter**:

```ts
const utxos = [
  { txid: 'aaa...', vout: 0, value: 30000 },
  { txid: 'bbb...', vout: 1, value: 30000 },
  { txid: 'ccc...', vout: 0, value: 20000 },
]
const targetAmount = 50000 // sats
```

**Step**: Execute currency selection logic

**Expected results**: Select the first two UTXOs (total 60000 sats), generate change

---

### TC-BTC-UTXO-03: Reject when UTXO is insufficient

**enter**:

```ts
const utxos = [{ txid: 'aaa...', vout: 0, value: 1000 }]
const targetAmount = 50000
```

**Expected result**: `Insufficient balance` error thrown

---

## TC-BTC-FEE: Handling fee and change test

### TC-BTC-FEE-01: Fee estimation interface

**step**:

1. Call `bitcoinService.getFeeRate()`
2. Verify that the return value is a positive number (sat/vByte)

**Expected results**:

- Return value > 0, type `number`
- The value is within a reasonable range (Testnet typically 1–20 sat/vByte)

---

### TC-BTC-FEE-02: Change is greater than dust threshold

**enter**:

- Total UTXO amount: 100,000 sats
- Transfer amount: 50,000 sats
- Estimated handling fee: 500 sats

**Expected results**:

- Change = 100,000 - 50,000 - 500 = 49,500 sats
- 49,500 > 546（dust threshold）
- Transaction contains 2 outputs: destination address + change address

---

### TC-BTC-FEE-03: Change less than dust threshold

**enter**:

- Total UTXO: 50,600 sats
- Transfer amount: 50,000 sats
- Estimated handling fee: 500 sats

**Expected results**:

- Change = 50,600 - 50,000 - 500 = 100 sats
- 100 < 546（dust threshold）
- The transaction only contains 1 output (change is incorporated into the handling fee)
- Actual handling fee = 600 sats

---

### TC-BTC-FEE-04: Handling fee + amount > Reject when balance

**enter**:

- Total UTXO amount: 50,000 sats
- Transfer amount: 50,000 sats
- Estimated handling fee: 500 sats

**Expected results**:

- Insufficient total amount detected when structuring transaction (50,000 < 50,000 + 500)
- Throws an error, prompting the user that the balance is insufficient to pay the handling fee

---

## TC-BTC-TX: Transaction Test (Testnet)

### TC-BTC-TX-01: The whole process of BTC transfer

**Prerequisites**:

- The sender holds ≥ 0.001 tBTC on Testnet
- The recipient is a new address

**step**:

1. Record the initial balance of the sender and receiver (UTXO accumulation)
2. Call `bitcoinService.buildAndSignTransaction({ fromAddress, toAddress, amountSats: 10000, masterSeed, addressIndex: 0 })`
3. Call `bitcoinService.broadcast(txHex)`
4. Wait for transaction confirmation (at least 1 confirmation)
5. Re-query the balances of both parties

**Expected results**:

- `broadcast` returns a 64 character hex txid
- The receiver's balance increases by 10,000 sats
- Sender balance reduced by 10,000 + fee sats
- txid can be found at mempool.space/testnet

---

### TC-BTC-TX-02: Transfer failed when balance is insufficient

**step**:

1. Use an address with only 1,000 sats
2. Try sending 50,000 sats

**Expected results**:

- Throws an error, the message contains a description of insufficient balance
- No transactions are broadcast

---

### TC-BTC-TX-03: Send the entire balance (sweep coins)

**Precondition**: The sender holds a small amount of tBTC (such as 50,000 sats) and only 1 UTXO

**step**:

1. Query the current balance (= UTXO value)
2. Calculate the amount that can be sent = UTXO value - estimated handling fee
3. Construct and send the amount

**Expected results**:

- Transaction has only 1 output (no change)
- The sender's balance returns to zero
- The receiver receives UTXO value - fee

---

### TC-BTC-TX-04: PSBT signature verification

**Goal**: Verify the correctness of PSBT construction and signature

**step**:

1. Construct a transaction but do not broadcast it
2. Extract the original transaction from the signed PSBT
3. Use `bitcoinjs-lib` to parse the original transaction
4. Verification:

- The input quantity is consistent with the selected UTXO
- The output contains the destination address and the correct amount
- witness data exists and is of reasonable length

**Expected results**: The transaction structure is correct and the signature field is not empty

---

### TC-BTC-TX-05: Transfer with invalid receiving address

**step**:

1. Enter an EVM address (`0xAbCd...`) in the send form
2. Click Send

**Expected results**:

- Interception during the form verification phase (client) and no transaction is constructed
- Display error message "Invalid Bitcoin address"

---

### TC-BTC-TX-06: Send to P2PKH/P2SH address

**Goal**: Verify the behavior of sending to old format addresses when only P2WPKH sending is currently supported

**step**:

1. Enter the P2PKH address (`1...`) or P2SH address (`3...`) in the sending form

**Expected results**:

- If the design allows **sending** to any valid Bitcoin address (only its own **receiving** address is P2WPKH), the transaction will be constructed normally
- If the design restricts sending to P2WPKH, the prompt "Only bc1q format addresses are currently supported" is displayed.
- Product decisions need to be made clear and marked here

---

## TC-BTC-CHAIN: Chain switching test

### TC-BTC-CHAIN-01: EVM → Bitcoin chain switching

**step**:

1. Currently selected Ethereum Mainnet
2. Open the chain switch component (ChainSwitcher)
3. Select Bitcoin

**Expected results**:

-Chain icon updated to Bitcoin

- Balance display changes to BTC units
- Address display area displays `bc1q...` format address
- The send button is available and the send form displays Bitcoin address verification rules
- Browsing history button links to mempool.space

---

### TC-BTC-CHAIN-02: Bitcoin → Solana chain switching

**step**:

1. Bitcoin is currently selected
2. Switch to Solana Mainnet

**Expected results**:

- Balance unit changes to SOL
- Address display area displays Solana Base58 address
- Send form to restore Solana address verification rules
- API requests are no longer sent to the Bitcoin API

---

### TC-BTC-CHAIN-03: Bitcoin Mainnet ↔ Testnet switch

**step**:

1. Switch from Bitcoin Mainnet to Bitcoin Testnet

**Expected results**:

- API switch to Testnet endpoint
- Address prefix changed from `bc1q` to `tb1q`
- Balance re-query (Testnet balance is different from Mainnet)
- Chain label shows "Bitcoin Testnet"
- Browser link to mempool.space/testnet

---

## TC-BTC-WALLET: Multi-wallet test

### TC-BTC-WALLET-01: Uniqueness of multi-account derived addresses

**Prerequisite**: Log in, you can derive a new Bitcoin wallet through "Add Account"

**step**:

1. View the Bitcoin address (index 0) in the account list
2. Add a second account (index 1)

**Expected results**:

- The Bitcoin addresses of the two accounts are completely different
  -The EVM/Solana addresses of the two accounts are also completely different
- The balance display will change accordingly after switching accounts.

---

### TC-BTC-WALLET-02: Address consistency after re-logging in

**step**:

1. Record the Bitcoin index=0 address in the current login state
2. Log out (clear memory seed)
3. Log in again using the same Passkey
4. Check the Bitcoin index=0 address

**Expected results**: The address after logging in again is exactly the same as before logging out (deterministic derivation)

---

## TC-BTC-API: API stability test

### TC-BTC-API-01: API timeout processing

**step**:

1. Simulate API request timeout (you can set a very short timeout or disconnect the network)
2. Trigger balance inquiry

**Expected results**:

- The balance display is loading (loading status)
- After timeout, an error message "Network request failed, please try again" is displayed.
- Do not display NaN or undefined

---

### TC-BTC-API-02: API downgrade alternative

**step**:

1. Make the main API (such as Blockstream) unavailable
2. Trigger balance inquiry or transaction broadcast

**Expected results**:

- Automatically downgrade to alternative APIs (such as mempool.space)
- Functions function normally or provide clear error messages

---

### TC-BTC-API-03: Broadcast failure handling

**step**:

1. Construct a transaction using spent UTXO
2. Try broadcasting

**Expected results**:

- API returns error
- Users see clear error prompts (such as "Transaction Rejected") instead of silent failures

---

## TC-BTC-SEC: Security Test

### TC-BTC-SEC-01: Private keys are not leaked to storage

**step**:

1. Complete the entire BTC transfer process
2. Check LocalStorage, SessionStorage, IndexedDB
3. Check browser console logs

**Expected results**:

- No Bitcoin private keys or WIF format keys are included in any persistent storage
- No private key leaks in the console

---

### TC-BTC-SEC-02: Private key does not appear in network request

**step**:

1. Open the browser DevTools Network panel
2. Complete a BTC transfer
3. Check the payload of all requests

**Expected results**:

- Do not include the original private key in all network requests
- Only `POST /tx` requests contain the signed original transaction hex

---

### TC-BTC-SEC-03: Repeat broadcast protection

**step**:

1. Initiate a transfer
2. Click the send button in quick succession before the first broadcast is completed

**Expected results**:

- Broadcast transaction only once
- The button will be grayed out or display loading during the broadcast process to prevent repeated submissions

---

## Test execution instructions

### Unit Test (Vitest)

Scope of application: TC-BTC-KEY-_, TC-BTC-ADDR-_, TC-BTC-UTXO-_, TC-BTC-FEE-_

```bash
yarn test --grep "bitcoin"
```

### Integration testing (Testnet)

Scope of application: TC-BTC-BAL-_, TC-BTC-TX-_, TC-BTC-API-\*

You need to obtain Testnet tBTC in advance (via Faucet), and confirm that the test address has a balance before execution.

```bash
#Run Testnet integration tests
yarn test:integration --grep "bitcoin"
```

> Testnet Faucet Reference:
>
> - https://coinfaucet.eu/en/btc-testnet/
> - https://bitcoinfaucet.uo1.net/
> - https://signetfaucet.com/ (if using Signet)

### E2E Testing (Playwright)

Scope of application: TC-BTC-CHAIN-_, TC-BTC-WALLET-_, TC-BTC-SEC-\*

```bash
yarn test:e2e --grep "bitcoin"
```

---

## Test data reference

```typescript
// masterSeed used for testing (only for testing, no real assets included)
export const TEST_SEED = new Uint8Array(32).fill(1)

//Commonly used test constants
export const BTC_TEST_CONSTANTS = {
  DUST_THRESHOLD: 546, // satoshis
  TYPICAL_P2WPKH_VBYTES: 141, // Typical vBytes of single input single output P2WPKH transaction
  SATS_PER_BTC: 100_000_000,
}

//Address format test vector
export const BTC_ADDRESS_VECTORS = {
  VALID_MAINNET_P2WPKH: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  VALID_TESTNET_P2WPKH: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  LEGACY_P2PKH: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  LEGACY_P2SH: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
}
```
