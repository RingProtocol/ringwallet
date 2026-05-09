# Solana Wallet Integration Solution

## Project status analysis

Current wallet architecture:

- **Framework**: React + TypeScript + Next.js
- **EVM Interaction**: ethers.js v6
- **Key Management**: Passkey + custom 32-byte masterSeed (embedded WebAuthn userHandle)
- **HD derived**: `ethers.HDNodeWallet.fromSeed()` → secp256k1, path `m/44'/60'/0'/0/${i}`
- **Account Type**: EOA + Smart Contract Wallet (ERC-4337/EIP-7951)
- **Existing Chains**: Ethereum, Optimism, Arbitrum, Polygon

**Core constraints (user requirements):**

1. **Does not rely on self-built servers** - Use public/third-party RPC nodes, no need to operate Solana nodes
2. **Does not rely on third-party wallet App** — Completely self-hosted, does not rely on plug-in wallets such as Phantom/Solflare

---

## Solution selection evaluation

### ~~Option 2: Wallet-Adapter~~ ❌ Does not meet the requirements

Users are required to install an external wallet, which directly conflicts with the "not relying on third-party wallet App" constraint. **Exclude directly. **

### ~~Option 3: Solana Mobile Wallet Adapter~~ ❌ Does not meet the requirements

It is mainly aimed at native mobile terminals and is not suitable for PWA self-hosting scenarios. **Exclude directly. **

### Solution 4: Lightweight RPC encapsulation ⚠️ Not recommended

Problems with purely handwritten JSON-RPC encapsulation:

- Solana transaction serialization format is complex (including Header, Instruction, AccountKeys, Signatures)
- SPL Token ATA address calculation involves Program Derived Address (PDA) logic
- VersionedTransaction / AddressLookupTable are harder to handle manually
- It is easy to introduce security vulnerabilities and the maintenance cost is extremely high

**It is not recommended to build your own ground floor. **

### ✅ Recommended solution: `@solana/web3.js` v1 + self-hosted key derivation

---

## Recommended solution: Solana Web3.js v1 + layered architecture

### Reasons for selection

| Dimensions                           | Assessment                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------- |
| Does not rely on external wallet App | ✅ Fully self-hosted, private keys are derived locally from masterSeed      |
| Does not rely on self-built servers  | ✅ Use public RPC / free third-party RPC                                    |
| Fully functional                     | ✅ Supports SOL transfer, SPL Token, transaction history                    |
| Security                             | ✅ The official database has been audited and has the most mature ecosystem |
| Maintenance cost                     | ✅ Official library alongside ethers.js                                     |
| Package size                         | ⚠️ ~500KB gzipped, can be optimized by tree-shaking                         |

> **Note v1 vs v2**: `@solana/web3.js` v2 (i.e. `@solana/kit`) is a new modular API,
> Tree shaking is more thorough, but eco-tool support is still incomplete as of 2026. It is recommended to use v1 first and migrate after the ecosystem is stable.

### Architecture diagram

```
┌─────────────────────────────────────────────────────────────┐
│ UI Layer (React Components) │
├─────────────────────────────────────────────────────────────┤
│Chain Abstraction Layer (new) │
│         ChainFamily: EVM | Solana | ...                       │
├──────────────────────────┬──────────────────────────────────┤
│  EVMService (ethers.js)  │  SolanaService (@solana/web3.js)  │
├──────────────────────────┴──────────────────────────────────┤
│              Key Management (masterSeed via Passkey)          │
│    EVM: BIP32/secp256k1  │  Solana: SLIP-0010/Ed25519        │
└─────────────────────────────────────────────────────────────┘
```

---

## Key technical issues and revisions

### 1. ⚠️ Key derivation revision (the original solution is defective)

The original solution uses `@noble/curves/ed25519` but does not explain how to derive SLIP-0010.

**Solana Key Derivation Specification:**

- Curve: **Ed25519** (different from EVM's secp256k1)
- Specification: **SLIP-0010** (Ed25519 only supports hardened derivation, add `''` to all path nodes)
- Path: `m/44'/501'/index'/0'' (index is the account index)

**Correct implementation: use `ed25519-hd-key`**

```typescript
// dependency
// yarn add ed25519-hd-key
// (Internally using @noble/ed25519 to implement SLIP-0010)

import { derivePath } from 'ed25519-hd-key'
import { Keypair } from '@solana/web3.js'

export class SolanaKeyService {
  /**
   * Derive Solana Keypair from masterSeed
   * masterSeed: 32 bytes from Passkey userHandle
   * index: account index, default 0
   */
  static deriveKeypair(masterSeed: Uint8Array, index = 0): Keypair {
    // ed25519-hd-key requires seed in hex format
    const seedHex = Buffer.from(masterSeed).toString('hex')
    // SLIP-0010 Path: All nodes must be hardened (Ed25519 restriction)
    const path = `m/44'/501'/${index}'/0'`
    const { key } = derivePath(path, seedHex)
    // Keypair.fromSeed accepts a 32-byte private key and automatically calculates the public key internally
    return Keypair.fromSeed(Uint8Array.from(key))
  }

  static getAddress(masterSeed: Uint8Array, index = 0): string {
    return this.deriveKeypair(masterSeed, index).publicKey.toBase58()
  }
}
```

> **Key difference**: The original document path `m/44'/501'/0'/${index}'` is wrong,
> The correct Solana BIP44 standard path is `m/44'/501'/${index}'/0'`,
> Consistent with mainstream wallets such as Phantom and Solflare (the same seed derives the same address).

---

### 2. ✅ RPC node selection (no self-built server)

In the original plan, `solana-api.projectserum.com` (Serum) has been closed. Revised to the following options:

| Provider                 | Free Credit            | Mainnet URL                                   | Notes                         |
| ------------------------ | ---------------------- | --------------------------------------------- | ----------------------------- |
| **Helius**               | 1 million Credit/month | `https://mainnet.helius-rpc.com/?api-key=KEY` | Recommended, easy rate        |
| **QuickNode**            | 50 million times/month | QuickNode Console                             | Free Plan                     |
| **Ankr**                 | Unlimited (Public)     | `https://rpc.ankr.com/solana`                 | Free, subject to fluctuations |
| **Official Public Node** | Rate limited           | `https://api.mainnet-beta.solana.com`         | Development/Downgrade backup  |
| **Devnet**               | Unlimited              | `https://api.devnet.solana.com`               | Testing only                  |

**Recommended configuration method (`.env`):**

```env
VITE_SOLANA_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_FREE_KEY
VITE_SOLANA_DEVNET_RPC=https://api.devnet.solana.com
```

---

### 3. ✅ Transaction structure revision (added blockhash processing)

The original solution lacks `getLatestBlockhash()` and confirmation strategy. Solana transactions have a validity period of ~150 slots (~1 minute) and need to be processed correctly.

```typescript
// src/services/solanaService.ts
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SendTransactionError,
} from '@solana/web3.js'

export class SolanaService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  // Query SOL balance (unit: SOL)
  async getBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address)
    const lamports = await this.connection.getBalance(pubkey)
    return lamports / LAMPORTS_PER_SOL
  }

  // Send SOL (with full blockhash processing)
  async sendSOL(
    senderKeypair: Keypair,
    recipient: string,
    amountSOL: number
  ): Promise<string> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed')

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKeypair.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: new PublicKey(recipient),
        lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
      })
    )

    const signature = await this.connection.sendTransaction(
      transaction,
      [senderKeypair],
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    )

    // Confirm using blockhash strategy (more reliable than signature-only)
    const result = await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )

    if (result.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`)
    }

    return signature
  }

  // Estimated transaction fee (unit: SOL)
  async estimateFee(
    senderPubkey: PublicKey,
    recipient: string,
    lamports: number
  ): Promise<number> {
    const { blockhash } = await this.connection.getLatestBlockhash()
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderPubkey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: new PublicKey(recipient),
        lamports,
      })
    )
    const fee = await transaction.getEstimatedFee(this.connection)
    return (fee ?? 5000) / LAMPORTS_PER_SOL
  }
}
```

---

### 4. ✅ SPL Token revision (ATA creation cost description)

```typescript
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token'

export class SolanaTokenService {
  constructor(private connection: Connection) {}

  async getTokenBalance(owner: string, mint: string): Promise<string> {
    const ownerPubkey = new PublicKey(owner)
    const mintPubkey = new PublicKey(mint)
    const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
    try {
      const balance = await this.connection.getTokenAccountBalance(ata)
      return balance.value.uiAmountString ?? '0'
    } catch {
      return '0' // ATA does not exist = balance is 0
    }
  }

  /**
   * Send SPL Token
   *Note: If the payee does not have an ATA, the sender needs to pay the ATA creation fee (approximately 0.002 SOL)
   * This fee is paid by the sender's SOL balance and needs to be prompted to the user at the UI layer
   */
  async sendToken(
    senderKeypair: Keypair,
    recipient: string,
    mint: string,
    amount: bigint
  ): Promise<string> {
    const mintPubkey = new PublicKey(mint)
    const recipientPubkey = new PublicKey(recipient)

    const senderATA = await getAssociatedTokenAddress(
      mintPubkey,
      senderKeypair.publicKey
    )
    const recipientATA = await getAssociatedTokenAddress(
      mintPubkey,
      recipientPubkey
    )

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed')

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKeypair.publicKey,
    })

    // Check whether the payee ATA exists. If it does not exist, add a create instruction.
    try {
      await getAccount(this.connection, recipientATA)
    } catch (err) {
      if (err instanceof TokenAccountNotFoundError) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderKeypair.publicKey, // Payer
            recipientATA,
            recipientPubkey,
            mintPubkey
          )
        )
      } else {
        throw err
      }
    }

    transaction.add(
      createTransferInstruction(
        senderATA,
        recipientATA,
        senderKeypair.publicKey,
        amount
      )
    )

    const signature = await this.connection.sendTransaction(transaction, [
      senderKeypair,
    ])
    await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )

    return signature
  }
}
```

---

### 5. ✅ Signature process description (relationship between Passkey and Solana)

> **Important clarification**: Passkey (WebAuthn) uses the P-256 (secp256r1) curve and **cannot directly sign Solana transactions**.
> Solana asked for Ed25519's signature.

Actual signing process:

```
User triggers sending
     ↓
PasskeyService.verifyIdentity() ← Biometric authentication (prevents unauthorized operations)
     ↓
masterSeed in AuthContext ← restored from Passkey userHandle on login
     ↓
SolanaKeyService.deriveKeypair(masterSeed, index) ← SLIP-0010/Ed25519 Derived
     ↓
Keypair.sign(transaction) ← Ed25519 Signature Solana Transaction
     ↓
connection.sendTransaction() ← Broadcast to RPC node
```

The private key is derived in real time in memory, is lost after use, and is never persisted, consistent with the existing EVM process.

---

### 6. Chain interface extension

```typescript
// src/models/ChainType.ts
export enum ChainFamily {
  EVM = 'evm',
  Solana = 'solana',
}

// Modify the Chain interface (originally defined in AuthContext.tsx, the id is number and is exclusive to EVM)
export interface Chain {
  id: number | string // EVM: chainId (number) | Solana: 'solana-mainnet' etc.
  name: string
  symbol: string
  family: ChainFamily
  rpcUrl: string
  explorer: string
  // EVM proprietary
  chainId?: number
  bundlerUrl?: string
  entryPoint?: string
  factoryAddress?: string
  // Solana exclusive
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet'
}

export const SOLANA_CHAINS: Chain[] = [
  {
    id: 'solana-mainnet',
    name: 'Solana',
    symbol: 'SOL',
    family: ChainFamily.Solana,
    rpcUrl:
      process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC ??
      'https://api.mainnet-beta.solana.com',
    explorer: 'https://solscan.io',
    cluster: 'mainnet-beta',
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    symbol: 'SOL',
    family: ChainFamily.Solana,
    rpcUrl: 'https://api.devnet.solana.com',
    explorer: 'https://solscan.io/?cluster=devnet',
    cluster: 'devnet',
  },
]
```

---

## Dependency list

```bash
# Solana Core SDK
yarn add @solana/web3.js @solana/spl-token

#Ed25519 SLIP-0010 HD derivative (designed specifically for Solana paths)
yarn add ed25519-hd-key
```

> **Why use `ed25519-hd-key` instead of `@noble/curves`? **
> `@noble/curves` only provides Ed25519 elliptic curve operations and does not contain SLIP-0010 derivation logic.
> `ed25519-hd-key` fully implements the SLIP-0010 specification and is compatible with the Phantom/Solflare path.
> Also uses `@noble/ed25519` internally.

---

## Implementation steps (revised version)

### Phase 1: Keys and RPC Basics (1 week)

1. Install dependencies: `@solana/web3.js`, `@solana/spl-token`, `ed25519-hd-key`
2. Implement `SolanaKeyService` (derived from SLIP-0010 Ed25519, path verification)
3. Implement `SolanaService` (Connection management, balance query, SOL transfer)
4. Extend the `Chain` interface and add the `ChainFamily` enumeration
5. Configure RPC environment variables (Helius free account)

### Phase 2: UI Integration (1 week)

1. Update `ChainSwitcher` - support displaying Solana chain, EVM/Solana grouping
2. Update `BalanceDisplay` — offload calls based on `chain.family`
3. Update `TokenBalance` — SPL Token list query
4. Update sending form - Solana address verification (Base58, 32-44 characters)
5. Update `AuthContext` — support Solana Wallet type

### Phase 3: SPL Token and Advanced Features (1 week)

1. `SolanaTokenService` — implements complete SPL Token transfer (including ATA check)
2. UI prompts ATA creation fee (~0.002 SOL)
3. Token list: Integrate [Jupiter Token List](https://token.jup.ag/strict) or Solana Token Registry
4. Transaction history: call `connection.getSignaturesForAddress()` to resolve

### Phase 4: Testing and Optimization (1 week)

1. Unit testing: key derivation, address verification
2. Devnet integration test: Faucet → Transfer → Query
3. Network switching test: Mainnet ↔ Devnet
4. Package size optimization: import `@solana/web3.js` sub-path on demand

---

## Key Notes

### Address format verification

```typescript
import { PublicKey } from '@solana/web3.js'

function isValidSolanaAddress(address: string): boolean {
  try {
    const pubkey = new PublicKey(address)
    return PublicKey.isOnCurve(pubkey.toBytes())
  } catch {
    return false
  }
}
// EVM: 0x + 40 hex chars
// Solana: Base58, 32-44 chars, not starting with 0x
```

### Devnet airdrop (for development and testing)

```typescript
async function requestAirdrop(address: string, solAmount = 1): Promise<void> {
  const connection = new Connection(
    'https://api.devnet.solana.com',
    'confirmed'
  )
  const sig = await connection.requestAirdrop(
    new PublicKey(address),
    solAmount * LAMPORTS_PER_SOL
  )
  await connection.confirmTransaction(sig, 'confirmed')
}
```

### Transaction fee description

| Operation                                  | Approximate Cost                              |
| ------------------------------------------ | --------------------------------------------- |
| SOL Transfer                               | ~0.000005 SOL (5000 lamports)                 |
| SPL Token transfer (ATA already exists)    | ~0.000005 SOL                                 |
| SPL Token transfer (requires creating ATA) | ~0.002 SOL (ATA rent)                         |
| Devnet/Testnet                             | Same structure as Mainnet, but using airdrops |

---

## Scheme comparison summary (final version)

| Features                             | Web3.js v1 ✅     | Wallet-Adapter ❌           | Custom RPC ❌                 |
| ------------------------------------ | ----------------- | --------------------------- | ----------------------------- |
| Does not rely on external wallet App | ✅                | ❌ (requires Phantom, etc.) | ✅                            |
| Does not rely on self-built servers  | ✅ (Public RPC)   | ✅                          | ✅                            |
| Fully functional                     | ✅                | Partial                     | Requires a lot of handwriting |
| Package size                         | ~500KB gz         | Small                       | Very small                    |
| Security                             | ✅ Official audit | ✅                          | ⚠️ Self-built risks           |
| Development and maintenance costs    | Low               | Low (not applicable)        | Very high                     |

---

## in conclusion

**Final recommendation**: `@solana/web3.js` v1 + `ed25519-hd-key` + public RPC (Helius free tier)

**Meets Requirements**:

- ✅ No self-built server: use Helius/Ankr/official public RPC
- ✅ No third-party wallet: private keys are completely derived locally from masterSeed, and Ed25519 signing is done in the browser
- ✅ Fully self-hosted: private keys only exist in memory, relying on Passkey biometric protection masterSeed

**Estimated workload**: 3-4 weeks (shorter than the original plan because the direction is clearer)

**Main Risks**:

1. `masterSeed` is only 32 bytes (non-standard BIP39 64 bytes) and needs to be verified for `ed25519-hd-key` compatibility
2. Change the `Chain` interface `id: number` to `number | string` and check all uses.
3. Solana ATA creation fee UX needs to be clearly informed to users
