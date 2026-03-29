# Solana 钱包集成方案

## 项目现状分析

当前钱包架构：

- **框架**: React + TypeScript + Next.js
- **EVM 交互**: ethers.js v6
- **密钥管理**: Passkey + 自定义 32 字节 masterSeed（嵌入 WebAuthn userHandle）
- **HD 派生**: `ethers.HDNodeWallet.fromSeed()` → secp256k1，路径 `m/44'/60'/0'/0/${i}`
- **账户类型**: EOA + 智能合约钱包 (ERC-4337/EIP-7951)
- **现有链**: Ethereum, Optimism, Arbitrum, Polygon

**核心约束（用户要求）：**

1. **不依赖自建服务器** — 使用公共/第三方 RPC 节点，无需运营 Solana 节点
2. **不依赖第三方钱包 App** — 完全自托管，不依赖 Phantom/Solflare 等插件钱包

---

## 方案选型评估

### ~~方案二：Wallet-Adapter~~ ❌ 不符合要求

需要用户安装外部钱包，与"不依赖第三方钱包 App"约束直接冲突。**直接排除。**

### ~~方案三：Solana Mobile Wallet Adapter~~ ❌ 不符合要求

主要针对原生移动端，不适合 PWA 自托管场景。**直接排除。**

### 方案四：轻量级 RPC 封装 ⚠️ 不推荐

纯手写 JSON-RPC 封装的问题：

- Solana 交易序列化格式复杂（包含 Header、Instruction、AccountKeys、Signatures）
- SPL Token ATA 地址计算涉及 Program Derived Address (PDA) 逻辑
- VersionedTransaction / AddressLookupTable 更难手动处理
- 极易引入安全漏洞，维护成本极高

**不推荐自建底层。**

### ✅ 推荐方案：`@solana/web3.js` v1 + 自托管密钥派生

---

## 推荐方案：Solana Web3.js v1 + 分层架构

### 选型理由

| 维度               | 评估                                        |
| ------------------ | ------------------------------------------- |
| 不依赖外部钱包 App | ✅ 完全自托管，私钥从 masterSeed 本地派生   |
| 不依赖自建服务器   | ✅ 使用公共 RPC / 免费第三方 RPC            |
| 功能完整           | ✅ 支持 SOL 转账、SPL Token、交易历史       |
| 安全性             | ✅ 官方库经审计，生态最成熟                 |
| 维护成本           | ✅ 与 ethers.js 并列的官方库                |
| 包体积             | ⚠️ ~500KB gzipped，可通过 tree-shaking 优化 |

> **注意 v1 vs v2**：`@solana/web3.js` v2（即 `@solana/kit`）是全新模块化 API，
> 树摇更彻底，但截至 2026 年生态工具支持仍不完整。建议先用 v1，待生态稳定后迁移。

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    UI 层 (React Components)                   │
├─────────────────────────────────────────────────────────────┤
│               Chain Abstraction Layer (新增)                   │
│         ChainFamily: EVM | Solana | ...                       │
├──────────────────────────┬──────────────────────────────────┤
│  EVMService (ethers.js)  │  SolanaService (@solana/web3.js)  │
├──────────────────────────┴──────────────────────────────────┤
│              Key Management (masterSeed via Passkey)          │
│    EVM: BIP32/secp256k1  │  Solana: SLIP-0010/Ed25519        │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键技术问题与修订

### 1. ⚠️ 密钥派生修订（原方案有缺陷）

原方案使用 `@noble/curves/ed25519` 但未说明如何做 SLIP-0010 派生。

**Solana 密钥派生规范：**

- 曲线：**Ed25519**（不同于 EVM 的 secp256k1）
- 规范：**SLIP-0010**（Ed25519 只支持硬化派生，所有路径节点都加 `'`）
- 路径：`m/44'/501'/index'/0'`（index 为账户索引）

**正确实现：使用 `ed25519-hd-key`**

```typescript
// 依赖
// yarn add ed25519-hd-key
// (内部使用 @noble/ed25519 实现 SLIP-0010)

import { derivePath } from 'ed25519-hd-key'
import { Keypair } from '@solana/web3.js'

export class SolanaKeyService {
  /**
   * 从 masterSeed 派生 Solana Keypair
   * masterSeed: 32 字节，来自 Passkey userHandle
   * index: 账户索引，默认 0
   */
  static deriveKeypair(masterSeed: Uint8Array, index = 0): Keypair {
    // ed25519-hd-key 需要 hex 格式的 seed
    const seedHex = Buffer.from(masterSeed).toString('hex')
    // SLIP-0010 路径：所有节点必须硬化（Ed25519 限制）
    const path = `m/44'/501'/${index}'/0'`
    const { key } = derivePath(path, seedHex)
    // Keypair.fromSeed 接受 32 字节私钥，内部自动计算公钥
    return Keypair.fromSeed(Uint8Array.from(key))
  }

  static getAddress(masterSeed: Uint8Array, index = 0): string {
    return this.deriveKeypair(masterSeed, index).publicKey.toBase58()
  }
}
```

> **关键区别**：原文档路径 `m/44'/501'/0'/${index}'` 有误，
> 正确的 Solana BIP44 标准路径是 `m/44'/501'/${index}'/0'`，
> 与 Phantom、Solflare 等主流钱包保持一致（相同 seed 派生出相同地址）。

---

### 2. ✅ RPC 节点选择（无自建服务器）

原方案中 `solana-api.projectserum.com`（Serum）已关闭。修订为以下选项：

| 提供商           | 免费额度        | Mainnet URL                                   | 备注           |
| ---------------- | --------------- | --------------------------------------------- | -------------- |
| **Helius**       | 100万 Credit/月 | `https://mainnet.helius-rpc.com/?api-key=KEY` | 推荐，速率宽松 |
| **QuickNode**    | 5000万次/月     | QuickNode 控制台                              | 免费套餐       |
| **Ankr**         | 无限制（公共）  | `https://rpc.ankr.com/solana`                 | 免费，有波动   |
| **官方公共节点** | 有速率限制      | `https://api.mainnet-beta.solana.com`         | 开发/降级备用  |
| **Devnet**       | 无限制          | `https://api.devnet.solana.com`               | 仅测试         |

**推荐配置方式（`.env`）：**

```env
VITE_SOLANA_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_FREE_KEY
VITE_SOLANA_DEVNET_RPC=https://api.devnet.solana.com
```

---

### 3. ✅ 交易构造修订（加入 blockhash 处理）

原方案缺少 `getLatestBlockhash()` 和确认策略。Solana 交易有 ~150 个 slot（约 1 分钟）的有效期，需正确处理。

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

  // 查询 SOL 余额（单位：SOL）
  async getBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address)
    const lamports = await this.connection.getBalance(pubkey)
    return lamports / LAMPORTS_PER_SOL
  }

  // 发送 SOL（带完整 blockhash 处理）
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

    // 使用 blockhash 策略确认（比 signature-only 更可靠）
    const result = await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )

    if (result.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`)
    }

    return signature
  }

  // 预估交易费用（单位：SOL）
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

### 4. ✅ SPL Token 修订（ATA 创建成本说明）

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
      return '0' // ATA 不存在 = 余额为 0
    }
  }

  /**
   * 发送 SPL Token
   * 注意：如果收款方没有 ATA，发送方需支付 ATA 创建费用（约 0.002 SOL）
   * 这笔费用由发送方的 SOL 余额支付，需在 UI 层提示用户
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

    // 检查收款方 ATA 是否存在，不存在则添加创建指令
    try {
      await getAccount(this.connection, recipientATA)
    } catch (err) {
      if (err instanceof TokenAccountNotFoundError) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderKeypair.publicKey, // 付款方
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

### 5. ✅ 签名流程说明（Passkey 与 Solana 的关系）

> **重要澄清**：Passkey（WebAuthn）使用 P-256 (secp256r1) 曲线，**无法直接签名 Solana 交易**。
> Solana 要求 Ed25519 签名。

实际签名流程：

```
用户触发发送
     ↓
PasskeyService.verifyIdentity()   ← 生物识别身份验证（防止未授权操作）
     ↓
AuthContext 中的 masterSeed       ← 从登录时的 Passkey userHandle 恢复
     ↓
SolanaKeyService.deriveKeypair(masterSeed, index)   ← SLIP-0010/Ed25519 派生
     ↓
Keypair.sign(transaction)         ← Ed25519 签名 Solana 交易
     ↓
connection.sendTransaction()      ← 广播到 RPC 节点
```

私钥在内存中实时派生、用完即丢，**永不持久化**，与现有 EVM 流程保持一致。

---

### 6. Chain 接口扩展

```typescript
// src/models/ChainType.ts
export enum ChainFamily {
  EVM = 'evm',
  Solana = 'solana',
}

// 修改 Chain 接口（原 AuthContext.tsx 中定义，id 为 number 是 EVM 专用）
export interface Chain {
  id: number | string // EVM: chainId (number) | Solana: 'solana-mainnet' 等
  name: string
  symbol: string
  family: ChainFamily
  rpcUrl: string
  explorer: string
  // EVM 专有
  chainId?: number
  bundlerUrl?: string
  entryPoint?: string
  factoryAddress?: string
  // Solana 专有
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

## 依赖清单

```bash
# Solana 核心 SDK
yarn add @solana/web3.js @solana/spl-token

# Ed25519 SLIP-0010 HD 派生（专门为 Solana 路径设计）
yarn add ed25519-hd-key
```

> **为什么用 `ed25519-hd-key` 而非 `@noble/curves`？**
> `@noble/curves` 只提供 Ed25519 椭圆曲线运算，不包含 SLIP-0010 派生逻辑。
> `ed25519-hd-key` 完整实现了 SLIP-0010 规范，与 Phantom/Solflare 路径兼容，
> 内部也使用 `@noble/ed25519`。

---

## 实施步骤（修订版）

### Phase 1: 密钥与 RPC 基础（1 周）

1. 安装依赖：`@solana/web3.js`, `@solana/spl-token`, `ed25519-hd-key`
2. 实现 `SolanaKeyService`（SLIP-0010 Ed25519 派生，路径验证）
3. 实现 `SolanaService`（Connection 管理、余额查询、SOL 转账）
4. 扩展 `Chain` 接口，添加 `ChainFamily` 枚举
5. 配置 RPC 环境变量（Helius 免费账户）

### Phase 2: UI 集成（1 周）

1. 更新 `ChainSwitcher` — 支持显示 Solana 链，EVM/Solana 分组
2. 更新 `BalanceDisplay` — 根据 `chain.family` 分流调用
3. 更新 `TokenBalance` — SPL Token 列表查询
4. 更新发送表单 — Solana 地址校验（Base58, 32-44 字符）
5. 更新 `AuthContext` — 支持 Solana Wallet 类型

### Phase 3: SPL Token 与高级功能（1 周）

1. `SolanaTokenService` — 实现完整 SPL Token 转账（含 ATA 检查）
2. UI 提示 ATA 创建费用（~0.002 SOL）
3. Token 列表：集成 [Jupiter Token List](https://token.jup.ag/strict) 或 Solana Token Registry
4. 交易历史：调用 `connection.getSignaturesForAddress()` 解析

### Phase 4: 测试与优化（1 周）

1. 单元测试：密钥派生、地址验证
2. Devnet 集成测试：Faucet → 转账 → 查询
3. 网络切换测试：Mainnet ↔ Devnet
4. 包体积优化：按需导入 `@solana/web3.js` 子路径

---

## 关键注意事项

### 地址格式校验

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
// Solana: Base58, 32-44 chars, 不以 0x 开头
```

### Devnet 空投（开发测试用）

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

### 交易费用说明

| 操作                         | 大约费用                        |
| ---------------------------- | ------------------------------- |
| SOL 转账                     | ~0.000005 SOL（5000 lamports）  |
| SPL Token 转账（ATA 已存在） | ~0.000005 SOL                   |
| SPL Token 转账（需创建 ATA） | ~0.002 SOL（ATA 租金）          |
| Devnet/Testnet               | 与 Mainnet 相同结构，但使用空投 |

---

## 方案对比总结（最终版）

| 特性               | Web3.js v1 ✅  | Wallet-Adapter ❌   | 自定义 RPC ❌ |
| ------------------ | -------------- | ------------------- | ------------- |
| 不依赖外部钱包 App | ✅             | ❌（需 Phantom 等） | ✅            |
| 不依赖自建服务器   | ✅（公共 RPC） | ✅                  | ✅            |
| 功能完整           | ✅             | 部分                | 需大量手写    |
| 包体积             | ~500KB gz      | 较小                | 极小          |
| 安全性             | ✅ 官方审计    | ✅                  | ⚠️ 自建风险   |
| 开发维护成本       | 低             | 低（不适用）        | 极高          |

---

## 结论

**最终推荐**：`@solana/web3.js` v1 + `ed25519-hd-key` + 公共 RPC（Helius 免费套餐）

**满足要求**：

- ✅ 无自建服务器：使用 Helius/Ankr/官方公共 RPC
- ✅ 无第三方钱包：私钥完全从 masterSeed 本地派生，Ed25519 签名在浏览器内完成
- ✅ 完全自托管：私钥仅在内存中存在，依赖 Passkey 生物识别保护 masterSeed

**预计工作量**：3-4 周（较原方案缩短，因方向更明确）

**主要风险**：

1. `masterSeed` 只有 32 字节（非标准 BIP39 64 字节），需验证 `ed25519-hd-key` 兼容性
2. `Chain` 接口 `id: number` 改为 `number | string` 需检查所有使用处
3. Solana ATA 创建费用 UX 需要明确告知用户
