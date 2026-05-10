# EVM wallet integration test case

> Test environment: Sepolia Testnet (or Anvil Fork)
> Framework: Vitest (unit/integration testing) + Playwright (E2E)

---

## TC-EVM-KEY: Key derivation test

### TC-EVM-KEY-01: Standard BIP44 path derived address

**Goal**: Verify that the BIP32/secp256k1 derived EVM address is consistent with standard wallets (MetaMask, etc.)

**Prerequisite**: The addresses of masterSeed and the corresponding BIP44 standard wallet in the same path are known

**Input**:

```ts
const masterSeed = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
// Path: m/44'/60'/0'/0/0 (Ethereum mainnet)
```

**Step**:

1. Call `EvmWalletService.deriveAccounts(masterSeed, 1)` or `plugin.deriveAccounts(masterSeed, 1)`
2. Get the `address` in the return value
3. Compare with known test vector address

**Expected results**:

- Output checksummed address (starting with `0x`, 42 characters)
- Exactly the same address as the standard wallet under the same seed and path

**PASSING CRITERIA**: Address exactly matches (case-insensitive comparison)

---

### TC-EVM-KEY-02: Multi-account derivation isolation

**Goal**: Different address_index derives different addresses, and the derivation is deterministic

**Step**:

1. Use the same `masterSeed` to derive index 0, 1, 2, 3, 4 respectively
2. Verify that all five addresses are different
3. Repeat the derivation of index 0 and verify that it is exactly the same as the first time

**Expected results**:

- 5 addresses are all different
- index=0, the two derivation results are 100% consistent

---

### TC-EVM-KEY-03: Cross-chain key isolation

**Goal**: The private keys of EVM, Bitcoin, Solana derived from the same masterSeed are completely independent

**Step**:

1. Derive the EVM address from masterSeed (path `m/44'/60'/0'/0/0`)
2. Derive the Bitcoin address from masterSeed (path `m/44'/0'/0'/0/0`)
3. Derive the Solana address from masterSeed (path `m/44'/501'/0'/0'`)
4. Verify that the private key bytes corresponding to the three are different

**Expected results**: The three sets of private keys are different from each other, without any byte overlap

---

### TC-EVM-KEY-04: Smart account derivation from COSE key

**Goal**: Verify that smart account addresses can be derived from WebAuthn/Passkey COSE public keys

**Step**:

1. Create a COSE key Map with x and y coordinates
2. Call `EvmWalletService.deriveSmartAccount(coseKey)`
3. Verify the derived address format

**Expected results**:

- Returns a valid checksummed EVM address
- Same COSE key produces same address (deterministic)
- Different salt produces different address

---

## TC-EVM-ADDR: Address verification test

### TC-EVM-ADDR-01: Valid EVM address verification

**Step**: Pass the following addresses into the `isValidAddress()` function

**Input/Expected**:

| Address | Expectation | Description |
|---------|-------------|-------------|
| `0x71C7656EC7ab88b098defB751B7401B5f6d8976F` | ✅ true | Valid checksummed address |
| `0x71c7656ec7ab88b098defb751b7401b5f6d8976f` | ✅ true | Valid lowercase address |
| `0x0000000000000000000000000000000000000000` | ✅ true | Zero address (valid format) |
| `0x1234567890abcdef1234567890abcdef12345678` | ❌ false | Invalid checksum |
| `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4` | ❌ false | Bitcoin address |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | ❌ false | Solana address |
| `0x71C7656EC7ab88b098defB751B7401B5f6d8976` | ❌ false | Too short (39 chars) |
| `0x71C7656EC7ab88b098defB751B7401B5f6d8976FF` | ❌ false | Too long (43 chars) |
| `0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG` | ❌ false | Invalid hex characters |
| `""` | ❌ false | Empty string |

---

### TC-EVM-ADDR-02: Send form address input verification

**Step**:

1. Open the sending form under an EVM chain
2. Enter a Bitcoin address (`bc1q...`) in the `recipient` input box
3. Verify error message text
4. Clear and enter a Solana address
5. Verify error message still displays
6. Clear and enter a valid `0x...` address
7. Verify the error disappears and the amount input box is available

**Expected results**:

- "Please enter a valid Ethereum address" is displayed when entering a non-EVM address
- The error disappears after entering a valid checksummed address

---

## TC-EVM-BAL: Balance query test

### TC-EVM-BAL-01: Native ETH balance query (Sepolia)

**Prerequisite**: Hold a Sepolia address with ≥ 0.01 ETH from Faucet

**Step**:

1. Initialize provider with Sepolia RPC endpoint
2. Call `provider.getBalance(address)`
3. Compare with Etherscan Sepolia display

**Expected results**:

- Return value is a positive bigint, unit is wei
- Display balance matches Etherscan within 0.001 ETH (accounting for recent transactions)

---

### TC-EVM-BAL-02: Zero balance address query

**Step**:

1. Generate a brand new EVM address (never received transactions)
2. Call `getBalance(newAddress)`

**Expected result**: Return `0n`, no exception is thrown. UI shows balance `0 ETH`

---

### TC-EVM-BAL-03: ERC-20 token balance inquiry

**Prerequisite**: The address holds Sepolia USDC (obtained through testnet faucet)

**Step**:

1. Call `balanceOf(address)` on USDC contract (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
2. Compare with on-chain data from Etherscan

**Expected result**: Return the correct USDC amount (6 decimals)

---

### TC-EVM-BAL-04: Multi-token balance aggregation

**Prerequisite**: Address holds multiple ERC-20 tokens (USDC, USDT, etc.)

**Step**:

1. Query balances for multiple token contracts
2. Verify each token balance is returned correctly

**Expected results**:

- All token balances are correctly returned
- Tokens with zero balance return 0 without error

---

## TC-EVM-TX: Transaction Test (Sepolia Fork)

### TC-EVM-TX-01: Native ETH transfer full process

**Prerequisites**:

- The sender holds ≥ 0.01 ETH on Sepolia (or Anvil fork with funded account)
- The recipient is a new address

**Step**:

1. Record the initial balance of the sender and receiver
2. Call `EvmWalletService.signTransaction()` with sender private key, recipient address, amount
3. Call `EvmWalletService.broadcastEOATransaction()` or `plugin.broadcastTransaction()`
4. Wait for transaction confirmation (at least 1 confirmation)
5. Re-query the balances of both parties

**Expected results**:

- `broadcast` returns a 66 character hex txid (0x + 64 hex chars)
- The receiver's balance increases by the sent amount
- Sender balance reduced by sent amount + gas fee
- txid can be found on Etherscan Sepolia (or local Anvil logs)

---

### TC-EVM-TX-02: Transfer failed when balance is insufficient

**Step**:

1. Use an address with only 0.0001 ETH
2. Try sending 1 ETH

**Expected results**:

- Throws an error, message contains "insufficient funds"
- No transactions are broadcast

---

### TC-EVM-TX-03: EIP-1559 transaction signing

**Goal**: Verify EIP-1559 transaction structure with maxFeePerGas and maxPriorityFeePerGas

**Step**:

1. Construct an EIP-1559 transaction
2. Sign the transaction
3. Parse the signed transaction

**Expected results**:

- Transaction type is 2 (EIP-1559)
- Contains maxFeePerGas and maxPriorityFeePerGas fields
- Chain ID is correctly encoded

---

### TC-EVM-TX-04: ERC-20 token transfer

**Prerequisite**: The sender holds ≥ 10 USDC on Sepolia

**Step**:

1. Call `EvmWalletService.signTransaction()` with tokenOpts parameter
2. Broadcast the signed transaction
3. Wait for confirmation

**Expected results**:

- Transaction targets the token contract address
- Transaction data contains the transfer function call
- Receiver's token balance increases by the sent amount
- Sender's token balance decreases by the sent amount

---

### TC-EVM-TX-05: Transaction with invalid recipient address

**Step**:

1. Enter a Bitcoin address (`bc1q...`) in the send form
2. Click Send

**Expected results**:

- Interception during the form verification phase (client-side)
- Display error message "Invalid Ethereum address"
- No transaction is constructed

---

### TC-EVM-TX-06: Transaction gas estimation

**Step**:

1. Prepare a native transfer transaction
2. Call `estimateGas()` on the provider

**Expected results**:

- Returns a positive gas limit estimate
- Estimate is within reasonable range (21000 for simple transfer)

---

## TC-EVM-CHAIN: Chain switching test

### TC-EVM-CHAIN-01: EVM chain switching (Ethereum → Arbitrum)

**Step**:

1. Currently selected Ethereum Mainnet
2. Open the chain switch component (ChainSwitcher)
3. Select Arbitrum One

**Expected results**:

- Chain icon updated to Arbitrum
- Balance display changes to ETH units (Arbitrum balance)
- Address display remains the same (same EVM address across chains)
- RPC requests are sent to Arbitrum RPC endpoint
- Explorer link updates to Arbiscan

---

### TC-EVM-CHAIN-02: EVM → Bitcoin chain switching

**Step**:

1. Ethereum Mainnet is currently selected
2. Switch to Bitcoin

**Expected results**:

- Balance unit changes to BTC
- Address display changes to Bitcoin format (`bc1q...`)
- Send form updates to Bitcoin address validation
- API requests switch to Bitcoin API

---

### TC-EVM-CHAIN-03: Mainnet ↔ Testnet switching

**Step**:

1. Switch from Ethereum Mainnet to Sepolia Testnet

**Expected results**:

- RPC switches to Sepolia endpoint
- Balance re-queries (Sepolia balance is different from Mainnet)
- Chain label shows "Sepolia Testnet"
- Explorer link updates to sepolia.etherscan.io

---

## TC-EVM-WALLET: Multi-wallet test

### TC-EVM-WALLET-01: Uniqueness of multi-account derived addresses

**Prerequisite**: Logged in, can derive new accounts through "Add Account"

**Step**:

1. View the EVM address (index 0) in the account list
2. Add a second account (index 1)

**Expected results**:

- The EVM addresses of the two accounts are completely different
- Bitcoin and Solana addresses of the two accounts are also different
- Balance display updates after switching accounts

---

### TC-EVM-WALLET-02: Address consistency after re-login

**Step**:

1. Record the EVM index=0 address in the current login state
2. Log out (clear memory seed)
3. Log in again using the same Passkey
4. Check the EVM index=0 address

**Expected results**: The address after logging in again is exactly the same as before logging out (deterministic derivation)

---

## TC-EVM-RPC: RPC stability test

### TC-EVM-RPC-01: RPC timeout handling

**Step**:

1. Simulate RPC request timeout (set a very short timeout or disconnect network)
2. Trigger balance inquiry

**Expected results**:

- Balance display shows loading state
- After timeout, display error message "Network request failed, please try again"
- Do not display NaN or undefined

---

### TC-EVM-RPC-02: RPC failover to alternative endpoints

**Step**:

1. Make the primary RPC endpoint unavailable
2. Trigger balance inquiry or transaction broadcast

**Expected results**:

- Automatically failover to alternative RPC endpoints if configured
- Functions work normally or provide clear error messages

---

### TC-EVM-RPC-03: Chain ID verification

**Step**:

1. Connect to an RPC endpoint
2. Call `eth_chainId`
3. Verify the returned chain ID matches expected value

**Expected results**:

- Returns correct chain ID for the network (1 for Mainnet, 11155111 for Sepolia, etc.)
- Mismatched chain ID should trigger warning or error

---

## TC-EVM-SEC: Security Test

### TC-EVM-SEC-01: Private keys are not leaked to storage

**Step**:

1. Complete an ETH transfer process
2. Check LocalStorage, SessionStorage, IndexedDB
3. Check browser console logs

**Expected results**:

- No private keys are stored in any persistent storage
- No private key leaks in the console

---

### TC-EVM-SEC-02: Private key does not appear in network request

**Step**:

1. Open browser DevTools Network panel
2. Complete an ETH transfer
3. Check the payload of all requests

**Expected results**:

- Private key is not included in any network request
- Only `eth_sendRawTransaction` contains the signed transaction

---

### TC-EVM-SEC-03: Replay protection via chain ID

**Step**:

1. Sign a transaction for Sepolia (chainId 11155111)
2. Attempt to broadcast on a different chain (e.g., Mainnet)

**Expected results**:

- Transaction is rejected on the wrong chain
- Chain ID in signature provides replay protection

---

## Test execution instructions

### Unit Test (Vitest)

Scope of application: TC-EVM-KEY-*, TC-EVM-ADDR-*, TC-EVM-SEC-*

```bash
yarn test --grep "evm"
```

### Integration testing (Anvil Fork)

Scope of application: TC-EVM-BAL-*, TC-EVM-TX-*, TC-EVM-RPC-*

Requires Anvil to be running with a forked Sepolia endpoint:

```bash
# Start Anvil fork
yarn test:chain:fork-url  # Get the fork URL
anvil --fork-url "<fork-url>" --port 8545

# Run tests
yarn test:chain
```

### E2E Testing (Playwright)

Scope of application: TC-EVM-CHAIN-*, TC-EVM-WALLET-*

```bash
yarn test:e2e --grep "evm"
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

// Sepolia USDC contract
export const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

// Address format test vectors
export const EVM_ADDRESS_VECTORS = {
  VALID_CHECKSUMMED: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  VALID_LOWERCASE: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  INVALID_CHECKSUM: '0x1234567890abcdef1234567890abcdef12345678',
}

// Chain IDs
export const CHAIN_IDS = {
  ETHEREUM_MAINNET: 1,
  SEPOLIA: 11155111,
  ARBITRUM_ONE: 42161,
  OPTIMISM: 10,
  POLYGON: 137,
  BASE: 8453,
}
```
