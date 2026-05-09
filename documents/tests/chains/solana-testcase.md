# Solana wallet integration test case

> Test environment: Solana Devnet
> Framework: Vitest (unit/integration testing) + Playwright (E2E)

---

## TC-SOL-KEY: Key derivation test

### TC-SOL-KEY-01: Standard path derived address

**Goal**: Verify that SLIP-0010/Ed25519 derivation results are consistent with standard wallets

**Precondition**: known masterSeed and corresponding Phantom wallet address (for cross-validation)

**enter**:

```ts
// Known test vector (corresponds to Phantom's default derivation path m/44'/501'/0'/0')
const masterSeed = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
```

**step**:

1. Call `SolanaKeyService.deriveKeypair(masterSeed, 0)`
2. Get `keypair.publicKey.toBase58()`
3. Compare with known test vector address

**Expected results**:

- Output Base58 address (32-44 characters, without `0x` prefix)
- Exactly the same address as Phantom's index=0 under the same seed

**PASSING CRITERIA**: Address exactly matches

---

### TC-SOL-KEY-02: Multi-account derived isolation

**Goal**: Different indexes derive different addresses, and they are reproducible with certainty.

**step**:

1. Use the same `masterSeed` to derive index 0, 1, 2, 3, 4 respectively.
2. Verify that two of the five addresses are different
3. Repeat the derivation of index 0 and verify that it is exactly the same as the first time.

**Expected results**:

- 5 addresses all different
- index=0, the two derivation results are 100% consistent

---

### TC-SOL-KEY-03: EVM and Solana key isolation

**Goal**: EVM private keys and Solana private keys derived from the same masterSeed are completely independent

**step**:

1. Derive EVM address from masterSeed (BIP44 path `m/44'/60'/0'/0/0`)
2. Derive Solana address from masterSeed (SLIP-0010 path `m/44'/501'/0'/0'`)
3. Verify that the corresponding private key bytes of the two are different

**Expected results**: EVM private key ≠ Solana private key, no byte overlap

---

### TC-SOL-KEY-04: Illegal masterSeed processing

**Goal**: There should be clear errors when entering exception seeds and should not fail silently

**step**:

1. Pass in empty `Uint8Array(0)`
2. Pass in a seed whose length is less than 16 bytes
3. Pass in all zeros 32 bytes (`Uint8Array(32).fill(0)`)

**Expected results**:

- The first two cases: throw an explicit error (such as `InvalidSeedLength`)
- All-zero seed: technically valid, should be derived normally (but should be warned at the business layer, as this should not happen in real user scenarios)

---

## TC-SOL-ADDR: Address verification test

### TC-SOL-ADDR-01: Valid Solana address verification

**Step**: Pass the following address into the `isValidSolanaAddress()` function

**Input/Expected**:

| Address                                              | Expectation | Description            |
| ---------------------------------------------------- | ----------- | ---------------------- |
| `11111111111111111111111111111111`                   | ✅ true     | System Program Address |
| `So11111111111111111111111111111111111111112`        | ✅ true     | Native SOL Token Mint  |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`       | ✅ true     | USDC Mint              |
| `0x1234567890abcdef...`                              | ❌ false    | EVM format address     |
| `invalid-address-string`                             | ❌ false    | random string          |
| `""`                                                 | ❌ false    | empty string           |
| `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` (45 chars) | ❌ false    | Too long               |

---

### TC-SOL-ADDR-02: Send form address input validation

**step**:

1. Open the sending form under the Solana chain
2. Enter the EVM address (`0x...`) in the `recipient` input box
3. Verify error message text
4. Clear and enter a valid Solana address
5. The verification error disappears and the amount input box is available.

**Expected results**:

- "Please enter a valid Solana address" is displayed when entering the EVM address
- The error disappears after entering a valid Solana address

---

## TC-SOL-BAL: Balance query test

### TC-SOL-BAL-01: SOL balance query (Devnet)

**Prerequisites**: Hold a Devnet address and have deposited 1 SOL through Faucet

**step**:

1. Initialize `SolanaService('https://api.devnet.solana.com')`
2. Call `getBalance(address)`
3. At the same time, query the same address in [Solscan Devnet](https://solscan.io/?cluster=devnet)

**Expected results**:

- The return value is a positive number, the unit is SOL (such as `1.0` or `0.99...`)
- Display balance error with Solscan < 0.001 SOL (there may be accuracy differences due to Faucet)

---

### TC-SOL-BAL-02: Zero balance address query

**step**:

1. Generate a brand new Solana address (never recharged)
2. Call `getBalance(newAddress)`

**Expected result**: Return `0`, no exception is thrown

---

### TC-SOL-BAL-03: SPL Token balance inquiry

**Prerequisite**: The address holds Devnet USDC (obtained through Devnet Faucet)

**step**:

1. Call `SolanaTokenService.getTokenBalance(address, USDC_DEVNET_MINT)`
2. Comparison with on-chain data

**Expected result**: Return the correct USDC amount string (such as `"10.5"`)

---

### TC-SOL-BAL-04: SPL Token without ATA address query

**step**:

1. Use an address that has never held the Token.
2. Call `getTokenBalance(addressWithoutATA, mint)`

**Expected result**: Return `"0"`, no exception is thrown (the absence of ATA should be treated as a zero balance)

---

## TC-SOL-TX: Transaction Test (Devnet)

### TC-SOL-TX-01: The whole process of SOL transfer

**Prerequisites**:

- The sender holds ≥ 0.01 SOL in Devnet
- The recipient is a new address

**step**:

1. Record the initial balance of the sender and receiver
2. Call `solanaService.sendSOL(senderKeypair, recipient, 0.001)`
3. Wait for transaction confirmation (`confirmed` level)
4. Check the balance of two parties

**Expected results**:

- Returns an 88-character Base58 transaction signature
- The receiver's balance increases by `0.001 SOL`
- The sender's balance is reduced by `0.001 + fee (approximately 0.000005) SOL`
- The status of the signature can be queried on Solscan Devnet as `Success`

---

### TC-SOL-TX-02: Transfer failed when balance is insufficient

**step**:

1. Use an address with only `0.000005 SOL` (just enough for fee, not enough for transfer)
2. Try sending `0.001 SOL`

**Expected results**:

- Throw an error, the error message contains a description of insufficient balance
- Do not submit transactions to the chain (preflight stage interception)

---

### TC-SOL-TX-03: Cost estimate

**step**:

1. Construct a SOL transfer transaction (no signature, no broadcast)
2. Call `estimateFee(sender, recipient, 100000)`

**Expected results**:

- Returns cost estimate in SOL
- Value is approximately `0.000005 SOL` (5000 lamports)
- The result is a positive number of type `number`

---

### TC-SOL-TX-04: SPL Token transfer (ATA already exists)

**Precondition**: Both the sender and the receiver already have USDC ATA, and the sender holds ≥ 1 USDC

**step**:

1. Call `sendToken(senderKeypair, recipient, USDC_DEVNET_MINT, 100000n)` (0.1 USDC, 6 decimal places)
2. Wait for transaction confirmation

**Expected results**:

- Receiver USDC increases by `0.1`
- Sender USDC decreases by `0.1`
- Sender SOL reduced by approximately `0.000005` (only tx fee, no ATA creation fee)

---

### TC-SOL-TX-05: SPL Token transfer (recipient ATA needs to be created)

**Prerequisites**:

- The sender holds USDC and ATA already exists
- The recipient never held USDC (no ATA)
- Sender SOL balance ≥ 0.003 SOL

**step**:

1. Confirm that the recipient USDC ATA does not exist
2. Call `sendToken(...)`
3. Confirm the transaction is successful

**Expected results**:

- The transaction contains two instructions: `createAssociatedTokenAccount` + `transfer`
- Receiver USDC ATA automatically created
- Sender SOL additional deduction of approximately `0.002 SOL` (ATA rental)
- The UI informs users in advance that they need to pay the ATA creation fee

---

### TC-SOL-TX-06: Transfer with invalid receiving address

**step**:

1. Enter an EVM address (`0xAbCd...`) in the send form
2. Click Send

**Expected results**:

- Intercept during the form verification phase (client) and do not call `sendTransaction`
- Display error message "Invalid Solana address"

---

## TC-SOL-CHAIN: Chain switching test

### TC-SOL-CHAIN-01: EVM → Solana chain switching

**step**:

1. Currently selected Ethereum Mainnet
2. Open the chain switch component (ChainSwitcher)
3. Select Solana Mainnet

**Expected results**:

-Chain icon updated to Solana

- Balance display changes to SOL units
- The send button is available and the send form displays Solana address verification rules
- Browsing history button links to Solscan

---

### TC-SOL-CHAIN-02: Solana → EVM chain switching

**step**:

1. Solana Devnet is currently selected
2. Switch to Arbitrum One

**Expected results**:

- Balance reverted to ETH units
- Send form to restore EVM address verification rules (`0x...`)
- RPC requests are no longer sent to Solana nodes

---

### TC-SOL-CHAIN-03: Solana Mainnet ↔ Devnet switching

**step**:

1. Switch from Solana Mainnet to Solana Devnet

**Expected results**:

- RPC switch to `https://api.devnet.solana.com`
- Balance re-query (Devnet balance is different from Mainnet)
- Chain label shows "Solana Devnet"

---

## TC-SOL-WALLET: Multi-wallet test

### TC-SOL-WALLET-01: Uniqueness of multi-account derived addresses

**Prerequisite**: Log in, you can derive a new Solana wallet through "Add Account"

**step**:

1. View the Solana address (index 0) in the account list
2. Add a second Solana account (index 1)

**Expected results**:

- The two accounts have completely different Solana addresses
  -The EVM addresses of the two accounts are also completely different
- The balance display will change accordingly after switching accounts.

---

### TC-SOL-WALLET-02: Address consistency after re-login

**step**:

1. Record the address of Solana index=0 in the current login state
2. Log out (clear memory seed)
3. Log in again using the same Passkey
4. View Solana index=0 address

**Expected results**: The address after logging in again is exactly the same as before logging out (deterministic derivation)

---

## TC-SOL-RPC: RPC stability test

### TC-SOL-RPC-01: RPC timeout processing

**step**:

1. Simulate RPC request timeout (you can set a very short timeout or disconnect the network)
2. Trigger balance inquiry

**Expected results**:

- The balance display is loading (loading status)
- After timeout, an error message "Network request failed, please try again" is displayed.
- Do not display NaN or undefined

---

### TC-SOL-RPC-02: Devnet Faucet Integration

> Only used for development environment verification, not as a production functional test

**step**:

1. In Devnet mode, call `requestAirdrop(address, 1)`
2. Wait for confirmation
3. Check balance

**Expected results**: Balance increased by 1 SOL

---

## Test execution instructions

### Unit Test (Vitest)

Scope of application: TC-SOL-KEY-_, TC-SOL-ADDR-_

```bash
yarn test --grep "solana"
```

### Integration testing (Devnet)

Scope of application: TC-SOL-BAL-_, TC-SOL-TX-_

A Devnet Faucet account needs to be configured, and the Faucet recharge script needs to be run before execution.

```bash
# Recharge the test account
yarn test:devnet:fund

#Run Devnet integration tests
yarn test:integration --grep "solana"
```

### E2E Testing (Playwright)

Scope of application: TC-SOL-CHAIN-_, TC-SOL-WALLET-_

```bash
yarn test:e2e --grep "solana"
```

---

## Test data reference

```typescript
// Devnet common addresses and Mint
export const TEST_ADDRESSES = {
  // Devnet USDC Mint
  USDC_DEVNET_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  // System Program (for address validity testing)
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  // Token Program
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

// masterSeed used for testing (only for testing, no real assets included)
export const TEST_SEED = new Uint8Array(32).fill(1) // Full 1-byte test seed
```
