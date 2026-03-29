# 多链钱包插件架构设计

> 本文档描述 Ring Wallet 的多链账户生成 & 签名架构重构方案，
> 目标是支持 100+ 条链的同时保持代码结构清晰。

---

## 1. 现状问题

当前架构中，每条链家族（EVM / Solana / Bitcoin）的密钥派生和签名逻辑分散在独立的 Service 文件中，
且 `AuthContext` 直接硬编码了对每个 Service 的调用：

```typescript
AuthContext.tsx
├── import WalletService          (EVM 派生)
├── import SolanaKeyService       (Solana 派生)
├── import BitcoinKeyService      (Bitcoin 派生)
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

**问题：**

- 每新增一条链家族，都要修改 `AuthContext`（加 import、加 state、加 derive 调用）
- 各 Service 的接口不统一（`DerivedWallet` vs `DerivedSolanaWallet` vs `DerivedBitcoinWallet`）
- 无法用统一的方式遍历/操作所有链的钱包

---

## 2. 目标架构：主框架 + 链插件

```
                        ┌──────────────────────┐
                        │ ChainPluginRegistry  │  ← 注册中心（单例）
                        │                      │
                        │  register(plugin)     │
                        │  get(family)          │
                        │  deriveAllAccounts()  │
                        └──────────┬───────────┘
                                   │
     ┌──────────┬──────────┬───────┼────────┬──────────┐
     │          │          │       │        │          │
  ┌──▼───┐  ┌──▼────┐  ┌──▼──┐ ┌─▼──┐  ┌──▼───┐     ...
  │ EVM  │  │Solana │  │ BTC │ │Tron│  │Cosmos│  未来的链
  └──┬───┘  └──┬────┘  └──┬──┘ └─┬──┘  └──┬───┘
     │         │          │      │         │
  ethers.js  web3.js  bitcoinjs  ethers  bip32+bech32
```

### 核心原则

1. **统一接口** — 所有链插件实现同一个 `ChainPlugin` 接口
2. **自注册** — 每个插件文件导出时自动注册到 Registry
3. **AuthContext 不感知链细节** — 只通过 Registry 操作，不直接 import 链 Service
4. **底层 Service 保留** — 插件作为适配层，委托给现有的 KeyService / Service 实现

---

## 3. 统一接口定义

### 3.1 DerivedAccount — 统一账户类型

```typescript
interface DerivedAccount {
  index: number // 账户序号 (0, 1, 2, ...)
  address: string // 链上地址
  privateKey: string // hex 编码的密钥材料 (32 bytes)
  path: string // BIP 派生路径, e.g. "m/44'/60'/0'/0/0"
  meta?: Record<string, unknown> // 链特定的附加字段
}
```

`meta` 用于存放链特有数据，例如：

- Bitcoin: `{ publicKey: "0x...", isTestnet: false }`
- Cosmos: `{ publicKey: "0x...", coinType: 118, addressPrefix: "cosmos" }`
- Tron / Solana / EVM: `{}` (无额外字段)

### 3.2 ChainPlugin — 插件接口

```typescript
interface ChainPlugin {
  /** 链家族标识 */
  readonly family: ChainFamily

  /** 从 masterSeed 派生 N 个账户。options 用于链特定参数（如 Cosmos 的 coinType/addressPrefix） */
  deriveAccounts(
    masterSeed: Uint8Array,
    count: number,
    options?: Record<string, unknown>
  ): DerivedAccount[]

  /** 验证地址格式 */
  isValidAddress(address: string): boolean

  /** 签署交易 */
  signTransaction(privateKey: string, request: SignRequest): Promise<SignResult>

  /** 广播已签名交易 */
  broadcastTransaction(signed: SignResult, rpcUrl: string): Promise<string>
}
```

### 3.3 SignRequest / SignResult — 签名接口

```typescript
interface SignRequest {
  from: string
  to: string
  amount: string // 人类可读金额 (e.g. "0.1")
  rpcUrl: string
  chainConfig: Chain
  options?: Record<string, unknown> // 链特定选项
}

interface SignResult {
  rawTx: string // 签名后的交易 (hex 或序列化格式)
  txHash?: string // 预计算的交易哈希 (可选)
  meta?: Record<string, unknown>
}
```

`options` 示例：

- EVM: `{ tokenAddress: "0x...", tokenDecimals: 18 }`
- Solana: `{ mint: "EPjFWdd5..." }` (SPL token)
- Bitcoin: `{ feeRate: 5, masterSeed: Uint8Array, addressIndex: 0 }`
- Cosmos `deriveAccounts` options: `{ coinType: 505, addressPrefix: "pb" }` (Provenance)

---

## 4. 插件注册机制

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
   * 一次性派生所有已注册链的账户。
   * AuthContext 在 login / restore 时调用此方法。
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

// 全局单例
export const chainRegistry = new ChainPluginRegistry()
```

---

## 5. 插件实现示例

### 5.1 EVM 插件

```typescript
import { chainRegistry } from '../registry'

class EvmChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.EVM

  deriveAccounts(masterSeed: Uint8Array, count: number): DerivedAccount[] {
    // 委托给现有 WalletService.deriveWallets()
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

### 5.2 新链接入流程

以添加新链家族为例（如 TON、Aptos、SUI）：

1. 在 `ChainFamily` 枚举中添加新值（`src/models/ChainType.ts`）
2. 创建 `src/services/chainplugins/<chain>/<chain>Plugin.ts`，实现 `ChainPlugin` 接口
3. 文件末尾调用 `chainRegistry.register(new XxxPlugin())`
4. 在 `src/services/chainplugins/index.ts` 中添加 `import './<chain>/<chain>Plugin'`
5. 在 `chains.ts` 中添加链配置（主网 + 测试网）
6. 在 `src/services/chainplugins/<chain>/` 下添加 `<chain>Plugin.test.ts` 测试用例

**不需要修改 `AuthContext`。**

---

## 6. AuthContext 重构

### Before (硬编码)

```typescript
// 3 个独立 state
const [wallets, setWallets] = useState<Wallet[]>([])
const [solanaWallets, setSolanaWallets] = useState<Wallet[]>([])
const [bitcoinWallets, setBitcoinWallets] = useState<Wallet[]>([])

// login() 中硬编码每条链
const evmWallets = WalletService.deriveWallets(seed, 5)
const solWallets = SolanaKeyService.deriveWallets(seed, 5)
const btcWallets = BitcoinKeyService.deriveWallets(seed, 5)
```

### After (插件驱动)

```typescript
// 一个统一的 map
const [accountsByFamily, setAccountsByFamily] = useState<
  Record<string, DerivedAccount[]>
>({})

// login() / restore 中统一调用
const allAccounts = chainRegistry.deriveAllAccounts(seed, 5)
setAccountsByFamily(allAccounts)

// 根据当前链获取活跃钱包
const activeAccounts = accountsByFamily[activeChain.family] ?? []
const activeWallet = activeAccounts[activeWalletIndex] ?? null
```

### 兼容性

为保持向后兼容，`AuthContextValue` 同时暴露：

- **新 API**: `accountsByFamily`, `activeAccount`
- **旧 API** (deprecated): `wallets`, `solanaWallets`, `bitcoinWallets` — 从 `accountsByFamily` 计算得出

---

## 7. 目录结构

```
src/services/chains/
├── types.ts                       # ChainPlugin, DerivedAccount, SignRequest, SignResult
├── registry.ts                    # ChainPluginRegistry 单例
├── registry.test.ts               # 注册中心集成测试
├── index.ts                       # barrel export + 触发所有插件注册
├── evm/
│   ├── evmPlugin.ts               # EVM 插件 (ethers.js, BIP44 m/44'/60')
│   └── evmPlugin.test.ts
├── solana/
│   ├── solanaPlugin.ts            # Solana 插件 (SLIP-0010, m/44'/501')
│   └── solanaPlugin.test.ts
├── bitcoin/
│   ├── bitcoinPlugin.ts           # Bitcoin 插件 (BIP32, m/44'/0')
│   └── bitcoinPlugin.test.ts
├── tron/
│   ├── tronPlugin.ts              # Tron 插件 (secp256k1, m/44'/195', Base58Check)
│   └── tronPlugin.test.ts
└── cosmos/
    ├── cosmosPlugin.ts            # Cosmos 插件 (secp256k1, m/44'/118', Bech32)
    └── cosmosPlugin.test.ts
```

未来新链只需在 `src/services/chains/` 下添加子目录 + 插件文件。

---

## 8. 暂不实现

- **EIP-4337 智能合约钱包** — `WalletType.SmartContract` 和 `signEIP7951Transaction` 保留在 `walletService.ts` 中不纳入插件体系
- **Token 服务** — `SolanaTokenService` 等 token 相关操作暂不纳入插件接口，后续按需扩展
- **DApp Bridge 改造** — `WalletBridge` 暂维持现有实现

---

## 9. 已支持的链家族 (Top 10)

| 排名 | 链              | 家族    | 插件 | 密钥算法            | 派生路径            | 地址格式        | 测试网           |
| ---- | --------------- | ------- | ---- | ------------------- | ------------------- | --------------- | ---------------- |
| 1    | Ethereum        | EVM     | ✅   | secp256k1 (BIP32)   | m/44'/60'/0'/0/{i}  | 0x + hex20      | Sepolia          |
| 2    | Solana          | Solana  | ✅   | Ed25519 (SLIP-0010) | m/44'/501'/{i}'/0'  | Base58          | Devnet           |
| 3    | BNB Smart Chain | EVM     | ✅   | 同 EVM              | 同 EVM              | 同 EVM          | BSC Testnet      |
| 4    | Tron            | Tron    | ✅   | secp256k1 (BIP32)   | m/44'/195'/0'/0/{i} | T + Base58Check | Shasta           |
| 5    | Base            | EVM     | ✅   | 同 EVM              | 同 EVM              | 同 EVM          | Base Sepolia     |
| 6    | Bitcoin         | Bitcoin | ✅   | secp256k1 (BIP32)   | m/44'/0'/0'/0/{i}   | bc1q (P2WPKH)   | Testnet          |
| 7    | Arbitrum        | EVM     | ✅   | 同 EVM              | 同 EVM              | 同 EVM          | Arbitrum Sepolia |
| 8    | Hyperliquid     | EVM     | ✅   | 同 EVM              | 同 EVM              | 同 EVM          | —                |
| 9    | Provenance      | Cosmos  | ✅   | secp256k1 (BIP32)   | m/44'/505'/0'/0/{i} | pb1 (Bech32)    | —                |
| 10   | Plasma          | EVM     | ✅   | 同 EVM              | 同 EVM              | 同 EVM          | —                |

Cosmos 插件支持通过 `options.coinType` 和 `options.addressPrefix` 自定义派生，
可覆盖 Cosmos Hub (118/cosmos)、Osmosis (118/osmo)、Provenance (505/pb) 等所有 Cosmos SDK 链。

---

## 10. 迁移进度

1. ✅ 定义 `ChainPlugin` / `DerivedAccount` 统一接口
2. ✅ 实现 `ChainPluginRegistry`
3. ✅ 实现 EVM / Solana / Bitcoin / Tron / Cosmos 五个插件
4. ✅ 重构 `AuthContext` 使用 Registry 派生账户
5. ✅ 添加 Tron / Cosmos 主网+测试网链配置
6. ✅ 为每个插件添加独立测试用例 (90 tests, all passing)
7. 🔜 逐步迁移 SendForm 组件使用插件签名接口
8. 🔜 添加新链 (TON, Aptos, SUI, Starknet ...)

---

## 11. 测试

运行所有链插件测试：

```bash
npx vitest run src/services/chains/
```

测试覆盖：

- **确定性派生** — 同一 seed 始终产生相同地址
- **多账户隔离** — 不同 index 产生不同地址
- **跨链隔离** — 同 seed 在不同链家族产生不同地址
- **地址格式** — 验证各链的地址格式正确
- **地址校验** — `isValidAddress` 正确识别合法/非法地址
- **边界条件** — 无效 seed 的异常处理
