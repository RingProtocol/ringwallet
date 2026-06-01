# Isolated Signing Worker (signer.worker.ts) 设计文档

> 本文档描述 Ring Wallet 中 **signer.worker.ts** 的完整设计，目的是让后续开发者（或 AI 代理）在修改签名逻辑、新增链支持或排查安全问题时，能够快速理解其架构而不必重新阅读源码。

---

## 1. 设计目标与核心约束

| 约束                     | 说明                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **私钥永不出 Worker**    | `masterSeed`、`privateKey`、`secretKey` 等敏感材料只能在 Worker 内部存在，绝不通过 `postMessage` 传回主线程。 |
| **主线程无状态**         | 主线程只持有 `signerBridge` 单例，不保存任何种子或私钥。                                                      |
| **内存混淆**             | Worker 内部不保存明文 `masterSeed`，而是保存 XOR-混淆后的副本。                                               |
| **零化清理**             | 每次使用完种子/私钥后立即调用 `secureZero()` 覆盖内存。                                                       |
| **登录初始化、登出销毁** | 登录成功后由 `AuthContext` 将种子注入 Worker；登出时调用 `clear()` 销毁内部状态。                             |

---

## 2. 整体架构

```
┌─────────────────────────────────────┐
│           Main Thread               │
│  ┌─────────────────────────────┐    │
│  │   signerBridge (单例)       │    │
│  │   - Promise-based API       │    │
│  │   - 超时控制 (120s)         │    │
│  │   - 懒加载 Worker           │    │
│  └──────────────┬──────────────┘    │
│                 │ postMessage       │
│                 ▼                   │
│  ┌─────────────────────────────┐    │
│  │   signer.worker.ts (module) │    │
│  │   - XOR 混淆种子            │    │
│  │   - HD 推导 + 签名          │    │
│  │   - 仅返回: 地址 / 已签交易 │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 2.1 关键文件对应关系

| 文件                                   | 职责                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/workers/signer.worker.ts`         | Worker 内部逻辑：种子生命周期、各链签名、地址推导                                    |
| `src/services/account/signerBridge.ts` | 主线程桥接：封装 `postMessage`、Promise 化、超时处理                                 |
| `src/utils/memoryCrypto.ts`            | 内存混淆/零化工具：`xorScrambleInPlace`、`secureZero`                                |
| `src/utils/workerEvmSigner.ts`         | ethers.js `AbstractSigner` 子类，让第三方库（如 Polymarket SDK）无缝使用 Worker 签名 |

---

## 3. 内存安全设计

### 3.1 种子生命周期

Worker 维护两个全局变量：

```typescript
let obfuscatedSeed: Uint8Array | null = null // XOR 混淆后的种子
let scrambleKey: Uint8Array | null = null // 32 字节随机密钥
```

**`setSeed(seed)`**

1. 若已有旧种子，先 `clearSeed()` 销毁。
2. 生成新的 `scrambleKey`（`crypto.getRandomValues`）。
3. 拷贝种子到 `obfuscatedSeed`，原地 XOR 混淆。

**`getSeed(): Uint8Array`**

1. 检查两个变量非空。
2. 拷贝 `obfuscatedSeed` 到新 `Uint8Array`。
3. 用 `scrambleKey` 原地 XOR 反混淆，返回明文种子。
4. **调用方必须在 `finally` 中 `secureZero(seed)`。**

**`clearSeed()`**

1. `secureZero(obfuscatedSeed)` → 置 `null`。
2. `secureZero(scrambleKey)` → 置 `null`。

### 3.2 secureZero

```typescript
export function secureZero(buf: Uint8Array): void {
  if (!buf) return
  buf.fill(0)
}
```

> ⚠️ 这只是防御性措施。JS 引擎可能在 GC、字符串驻留或 TypedArray 拷贝时保留原始数据副本。

---

## 4. 消息协议

Worker 与主线程通过标准的 `postMessage` / `onmessage` 通信，消息格式如下：

### 4.1 请求格式 (WorkerRequest)

```typescript
interface WorkerRequest {
  id: string // 唯一标识，用于匹配响应
  type:
    | 'init'
    | 'sign_evm'
    | 'sign_solana'
    | 'sign_bitcoin'
    | 'derive_addresses'
    | 'clear'
  payload?: Record<string, unknown>
}
```

### 4.2 响应格式 (WorkerResponse)

```typescript
interface WorkerResponse {
  id: string
  type: 'success' | 'error'
  result?: unknown
  error?: string
}
```

### 4.3 操作类型详解

| type               | payload                                                                 | 返回值                                                        | 说明                                                         |
| ------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `init`             | `{ seed: number[] }`                                                    | `void`                                                        | 将 32 字节种子传入 Worker，Worker 内部 XOR 混淆后保存        |
| `sign_evm`         | `{ index, to, amount, chainId, rpcUrl?, tokenOpts?, data?, gasLimit? }` | `string` (rawTx)                                              | 签名 EVM 交易（支持原生转账、ERC20 `transfer`、合约 `data`） |
| `sign_solana`      | `{ index, to, amount, rpcUrl }`                                         | `{ serializedTx: number[], blockhash, lastValidBlockHeight }` | 签名 SOL 转账                                                |
| `sign_bitcoin`     | _(预留，未实现)_                                                        | —                                                             | 未来支持 BTC 转账                                            |
| `derive_addresses` | `{ family: ChainFamily, count }`                                        | `Array<{ index, address, path }>`                             | 推导地址，**绝不返回私钥**                                   |
| `clear`            | —                                                                       | `void`                                                        | 销毁内部混淆种子和密钥                                       |

---

## 5. 各链签名逻辑

### 5.1 EVM (`signEvm`)

**推导路径**: `m/44'/60'/0'/0/${index}`

**签名流程**:

1. `getSeed()` → 用 `ethers.HDNodeWallet.fromSeed` 创建根节点。
2. `derivePath` 到目标账户 → `new ethers.Wallet(child.privateKey)`。
3. 根据参数判断交易类型：
   - **`txData` 存在**: 合约调用（如 swap/bridge），`to` 为目标合约地址，`value` 按 `amount` 解析。
   - **`tokenOpts` 存在**: ERC20 转账，自动编码 `transfer(address,uint256)`，`to` 改为 token 合约地址。
   - **否则**: 原生 ETH 转账。
4. 若提供 `rpcUrl`：
   - 获取 `nonce`、`feeData`。
   - `estimateGas` 估算 gas，默认加 10% 缓冲（`estimated + estimated / 10n`）。
   - 构造 EIP-1559 交易（`type: 2`）。
   - `gasLimit` 最小值钳制为 `31500`。
5. 若无 `rpcUrl`：使用离线签名（`type: 0`，固定 `gasPrice: 20 gwei`）。
6. `wallet.signTransaction(...)` 返回 rawTx。
7. `finally { secureZero(seed) }`

### 5.2 Solana (`signSolana`)

**推导路径**: `m/44'/501'/${index}'`

**签名流程**:

1. `getSeed()` → `ed25519-hd-key.derivePath` 获取 64 字节 extended key。
2. `Keypair.fromSeed(key.slice(0, 32))` 生成密钥对。
3. 通过 `rpcUrl` 创建 `Connection`，获取最新 `blockhash` / `lastValidBlockHeight`。
4. 构造 `SystemProgram.transfer` 交易。
5. `transaction.sign(keypair)` → 序列化 → 返回 `{ serializedTx, blockhash, lastValidBlockHeight }`。
6. `finally { secureZero(seed) }`

### 5.3 Bitcoin (预留)

`deriveBitcoinSigner()` 已存在但未挂载到消息处理器。实现后可支持：

- 路径: `m/84'/0'/0'/0/${index}` (Native SegWit `p2wpkh`)
- 网络: `bitcoin.networks.bitcoin` / `testnet`

---

## 6. 地址推导 (`deriveAddresses`)

**核心原则**: 只返回 `{ index, address, path }`，绝不包含 `privateKey`。

| ChainFamily | 路径                  | 地址格式             |
| ----------- | --------------------- | -------------------- |
| `EVM`       | `m/44'/60'/0'/0/${i}` | `0x...` (40 hex)     |
| `Solana`    | `m/44'/501'/${i}'`    | Base58 (32-44 chars) |
| `Bitcoin`   | `m/84'/0'/0'/0/${i}`  | `bc1q...` (p2wpkh)   |

实现方式与签名逻辑共用 `getSeed()` + `secureZero`，推导完成后立即销毁明文种子。

---

## 7. signerBridge.ts 桥接层

主线程通过 `signerBridge`（单例）与 Worker 交互，屏蔽了底层的 `postMessage` 细节。

**关键特性**:

- **懒加载**: 首次调用任意方法时才 `new Worker(...)`。
- **Promise 化**: 内部维护 `pending: Map<id, resolve>`，将异步消息转为 Promise。
- **超时**: 所有请求默认 120 秒超时。
- **类型安全**: `post<T>(type, payload)` 泛型方法确保返回类型正确。
- **生命周期方法**:
  - `init(seed)` — 注入种子
  - `signEvm(params)` / `signSolana(params)` — 签名
  - `deriveAddresses(family, count)` — 推导地址
  - `clear()` — 清空 Worker 状态
  - `terminate()` — 终止 Worker 进程

---

## 8. 主线程使用示例

### 8.1 登录时初始化

```typescript
// AuthContext.tsx
const seed = await passkeyService.login(username) // 32 字节 Uint8Array
await signerBridge.init(seed)
secureZero(seed) // 主线程立即销毁
```

### 8.2 EVM 转账

```typescript
const rawTx = await signerBridge.signEvm({
  index: activeWalletIndex,
  to: '0xReceiver...',
  amount: '0.1',
  chainId: 1,
  rpcUrl: 'https://eth.llamarpc.com',
})
// rawTx 是已签名的十六进制交易，可直接 broadcast
```

### 8.3 Solana 转账

```typescript
const { serializedTx, blockhash, lastValidBlockHeight } =
  await signerBridge.signSolana({
    index: activeSolanaWalletIndex,
    to: '5B7y...',
    amount: 0.05,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  })
// serializedTx 是 number[]，需转为 Uint8Array 后 sendRawTransaction
```

### 8.4 登出销毁

```typescript
await signerBridge.clear()
signerBridge.terminate()
```

---

## 9. WorkerEvmSigner (ethers.js 适配器)

某些第三方 SDK（如 Polymarket CLOB/Contracts）要求传入 `ethers.Signer` 实例。`WorkerEvmSigner` 继承 `ethers.AbstractSigner`：

```typescript
class WorkerEvmSigner extends ethers.AbstractSigner {
  // 内部只保存: address, index, chainId, rpcUrl
  // signTransaction → 调用 signerBridge.signEvm(...)
  // sendTransaction → sign + provider.broadcastTransaction
}
```

这样 Polymarket、Lido 等库可以直接接收 `WorkerEvmSigner`，无需暴露私钥。

---

## 10. 安全限制与注意事项

1. **XOR 混淆不是加密**: 攻击者若能同时读取 `obfuscatedSeed` 和 `scrambleKey`，仍可恢复种子。此措施仅提高内存抓取门槛。
2. **Worker 可调试性**: 浏览器 DevTools 可以附加到 Worker 并读取其内存。未来可考虑将 Worker 部署为更严格的隔离环境（如 iframe + CSP）。
3. **Solana 交易类型有限**: 当前只支持 `SystemProgram.transfer`，不支持 SPL Token 或复杂指令。
4. **Bitcoin 未完全实现**: `deriveBitcoinSigner` 存在但未接入消息处理器。
5. **offline 签名 gas 固定**: 无 `rpcUrl` 时，`gasPrice` 固定为 20 gwei，`gasLimit` 固定为 65000，仅适用于测试环境。

---

## 11. 后续扩展指南

若需新增一条链的签名支持，修改步骤：

1. **在 `signer.worker.ts` 中添加签名函数**
   - 使用 `getSeed()` 获取种子，推导私钥，签名交易。
   - 确保 `finally { secureZero(seed) }`。

2. **在 `WorkerRequest.type` 和 `onmessage` switch 中新增 case**
   - 解析 payload，调用新签名函数，通过 `respond()` 返回结果。

3. **在 `signerBridge.ts` 中新增类型安全的桥接方法**
   - 如 `signNewChain(params): Promise<...>`。

4. **在主线程组件中使用新的桥接方法**
   - 替换旧有的直接私钥签名逻辑。

5. **更新本文档**
   - 在第 5 节新增该链的签名逻辑，第 6 节新增地址推导规则。

---

> **文档维护者**: 若 `signer.worker.ts` 发生结构性变更（新增链、修改消息协议、变更安全模型），请同步更新本文档。
