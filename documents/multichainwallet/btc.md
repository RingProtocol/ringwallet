#Bitcoin Wallet Integration Solution

> Goal: Add the basic transfer capabilities of the Bitcoin mainnet (Testnet can be expanded in the future) to Ring Wallet under the premise of **not adding a new self-built server**, **not relying on third-party wallet apps**, and **keys being completely hosted locally**.

---

## 1. Project and Constraint Review (Aligning Solana Solution)

Global constraints (same as `CLAUDE.md` and Solana scheme):

- No self-built backend dependencies: only RPC/HTTP APIs provided by public/third parties can be used, and the core capabilities of the wallet cannot rely on its own servers.
- No third-party wallet dependencies: No reliance on external wallet apps or extensions such as MetaMask / Phantom / UniSat is allowed.
- The private key never leaves the browser: the key is derived in local memory by `masterSeed` and is only used for signing. It is not persisted or uploaded.
- The only authentication entrance is Passkey: all high-risk operations (transfers, signatures) must go through `PasskeyService.verifyIdentity()`.

Bitcoin-specific constraints:

- UTXO model: Different from the EVM/Solana account model, it requires local management of UTXO sets, change addresses, handling fees, and change calculations.
  -Multiple address management: A typical HD wallet will use multiple receiving addresses (gap limit), and a simplified version of the address scanning strategy needs to be designed.
- Network interface: There is no unified "JSON-RPC over HTTP + Web3 SDK" standard in the industry, and most of them are customized REST/WS APIs by each company.

---

## 2. Solution selection evaluation

### 2.1 Key and address types

Bitcoin ecosystem mainstream address types:

- P2PKH (`1...`): Traditional address, high handling fee, no longer recommended.
- P2SH-P2WPKH (`3...`): SegWit compatible.
- P2WPKH (Bech32, `bc1q...`): native SegWit, currently mainstream.
- P2TR (Taproot, `bc1p...`): More advanced scripting capabilities and privacy.

**Recommendation at this stage: Only P2WPKH native SegWit address is supported**, reason:

- Compatible with most modern wallets, with relatively lower handling fees and mature ecological support.
- Implementation complexity is significantly lower than full Taproot/Miniscript support.

### 2.2 SDK/Library Selection

Candidates:

1. Pure handwriting serialization and signature ❌

- Transaction serialization (varint, script, witness, etc.) needs to be implemented, which is extremely error-prone.
- The safety requirements are extremely high and do not meet the current labor costs.

2. Use `bitcoinjs-lib` + BIP32/BIP39 ✅ (recommended)

- De facto standard library in the industry, supporting P2WPKH / P2TR / PSBT, etc.
- Can be used with `bip32` or the built-in BIP32 implementation to derive the secp256k1 private key from `masterSeed`.

3. Directly rely on third-party "hosted wallet SDK" ❌

- May require mnemonic phrases or private keys to be hosted on the server, violating self-hosting constraints.

**in conclusion:**

- Use `bitcoinjs-lib` + `bip32` + in-browser cryptographically secure random source.
- Only reuse `masterSeed` (32 bytes) as the input of HD seed, without introducing additional BIP39 mnemonic words.

---

## 3. Key derivation and address generation design

### 3.1 HD Path with ChainFamily Extension

Refer to BIP44 standard:

- Coin type: Bitcoin = `0''
- Standard path: `m/44'/0'/account'/change/address_index`

In Ring Wallet, to simplify:

- Fixed `account = 0'`
- `change=0`: external address (receiving)
- `address_index = i`: i is the address index

Final path:

- `m/44'/0'/0'/0/i`

Expand in `src/models/ChainType.ts`:

```typescript
export enum ChainFamily {
  EVM = 'evm',
  Solana = 'solana',
  Bitcoin = 'bitcoin',
}
```

The `Chain` interface adds Bitcoin-specific fields (indicative, actual code shall prevail):

```typescript
export interface Chain {
  id: number | string
  name: string
  symbol: string
  family: ChainFamily
  rpcUrl: string // For Bitcoin, it can represent the REST API base URL
  explorer: string
  // Bitcoin exclusive
  network?: 'mainnet' | 'testnet' | 'signet' | 'regtest'
}
```

Bitcoin chain configuration example (put into `src/constants/chains.ts`):

```typescript
export const BITCOIN_CHAINS: Chain[] = [
  {
    id: 'bitcoin-mainnet',
    name: 'Bitcoin',
    symbol: 'BTC',
    family: ChainFamily.Bitcoin,
    rpcUrl:
      process.env.NEXT_PUBLIC_BITCOIN_API ?? 'https://blockstream.info/api', // Default public API, only as a guide
    explorer: 'https://mempool.space',
    network: 'mainnet',
  },
  {
    id: 'bitcoin-testnet',
    name: 'Bitcoin Testnet',
    symbol: 'tBTC',
    family: ChainFamily.Bitcoin,
    rpcUrl:
      process.env.NEXT_PUBLIC_BITCOIN_TESTNET_API ??
      'https://blockstream.info/testnet/api',
    explorer: 'https://mempool.space/testnet',
    network: 'testnet',
  },
]
```

### 3.2 Derive Bitcoin private key and address from masterSeed

Constraints: `masterSeed` is provided by Passkey userHandle and is 32 bytes long.

Implementation ideas:

- Treat `masterSeed` as HD seed (BIP32 allows 128–512 bit input).
- Use `bip32` to generate the root node from seed, and then derive the child private key according to the BIP44 path.
- Use `bitcoinjs-lib` to generate P2WPKH addresses.

Pseudocode (`src/services/bitcoinKeyService.ts`):

```typescript
import * as bitcoin from 'bitcoinjs-lib'
import * as bip32 from 'bip32'

export class BitcoinKeyService {
  static deriveNode(masterSeed: Uint8Array, network: bitcoin.Network) {
    const seedBuffer = Buffer.from(masterSeed)
    return bip32
      .BIP32Factory(require('tiny-secp256k1'))
      .fromSeed(seedBuffer, network)
  }

  static getNetwork(isTestnet: boolean): bitcoin.Network {
    return isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
  }

  static deriveAccountNode(
    masterSeed: Uint8Array,
    isTestnet: boolean,
    addressIndex = 0
  ) {
    const network = this.getNetwork(isTestnet)
    const root = this.deriveNode(masterSeed, network)
    const path = `m/44'/0'/0'/0/${addressIndex}`
    const child = root.derivePath(path)
    if (!child.privateKey) throw new Error('Missing private key')
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network,
    })
    if (!address) throw new Error('Failed to derive address')
    return {
      privateKey: child.privateKey,
      publicKey: child.publicKey,
      address,
    }
  }
}
```

> Consistent with Solana: the private key only exists in memory and is discarded after use. Does not write to IndexedDB/LocalStorage/server.

---

## 4. UTXO and transaction structure

### 4.1 Network interface and data source

Public/free APIs that can be used without building your own server:

- **Blockstream API**（REST）：`https://blockstream.info/api`
- `GET /address/:addr/utxo`: Query address UTXO.
- `GET /fee-estimates`: Fee estimates.
- `POST /tx`: Broadcast the raw transaction (hex).
- Other alternatives: mempool.space API (compatible with Blockstream style), Alchemy Bitcoin (if launched), third-party Free-tier.

Configuration method (`.env`):

```env
NEXT_PUBLIC_BITCOIN_API=https://blockstream.info/api
NEXT_PUBLIC_BITCOIN_TESTNET_API=https://blockstream.info/testnet/api
```

> If you are worried about centralized dependence in the future, you can add an optional proxy layer to `src/server/`, but Bitcoin core capabilities must not rely heavily on this proxy.

### 4.2 BitcoinService Design

Responsibilities:

- Query UTXO: Given an address, call the REST API to get the current UTXO set.
- Handling fee estimation: Handling fee is estimated based on API feerate (sat/vByte) and transaction size.
  -Construct and sign transaction: Construct and sign the P2WPKH transaction based on the target amount, handling rate and UTXO.

Pseudocode (`src/services/bitcoinService.ts`):

```typescript
import * as bitcoin from 'bitcoinjs-lib'
import axios from 'axios'

interface Utxo {
  txid: string
  vout: number
  value: number // satoshis
}

export class BitcoinService {
  constructor(
    private apiBase: string,
    private network: bitcoin.Network
  ) {}

  async getUtxos(address: string): Promise<Utxo[]> {
    const { data } = await axios.get<Utxo[]>(
      `${this.apiBase}/address/${address}/utxo`
    )
    return data
  }

  async getFeeRate(): Promise<number> {
    const { data } = await axios.get<Record<string, number>>(
      `${this.apiBase}/fee-estimates`
    )
    // Select "medium priority" fee rate, for example 3 blocks target
    return data['3'] ?? data['6'] ?? 5 // sat/vByte
  }

  /**
   * Construct and sign P2WPKH transaction
   */
  async buildAndSignTransaction(params: {
    fromAddress: string
    toAddress: string
    amountSats: number
    masterSeed: Uint8Array
    addressIndex: number
    enableRbf?: boolean
  }): Promise<{ txHex: string; fee: number }> {
    const { fromAddress, toAddress, amountSats, masterSeed, addressIndex } =
      params

    const utxos = await this.getUtxos(fromAddress)
    if (!utxos.length) throw new Error('No UTXO available')

    const feeRate = await this.getFeeRate()

    // Coin selection strategy: simple "accumulate until enough", which can be expanded later BnB/Knapsack
    let selected: Utxo[] = []
    let totalIn = 0
    for (const u of utxos) {
      selected.push(u)
      totalIn += u.value
      if (totalIn >= amountSats) break
    }
    if (totalIn < amountSats) throw new Error('Insufficient balance')

    const psbt = new bitcoin.Psbt({ network: this.network })

    //Add input (P2WPKH)
    for (const u of selected) {
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(fromAddress, this.network),
          value: u.value,
        },
      })
    }

    // First assume "no change" to estimate an upper limit of handling fees
    psbt.addOutput({
      address: toAddress,
      value: amountSats,
    })

    const vBytesEstimate = psbt.__CACHE.__TX.virtualSize() ?? 200 // A rough estimate
    const feeEstimate = Math.ceil(feeRate * vBytesEstimate)

    const change = totalIn - amountSats - feeEstimate
    const dustThreshold = 546 // sat

    // If the change is greater than dust, add the change output, otherwise the change will be included in the handling fee
    if (change >= dustThreshold) {
      psbt.addOutput({
        address: fromAddress, // Simplified: return the change to the same address, which can be used later with changeIndex
        value: change,
      })
    }

    const { privateKey } = BitcoinKeyService.deriveAccountNode(
      masterSeed,
      this.network === bitcoin.networks.testnet,
      addressIndex
    )

    selected.forEach((_, idx) => {
      psbt.signInput(idx, bitcoin.ECPair.fromPrivateKey(privateKey))
    })
    psbt.finalizeAllInputs()

    const tx = psbt.extractTransaction()
    return { txHex: tx.toHex(), fee: tx.virtualSize() * feeRate }
  }

  async broadcast(txHex: string): Promise<string> {
    const { data } = await axios.post<string>(`${this.apiBase}/tx`, txHex, {
      headers: { 'Content-Type': 'text/plain' },
    })
    return data // txid
  }
}
```

> Consistent with Solana: construction and signing are done on the frontend, the backend (if present) can only be used as "optional proxy" forwarding.

---

## 5. Signature process integrated with Passkey

The Bitcoin signature process maintains a unified model with EVM and Solana:

```
User clicks "Send BTC"
        ↓
PasskeyService.verifyIdentity() // Biometric / Security Verification
        ↓
Restore masterSeed from AuthContext // Detach from Passkey userHandle when logging in
        ↓
BitcoinKeyService.deriveAccountNode() // BIP32 / secp256k1 derived, generate private key and address
        ↓
BitcoinService.buildAndSignTransaction // Construct P2WPKH transaction and sign
        ↓
BitcoinService.broadcast // Broadcast txHex to the public API
```

Key principles:

- Passkey is not directly involved in Bitcoin signatures (different curves: P-256 vs secp256k1), but only serves as a "door lock to unlock masterSeed".
- masterSeed and Bitcoin private keys are never uploaded to the network.

---

## 6. UI and chain abstraction integration

### 6.1 Chain Abstraction

The UI layer is branched through `chain.family`:

- `evm`: Use EVMService (ethers.js).
- `solana`: Use SolanaService (@solana/web3.js).
- `bitcoin`: Use BitcoinService (custom).

Example (pseudocode):

```typescript
switch (chain.family) {
  case ChainFamily.EVM:
    return <EvmSendForm />;
  case ChainFamily.Solana:
    return <SolanaSendForm />;
  case ChainFamily.Bitcoin:
    return <BitcoinSendForm />;
}
```

`BitcoinSendForm` requires:

- Address format verification: Bech32, `bc1q...` / `tb1q...`, does not start with `0x`.
- Amount unit switching: UI displays BTC (such as `0.001 BTC`), which is converted internally to satoshi (`1 BTC = 1e8 sats`).
- Fee prompt: Displays the estimated fee (`fee (sat) ≈ vBytes * sat/vByte`), allowing users to choose "slow/medium/fast".

### 6.2 Balance and Transaction History

- Balance: `sum(utxo.value)` is obtained by accumulating UTXO and converted into BTC for display.
- Transaction history: Use public API (such as Blockstream's `/address/:addr/txs`) to parse out:
- Receipt/payment mark (depending on whether the input/output contains this wallet address).
- Amount, time, and number of confirmations.

---

## 7. DApp integration considerations (reserved)

Unlike EVM/Solana, the Bitcoin ecosystem lacks a unified "in-browser DApp standard" (no EIP-1193 equivalent exists). In the short term:

- **NO** provide universal Bitcoin DApp provider injection.
- If you need to support specific Bitcoin DApp, you can extend a small number of special methods for BTC in `walletBridge` (such as `btc_getAddresses`, `btc_signPsbt`), and then design them as needed.

The focus of BTC integration at this stage is:

- Balance display
- Address display and copy / payment QR code
- Basic sending function (P2WPKH transfer)

---

## 8. Dependency list

```bash
# Bitcoin Core with address/script support
yarn add bitcoinjs-lib bip32 tiny-secp256k1

# HTTP client (if the project already has axios, it can be reused)
yarn add axios
```

Notice:

- `bitcoinjs-lib` requires `tiny-secp256k1` as a curve implementation, needs to be installed explicitly.
- If the package volume pressure is too high, dynamic import and Tree Shaking can be used to reduce the load on the first screen.

---

## 9. Implementation steps and milestones

### Phase 1: Key and chain basics (about 1 week)

1. Extend the `ChainFamily` and `Chain` interfaces and add Bitcoin-related configurations and constants.
2. Implement `BitcoinKeyService` (from masterSeed → P2WPKH address).
3. Add BTC address display and copy functions to the account details page.

### Phase 2: UTXO and transfer (about 1–1.5 weeks)

1. Integrate the public Bitcoin API to complete UTXO query and balance calculation.
2. Implement `BitcoinService.buildAndSignTransaction` and `broadcast`.
3. Added `BitcoinSendForm`, supporting:

- Enter the target address and amount.
- Estimation and display of handling fees.
- Passkey verification + broadcast.

### Phase 3: Transaction History and Testnet (about 1 week)

1. Integrate address transaction history query and display it in the UI:

- Collection/payment/fee information.

2. Add Bitcoin Testnet support:

- Testnet address prefix `tb1q...`.
- Testnet API and browser linking.

3. Documentation and user education (explanation of UTXO/handling fees/transaction confirmation).

### Phase 4: Optimization and security audit (about 1 week)

1. Unit testing:

- HD derivation path correctness.
- Address format verification.
- Calculation of handling fees and change.

2. Front-end defense:

- Prevent repeated broadcasts caused by multiple clicks.
- Clear error messages (insufficient balance, low handling fee, API unavailable).

3. Package size and performance optimization (Lazy-load Bitcoin module on demand).

---

## 10. Risks and Precautions

1. **Public API Centralization Risk**

- Depends on third-party services such as Blockstream/mempool.space.
- Mitigation: Supports multi-API configuration and automatically downgrades to alternative APIs when errors occur.

2. **UTXO and change complexity**

- Using a simple currency selection strategy in the early stage may lead to excessive fragmentation of UTXO.
- More intelligent Coin Selection (BnB/Knapsack, etc.) can be added in the future.

3. **MasterSeed length and standard difference**

- This project's `masterSeed` is not a standard BIP39 seed, but the BIP32 specification allows arbitrary 128–512 bit input.
- Need to verify through testing: the same masterSeed can deterministically generate the same BTC address on multiple devices.

4. **Address scanning and gap limit**

- The current solution is simplified to single address (or small number of addresses) mode.
- If multiple receiving addresses are supported in the future, "address scan depth" and gap limit need to be designed to avoid missing balances.

---

## in conclusion

- **Recommended technical route**: `bitcoinjs-lib` + `bip32` + public Bitcoin API (such as Blockstream).
- **Satisfy core constraints**:
- ✅ No self-built server: all queries and broadcasts use public/free API.
- ✅ No third-party wallet: fully self-hosted, locally derived secp256k1 private key from `masterSeed`.
- ✅ The private key only exists in the browser memory, and all signing operations are completed on the client side.
- ✅ Authentication is uniformly driven by Passkey, and Bitcoin and EVM/Solana use the same login state and masterSeed.
