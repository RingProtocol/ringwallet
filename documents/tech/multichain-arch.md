# Multi-chain wallet plug-in architecture design

> This document describes Ring Wallet’s multi-chain account generation & signature architecture reconstruction plan.
> The goal is to support 100+ chains while keeping the code structure clear.

---

## 1. Current situation problem

In the current architecture, the key derivation and signature logic of each chain family (EVM/Solana/Bitcoin) are scattered in independent Service files.
And `AuthContext` directly hardcodes the call to each Service:

```typescript
AuthContext.tsx
├── import WalletService (EVM derived)
├── import SolanaKeyService (Solana derived)
├── import BitcoinKeyService (Bitcoin derived)
│
├── login()
│   ├── WalletService.deriveWallets(seed, 5)
│   ├── SolanaKeyService.deriveWallets(seed, 5)
│   └── BitcoinKeyService.deriveWallets(seed, 5)
│
├── state: wallets[]              (EVM)
├── state: solanaWallets[]        (Solana)
└── state: bitcoinWallets[]       (Bitcoin)
```

**question:**

- Every time a new chain family is added, `AuthContext` must be modified (add import, add state, add derive call)
- The interfaces of each Service are not unified (`DerivedWallet` vs `DerivedSolanaWallet` vs `DerivedBitcoinWallet`)
- Wallets that cannot traverse/operate all chains in a unified way

---

## 2. Target architecture: main framework + chain plug-in

```
                        ┌──────────────────────┐
│ ChainPluginRegistry │ ← Registration Center (single case)
                        │                      │
                        │  register(plugin)     │
                        │  get(family)          │
                        │  deriveAllAccounts()  │
                        └──────────┬───────────┘
                                   │
     ┌──────────┬──────────┬───────┼────────┬──────────┐
     │          │          │       │        │          │
  ┌──▼───┐  ┌──▼────┐  ┌──▼──┐ ┌─▼──┐  ┌──▼───┐     ...
│ EVM │ │Solana │ │ BTC │ │Tron│ │Cosmos│ The chain of the future
  └──┬───┘  └──┬────┘  └──┬──┘ └─┬──┘  └──┬───┘
     │         │          │      │         │
  ethers.js  web3.js  bitcoinjs  ethers  bip32+bech32
```

### Core Principles

1. **Unified Interface** — All chain plug-ins implement the same `ChainPlugin` interface
2. **Self-registration** — Each plug-in file is automatically registered to the Registry when exported
3. **AuthContext is not aware of chain details** - only operates through the Registry and does not directly import the chain Service
4. **Underlying Service reserved** — The plug-in serves as an adaptation layer and is delegated to the existing KeyService/Service implementation

---

## 3. Unified interface definition

### 3.1 DerivedAccount — Unified account type

```typescript
interface DerivedAccount {
  index: number //Account number (0, 1, 2, ...)
  address: string // On-chain address
  privateKey: string // hex encoded key material (32 bytes)
  path: string // BIP derived path, e.g. "m/44'/60'/0'/0/0"
  meta?: Record<string, unknown> // Chain-specific additional fields
}
```

`meta` is used to store chain-specific data, for example:

- Bitcoin: `{ publicKey: "0x...", isTestnet: false }`
- Cosmos: `{ publicKey: "0x...", coinType: 118, addressPrefix: "cosmos" }`
- Tron / Solana / EVM: `{}` (no extra fields)

### 3.2 ChainPlugin — plug-in interface

```typescript
interface ChainPlugin {
  /** Chain family identification */
  readonly family: ChainFamily

  /** Derive N accounts from masterSeed. options are used for chain-specific parameters (such as Cosmos’ coinType/addressPrefix) */
  deriveAccounts(
    masterSeed: Uint8Array,
    count: number,
    options?: Record<string, unknown>
  ): DerivedAccount[]

  /** Verify address format */
  isValidAddress(address: string): boolean

  /** Sign transaction */
  signTransaction(privateKey: string, request: SignRequest): Promise<SignResult>

  /** Broadcast signed transaction */
  broadcastTransaction(signed: SignResult, rpcUrl: string): Promise<string>
}
```

### 3.3 SignRequest / SignResult — Signature interface

```typescript
interface SignRequest {
  from: string
  to: string
  amount: string // human readable amount (e.g. "0.1")
  rpcUrl: string
  chainConfig: Chain
  options?: Record<string, unknown> // Chain specific options
}

interface SignResult {
  rawTx: string // Signed transaction (hex or serialized format)
  txHash?: string // Precomputed transaction hash (optional)
  meta?: Record<string, unknown>
}
```

`options` Example:

- EVM: `{ tokenAddress: "0x...", tokenDecimals: 18 }`
- Solana: `{ mint: "EPjFWdd5..." }` (SPL token)
- Bitcoin: `{ feeRate: 5, masterSeed: Uint8Array, addressIndex: 0 }`
- Cosmos `deriveAccounts` options: `{ coinType: 505, addressPrefix: "pb" }` (Provenance)

---

## 4. Plug-in registration mechanism

```typescript
class ChainPluginRegistry {
  private plugins = new Map<ChainFamily, ChainPlugin>()

  register(plugin: ChainPlugin): void {
    this.plugins.set(plugin.family, plugin)
  }

  get(family: ChainFamily): ChainPlugin | undefined {
    return this.plugins.get(family)
  }

  has(family: ChainFamily): boolean {
    return this.plugins.has(family)
  }

  families(): ChainFamily[] {
    return [...this.plugins.keys()]
  }

  /**
   * Derive all registered chain accounts at once.
   * AuthContext calls this method during login / restore.
   */
  deriveAllAccounts(
    masterSeed: Uint8Array,
    count: number
  ): Record<ChainFamily, DerivedAccount[]> {
    const result: Record<string, DerivedAccount[]> = {}
    for (const [family, plugin] of this.plugins) {
      try {
        result[family] = plugin.deriveAccounts(masterSeed, count)
      } catch (e) {
        console.error(`Failed to derive ${family} accounts:`, e)
        result[family] = []
      }
    }
    return result as Record<ChainFamily, DerivedAccount[]>
  }
}

//Global singleton
export const chainRegistry = new ChainPluginRegistry()
```

---

## 5. Plug-in implementation example

### 5.1 EVM plug-in

```typescript
import { chainRegistry } from '../registry'

class EvmChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.EVM

  deriveAccounts(masterSeed: Uint8Array, count: number): DerivedAccount[] {
    // Delegate to existing WalletService.deriveWallets()
    return WalletService.deriveWallets(masterSeed, count)
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address)
  }

  async signTransaction(
    privateKey: string,
    req: SignRequest
  ): Promise<SignResult> {
    const chainId = req.chainConfig.id as number
    const signed = await WalletService.signTransaction(
      privateKey,
      req.to,
      req.amount,
      chainId,
      req.rpcUrl,
      req.options?.tokenAddress
        ? {
            address: req.options.tokenAddress as string,
            decimals: req.options.tokenDecimals as number,
          }
        : undefined
    )
    return { rawTx: signed }
  }

  async broadcastTransaction(
    signed: SignResult,
    rpcUrl: string
  ): Promise<string> {
    return WalletService.broadcastEOATransaction(signed.rawTx, rpcUrl)
  }
}

chainRegistry.register(new EvmChainPlugin())
```

### 5.2 New link input process

Take adding a new chain family as an example (such as TON, Aptos, SUI):

1. Add new value in `ChainFamily` enumeration (`src/models/ChainType.ts`)
2. Create `src/services/chainplugins/<chain>/<chain>Plugin.ts` and implement the `ChainPlugin` interface
3. Call `chainRegistry.register(new XxxPlugin())` at the end of the file
4. Add `import './<chain>/<chain>Plugin'` in `src/services/chainplugins/index.ts`
5. Add chain configuration (mainnet + testnet) in `chains.ts`
6. Add `<chain>Plugin.test.ts` test case under `src/services/chainplugins/<chain>/`

**No need to modify `AuthContext`. **

---

## 6. AuthContext Refactoring

### Before (hardcoded)

```typescript
// 3 independent states
const [wallets, setWallets] = useState<Wallet[]>([])
const [solanaWallets, setSolanaWallets] = useState<Wallet[]>([])
const [bitcoinWallets, setBitcoinWallets] = useState<Wallet[]>([])

//hardcode each chain in login()
const evmWallets = WalletService.deriveWallets(seed, 5)
const solWallets = SolanaKeyService.deriveWallets(seed, 5)
const btcWallets = BitcoinKeyService.deriveWallets(seed, 5)
```

### After (plug-in driver)

```typescript
// A unified map
const [accountsByFamily, setAccountsByFamily] = useState<
  Record<string, DerivedAccount[]>
>({})

// Called uniformly in login() / restore
const allAccounts = chainRegistry.deriveAllAccounts(seed, 5)
setAccountsByFamily(allAccounts)

// Get the active wallet based on the current chain
const activeAccounts = accountsByFamily[activeChain.family] ?? []
const activeWallet = activeAccounts[activeWalletIndex] ?? null
```

### compatibility

To maintain backward compatibility, `AuthContextValue` is also exposed:

- **New API**: `accountsByFamily`, `activeAccount`
- **Old API** (deprecated): `wallets`, `solanaWallets`, `bitcoinWallets` — calculated from `accountsByFamily`

---

## 7. Directory structure

```
src/services/chains/
├── types.ts                       # ChainPlugin, DerivedAccount, SignRequest, SignResult
├── registry.ts # ChainPluginRegistry singleton
├── registry.test.ts # Registration center integration test
├── index.ts # barrel export + triggers all plug-in registrations
├── evm/
│ ├── evmPlugin.ts # EVM plug-in (ethers.js, BIP44 m/44'/60')
│   └── evmPlugin.test.ts
├── solana/
│ ├── solanaPlugin.ts # Solana plug-in (SLIP-0010, m/44'/501')
│   └── solanaPlugin.test.ts
├── bitcoin/
│ ├── bitcoinPlugin.ts # Bitcoin plugin (BIP32, m/44'/0')
│   └── bitcoinPlugin.test.ts
├── tron/
│ ├── tronPlugin.ts # Tron plug-in (secp256k1, m/44'/195', Base58Check)
│   └── tronPlugin.test.ts
└── cosmos/
├── cosmosPlugin.ts # Cosmos plug-in (secp256k1, m/44'/118', Bech32)
    └── cosmosPlugin.test.ts
```

In the future, new chains only need to add subdirectories + plug-in files under `src/services/chains/`.

---

## 8. Not implemented yet

- **EIP-4337 Smart Contract Wallet** — `WalletType.SmartContract` and `signEIP7951Transaction` are retained in `walletService.ts` and are not included in the plug-in system
- **Token Service** — Token-related operations such as `SolanaTokenService` are not included in the plug-in interface for the time being and will be expanded as needed in the future.
- **DApp Bridge transformation** — `WalletBridge` maintains the existing implementation for now

---

## 9. Supported chain families (Top 10)

| Ranking | Chain           | Family  | Plug-in | Key Algorithm       | Derivation Path     | Address Format  | Testnet          |
| ------- | --------------- | ------- | ------- | ------------------- | ------------------- | --------------- | ---------------- |
| 1       | Ethereum        | EVM     | ✅      | secp256k1 (BIP32)   | m/44'/60'/0'/0/{i}  | 0x + hex20      | Sepolia          |
| 2       | Solana          | Solana  | ✅      | Ed25519 (SLIP-0010) | m/44'/501'/{i}'/0'  | Base58          | Devnet           |
| 3       | BNB Smart Chain | EVM     | ✅      | Same as EVM         | Same as EVM         | Same as EVM     | BSC Testnet      |
| 4       | Tron            | Tron    | ✅      | secp256k1 (BIP32)   | m/44'/195'/0'/0/{i} | T + Base58Check | Shasta           |
| 5       | Base            | EVM     | ✅      | Same as EVM         | Same as EVM         | Same as EVM     | Base Sepolia     |
| 6       | Bitcoin         | Bitcoin | ✅      | secp256k1 (BIP32)   | m/44'/0'/0'/0/{i}   | bc1q (P2WPKH)   | Testnet          |
| 7       | Arbitrum        | EVM     | ✅      | Same as EVM         | Same as EVM         | Same as EVM     | Arbitrum Sepolia |
| 8       | Hyperliquid     | EVM     | ✅      | Same as EVM         | Same as EVM         | Same as EVM     | —                |
| 9       | Provenance      | Cosmos  | ✅      | secp256k1 (BIP32)   | m/44'/505'/0'/0/{i} | pb1 (Bech32)    | —                |
| 10      | Plasma          | EVM     | ✅      | Same as EVM         | Same as EVM         | Same as EVM     | —                |

The Cosmos plugin supports custom derivation via `options.coinType` and `options.addressPrefix`,
Can cover all Cosmos SDK chains such as Cosmos Hub (118/cosmos), Osmosis (118/osmo), Provenance (505/pb), etc.

---

## 10. Migration progress

1. ✅ Define `ChainPlugin` / `DerivedAccount` unified interface
2. ✅ Implement `ChainPluginRegistry`
3. ✅ Implement five plug-ins for EVM / Solana / Bitcoin / Tron / Cosmos
4. ✅ Refactor `AuthContext` to use Registry derived account
5. ✅ Add Tron / Cosmos mainnet + testnet chain configuration
6. ✅ Add independent test cases for each plugin (90 tests, all passing)
7. 🔜 Gradually migrate the SendForm component to use the plug-in signature interface
8. 🔜 Add new chains (TON, Aptos, SUI, Starknet...)

---

## 11. Test

Run all chain plugin tests:

```bash
npx vitest run src/services/chains/
```

Test coverage:

- **Deterministic derivation** — the same seed always produces the same address
- **Multiple Account Isolation** — Different indexes generate different addresses
- **Cross-chain isolation** — the same seed generates different addresses in different chain families
- **Address Format** — Verify that the address format of each chain is correct
- **Address verification** — `isValidAddress` correctly identifies legal/illegal addresses
- **Boundary Condition** — Exception handling for invalid seed
