# Bitcoin 钱包集成方案

> 目标：在 **不新增自建服务器**、**不依赖第三方钱包 App**、**密钥完全本地托管** 的前提下，为 Ring Wallet 增加 Bitcoin 主网（后续可扩展 Testnet）的基础转账能力。

---

## 1. 项目与约束回顾（对齐 Solana 方案）

全局约束（同 `CLAUDE.md` 与 Solana 方案）：

- 无自建后端依赖：只能使用公共 / 第三方提供的 RPC / HTTP API，钱包核心能力不能依赖自有服务器。
- 无第三方钱包依赖：不允许依赖 MetaMask / Phantom / UniSat 等外部钱包 App 或扩展。
- 私钥永不出浏览器：密钥由 `masterSeed` 在本地内存派生，仅用于签名，不持久化、不上传。
- 唯一认证入口是 Passkey：所有高风险操作（转账、签名）必须经过 `PasskeyService.verifyIdentity()`。

Bitcoin 特有约束：

- UTXO 模型：与 EVM/Solana 的账户模型不同，需要本地管理 UTXO 集、找零地址、手续费与找零计算。
- 多地址管理：典型 HD 钱包会使用多接收地址（gap limit），需要设计简化版的地址扫描策略。
- 网络接口：行业没有统一的“JSON-RPC over HTTP + Web3 SDK”标准，多数为各家自定义 REST/WS API。

---

## 2. 方案选型评估

### 2.1 密钥与地址类型

Bitcoin 生态主流地址类型：

- P2PKH（`1...`）：传统地址，手续费高，已不推荐。
- P2SH-P2WPKH（`3...`）：兼容型 SegWit。
- P2WPKH（Bech32，`bc1q...`）：原生 SegWit，当前主流。
- P2TR（Taproot，`bc1p...`）：更先进的脚本能力与隐私。

**当前阶段建议：仅支持 P2WPKH 原生 SegWit 地址**，原因：

- 与大部分现代钱包兼容，手续费相对更低，生态支持成熟。
- 实现复杂度明显低于完整 Taproot / Miniscript 支持。

### 2.2 SDK / 库选型

候选方案：

1. 纯手写序列化与签名 ❌
   - 需实现交易序列化（varint、script、witness 等），极易出错。
   - 对安全性要求极高，不符合当前人力成本。

2. 使用 `bitcoinjs-lib` + BIP32/BIP39 ✅（推荐）
   - 行业内事实标准库，支持 P2WPKH / P2TR / PSBT 等。
   - 可搭配 `bip32` 或内置 BIP32 实现，从 `masterSeed` 派生 secp256k1 私钥。

3. 直接依赖第三方“托管钱包 SDK” ❌
   - 可能要求在服务端托管助记词或私钥，违反自托管约束。

**结论：**

- 使用 `bitcoinjs-lib` + `bip32` + 浏览器内加密安全随机源。
- 仅复用 `masterSeed`（32 字节）作为 HD seed 的输入，不额外引入 BIP39 助记词。

---

## 3. 密钥派生与地址生成设计

### 3.1 HD 路径与 ChainFamily 扩展

参考 BIP44 标准：

- 币种类型（coin type）：Bitcoin = `0'`
- 标准路径：`m / 44' / 0' / account' / change / address_index`

在 Ring Wallet 中，为简化：

- 固定 `account = 0'`
- `change = 0`：外部地址（接收）
- `address_index = i`：i 为地址索引

最终路径：

- `m/44'/0'/0'/0/i`

在 `src/models/ChainType.ts` 中扩展：

```typescript
export enum ChainFamily {
  EVM = 'evm',
  Solana = 'solana',
  Bitcoin = 'bitcoin',
}
```

`Chain` 接口增加 Bitcoin 专有字段（示意，实际以现有代码为准）：

```typescript
export interface Chain {
  id: number | string
  name: string
  symbol: string
  family: ChainFamily
  rpcUrl: string // 对 Bitcoin，可表示 REST API 基础 URL
  explorer: string
  // Bitcoin 专有
  network?: 'mainnet' | 'testnet' | 'signet' | 'regtest'
}
```

Bitcoin 链配置示例（放入 `src/constants/chains.ts`）：

```typescript
export const BITCOIN_CHAINS: Chain[] = [
  {
    id: 'bitcoin-mainnet',
    name: 'Bitcoin',
    symbol: 'BTC',
    family: ChainFamily.Bitcoin,
    rpcUrl:
      process.env.NEXT_PUBLIC_BITCOIN_API ?? 'https://blockstream.info/api', // 默认公共 API，仅作为兜底
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

### 3.2 从 masterSeed 派生 Bitcoin 私钥与地址

约束：`masterSeed` 由 Passkey userHandle 提供，长度为 32 字节。

实现思路：

- 将 `masterSeed` 视为 HD seed（BIP32 允许 128–512 bit 输入）。
- 使用 `bip32` 从 seed 生成根节点，然后按 BIP44 路径派生子私钥。
- 使用 `bitcoinjs-lib` 生成 P2WPKH 地址。

伪代码（`src/services/bitcoinKeyService.ts`）：

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

> 与 Solana 一致：私钥仅在内存中存在，用完即丢弃。不写入 IndexedDB / LocalStorage / 服务器。

---

## 4. UTXO 与交易构造

### 4.1 网络接口与数据来源

不自建服务器前提下，可使用的公共 / 免费 API：

- **Blockstream API**（REST）：`https://blockstream.info/api`
  - `GET /address/:addr/utxo`：查询地址 UTXO。
  - `GET /fee-estimates`：手续费估算。
  - `POST /tx`：广播原始交易（hex）。
- 其他备选：mempool.space API（兼容 Blockstream 风格）、Alchemy Bitcoin（若推出）、第三方 Free-tier。

配置方式（`.env`）：

```env
NEXT_PUBLIC_BITCOIN_API=https://blockstream.info/api
NEXT_PUBLIC_BITCOIN_TESTNET_API=https://blockstream.info/testnet/api
```

> 若未来担心中心化依赖，可在 `src/server/` 中增加可选代理层，但 Bitcoin 核心能力不得强依赖该代理。

### 4.2 BitcoinService 设计

职责：

- 查询 UTXO：给定地址，调用 REST API 获取当前 UTXO 集。
- 手续费估算：根据 API 的 feerate（sat/vByte）与交易大小估算手续费。
- 构造与签名交易：根据目标金额、手续费率与 UTXO，构造 P2WPKH 交易并签名。

伪代码（`src/services/bitcoinService.ts`）：

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
    // 选择“中等优先级” fee rate，例如 3 blocks target
    return data['3'] ?? data['6'] ?? 5 // sat/vByte
  }

  /**
   * 构造并签名 P2WPKH 交易
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

    // 选币策略：简单的“累加直到够用”，后续可扩展 BnB/Knapsack
    let selected: Utxo[] = []
    let totalIn = 0
    for (const u of utxos) {
      selected.push(u)
      totalIn += u.value
      if (totalIn >= amountSats) break
    }
    if (totalIn < amountSats) throw new Error('Insufficient balance')

    const psbt = new bitcoin.Psbt({ network: this.network })

    // 添加输入（P2WPKH）
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

    // 先假设“无找零”估算一个上限手续费
    psbt.addOutput({
      address: toAddress,
      value: amountSats,
    })

    const vBytesEstimate = psbt.__CACHE.__TX.virtualSize() ?? 200 // 兜底估算
    const feeEstimate = Math.ceil(feeRate * vBytesEstimate)

    const change = totalIn - amountSats - feeEstimate
    const dustThreshold = 546 // sat

    // 如果找零大于 dust，则添加找零输出，否则将找零计入手续费
    if (change >= dustThreshold) {
      psbt.addOutput({
        address: fromAddress, // 简化：找零回同一地址，后续可用 changeIndex
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

> 与 Solana 一致：构造和签名都在前端完成，后端（如果存在）仅可用作“可选代理”转发。

---

## 5. 签名流程与 Passkey 集成

Bitcoin 签名流程与 EVM、Solana 保持统一模式：

```
用户点击“发送 BTC”
        ↓
PasskeyService.verifyIdentity()         // 生物识别 / 安全验证
        ↓
从 AuthContext 恢复 masterSeed         // 登录时从 Passkey userHandle 解出
        ↓
BitcoinKeyService.deriveAccountNode()   // BIP32 / secp256k1 派生，生成私钥与地址
        ↓
BitcoinService.buildAndSignTransaction  // 构造 P2WPKH 交易并签名
        ↓
BitcoinService.broadcast                // 向公共 API 广播 txHex
```

关键原则：

- Passkey 不直接参与 Bitcoin 签名（曲线不同：P-256 vs secp256k1），只作为“解锁 masterSeed 的门锁”。
- masterSeed 与 Bitcoin 私钥永不上传网络。

---

## 6. UI 与链抽象集成

### 6.1 Chain 抽象

UI 层通过 `chain.family` 分流：

- `evm`：使用 EVMService（ethers.js）。
- `solana`：使用 SolanaService（@solana/web3.js）。
- `bitcoin`：使用 BitcoinService（自定义）。

示例（伪代码）：

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

`BitcoinSendForm` 需要：

- 地址格式校验：Bech32，`bc1q...` / `tb1q...`，不以 `0x` 开头。
- 金额单位切换：UI 显示 BTC（如 `0.001 BTC`），内部换算成 satoshi（`1 BTC = 1e8 sats`）。
- 手续费提示：展示预估费用（`fee (sat) ≈ vBytes * sat/vByte`），允许用户选择“慢 / 中 / 快”。

### 6.2 余额与交易历史

- 余额：通过 UTXO 累加得到 `sum(utxo.value)`，转换成 BTC 显示。
- 交易历史：使用公共 API（如 Blockstream 的 `/address/:addr/txs`），解析出：
  - 收款 / 付款标记（根据输入/输出是否包含本钱包地址）。
  - 金额与时间、确认数。

---

## 7. DApp 集成考虑（预留）

与 EVM/Solana 不同，Bitcoin 生态缺乏统一的“浏览器内 DApp 标准”（不存在 EIP-1193 等价物）。短期内：

- **不** 提供通用 Bitcoin DApp provider 注入。
- 如需支持特定 Bitcoin DApp，可在 `walletBridge` 中为 BTC 扩展少量专用方法（如 `btc_getAddresses`、`btc_signPsbt`），后续按需设计。

本阶段 BTC 集成聚焦：

- 余额展示
- 地址展示与复制 / 收款二维码
- 基础发送功能（P2WPKH 转账）

---

## 8. 依赖清单

```bash
# Bitcoin 核心与地址/脚本支持
yarn add bitcoinjs-lib bip32 tiny-secp256k1

# HTTP 客户端（如果项目已有 axios，可复用）
yarn add axios
```

注意：

- `bitcoinjs-lib` 需要 `tiny-secp256k1` 作为曲线实现，需显式安装。
- 若包体积压力过大，可通过动态 import 和 Tree Shaking 减少首屏负载。

---

## 9. 实施步骤与里程碑

### Phase 1：密钥与链基础（约 1 周）

1. 扩展 `ChainFamily` 与 `Chain` 接口，增加 Bitcoin 相关配置与常量。
2. 实现 `BitcoinKeyService`（从 masterSeed → P2WPKH 地址）。
3. 在账户详情页中添加 BTC 地址展示与复制功能。

### Phase 2：UTXO 与转账（约 1–1.5 周）

1. 集成公共 Bitcoin API，完成 UTXO 查询与余额计算。
2. 实现 `BitcoinService.buildAndSignTransaction` 与 `broadcast`。
3. 新增 `BitcoinSendForm`，支持：
   - 输入目标地址与金额。
   - 手续费预估与展示。
   - Passkey 验证 + 广播。

### Phase 3：交易历史与 Testnet（约 1 周）

1. 集成地址交易历史查询，并在 UI 中展示：
   - 收款 / 付款 / 手续费信息。
2. 增加 Bitcoin Testnet 支持：
   - Testnet 地址前缀 `tb1q...`。
   - Testnet API 与浏览器链接。
3. 文档与用户教育（解释 UTXO / 手续费 / 交易确认）。

### Phase 4：优化与安全审计（约 1 周）

1. 单元测试：
   - HD 派生路径正确性。
   - 地址格式验证。
   - 手续费与找零计算。
2. 前端防御：
   - 防止多次点击造成重复广播。
   - 清晰的错误提示（余额不足、手续费过低、API 不可用）。
3. 包体积与性能优化（按需 Lazy-load Bitcoin 模块）。

---

## 10. 风险与注意事项

1. **公共 API 中心化风险**
   - 依赖 Blockstream / mempool.space 等第三方服务。
   - 缓解：支持多 API 配置、错误时自动降级到备选 API。

2. **UTXO 与找零复杂度**
   - 初期使用简单选币策略，可能导致 UTXO 过度碎片化。
   - 后续可增加更智能的 Coin Selection（BnB / Knapsack 等）。

3. **masterSeed 长度与标准差异**
   - 本项目的 `masterSeed` 不是标准 BIP39 种子，但 BIP32 规范允许任意 128–512 bit 输入。
   - 需要通过测试验证：相同 masterSeed 在多设备上可确定性生成相同 BTC 地址。

4. **地址扫描与 gap limit**
   - 当前方案简化为单地址（或少量地址）模式。
   - 若未来支持多接收地址，需要设计“地址扫描深度”与 gap limit 以避免遗漏余额。

---

## 结论

- **推荐技术路线**：`bitcoinjs-lib` + `bip32` + 公共 Bitcoin API（如 Blockstream）。
- **满足核心约束**：
  - ✅ 无自建服务器：所有查询与广播均走公共/免费 API。
  - ✅ 无第三方钱包：完全自托管，从 `masterSeed` 本地派生 secp256k1 私钥。
  - ✅ 私钥仅在浏览器内存中存在，所有签名操作在客户端完成。
  - ✅ 认证统一由 Passkey 驱动，Bitcoin 与 EVM/Solana 使用同一登录态与 masterSeed。
