# Solana 钱包集成测试用例

> 测试环境：Solana Devnet
> 框架：Vitest（单元/集成测试）+ Playwright（E2E）

---

## TC-SOL-KEY: 密钥派生测试

### TC-SOL-KEY-01：标准路径派生地址

**目标**：验证 SLIP-0010/Ed25519 派生结果与标准钱包一致

**前置条件**：已知 masterSeed 和对应的 Phantom 钱包地址（用于交叉验证）

**输入**：

```ts
// 已知测试向量（与 Phantom 默认派生路径 m/44'/501'/0'/0' 对应）
const masterSeed = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
```

**步骤**：

1. 调用 `SolanaKeyService.deriveKeypair(masterSeed, 0)`
2. 取 `keypair.publicKey.toBase58()`
3. 与已知测试向量地址对比

**预期结果**：

- 输出 Base58 地址（32-44 字符，不含 `0x` 前缀）
- 与 Phantom 在相同 seed 下 index=0 的地址完全一致

**通过标准**：地址完全匹配

---

### TC-SOL-KEY-02：多账户派生隔离性

**目标**：不同 index 派生出不同地址，且确定性可复现

**步骤**：

1. 使用相同 `masterSeed`，分别派生 index 0, 1, 2, 3, 4
2. 验证五个地址两两不同
3. 重复派生 index 0，验证与第一次完全相同

**预期结果**：

- 5 个地址全部不同
- index=0 两次派生结果 100% 一致

---

### TC-SOL-KEY-03：EVM 与 Solana 密钥隔离

**目标**：同一 masterSeed 派生的 EVM 私钥和 Solana 私钥完全独立

**步骤**：

1. 从 masterSeed 派生 EVM 地址（BIP44 路径 `m/44'/60'/0'/0/0`）
2. 从 masterSeed 派生 Solana 地址（SLIP-0010 路径 `m/44'/501'/0'/0'`）
3. 验证两者对应的私钥字节不同

**预期结果**：EVM 私钥 ≠ Solana 私钥，无任何字节重合

---

### TC-SOL-KEY-04：非法 masterSeed 处理

**目标**：输入异常 seed 时应有明确错误，不应静默失败

**步骤**：

1. 传入空 `Uint8Array(0)`
2. 传入长度不足 16 字节的 seed
3. 传入全零 32 字节（`Uint8Array(32).fill(0)`）

**预期结果**：

- 前两种情况：抛出明确错误（如 `InvalidSeedLength`）
- 全零 seed：技术上有效，应正常派生（但在业务层应警告，因这不应发生在真实用户场景）

---

## TC-SOL-ADDR: 地址验证测试

### TC-SOL-ADDR-01：有效 Solana 地址校验

**步骤**：将以下地址传入 `isValidSolanaAddress()` 函数

**输入/预期**：

| 地址                                                        | 预期     | 说明                  |
| ----------------------------------------------------------- | -------- | --------------------- |
| `11111111111111111111111111111111`                          | ✅ true  | System Program 地址   |
| `So11111111111111111111111111111111111111112`               | ✅ true  | Native SOL Token Mint |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`              | ✅ true  | USDC Mint             |
| `0x1234567890abcdef...`                                     | ❌ false | EVM 格式地址          |
| `invalid-address-string`                                    | ❌ false | 随机字符串            |
| `""`                                                        | ❌ false | 空字符串              |
| `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` (45 chars) | ❌ false | 过长                  |

---

### TC-SOL-ADDR-02：发送表单地址输入验证

**步骤**：

1. 在 Solana 链下打开发送表单
2. 在 `recipient` 输入框输入 EVM 地址（`0x...`）
3. 验证错误提示文本
4. 清空并输入合法 Solana 地址
5. 验证错误消失，金额输入框可用

**预期结果**：

- 输入 EVM 地址时显示"请输入有效的 Solana 地址"
- 输入合法 Solana 地址后错误消失

---

## TC-SOL-BAL: 余额查询测试

### TC-SOL-BAL-01：SOL 余额查询（Devnet）

**前置条件**：持有一个 Devnet 地址，已通过 Faucet 充值 1 SOL

**步骤**：

1. 初始化 `SolanaService('https://api.devnet.solana.com')`
2. 调用 `getBalance(address)`
3. 同时在 [Solscan Devnet](https://solscan.io/?cluster=devnet) 查询相同地址

**预期结果**：

- 返回值为正数，单位为 SOL（如 `1.0` 或 `0.99...`）
- 与 Solscan 显示余额误差 < 0.001 SOL（因 Faucet 可能有精度差异）

---

### TC-SOL-BAL-02：零余额地址查询

**步骤**：

1. 生成一个全新的 Solana 地址（从未充值过）
2. 调用 `getBalance(newAddress)`

**预期结果**：返回 `0`，不抛出异常

---

### TC-SOL-BAL-03：SPL Token 余额查询

**前置条件**：地址持有 Devnet USDC（通过 Devnet Faucet 获取）

**步骤**：

1. 调用 `SolanaTokenService.getTokenBalance(address, USDC_DEVNET_MINT)`
2. 与链上数据对比

**预期结果**：返回正确的 USDC 金额字符串（如 `"10.5"`）

---

### TC-SOL-BAL-04：SPL Token 无 ATA 地址查询

**步骤**：

1. 使用一个**从未持有**该 Token 的地址
2. 调用 `getTokenBalance(addressWithoutATA, mint)`

**预期结果**：返回 `"0"`，不抛出异常（ATA 不存在应作为零余额处理）

---

## TC-SOL-TX: 交易测试（Devnet）

### TC-SOL-TX-01：SOL 转账全流程

**前置条件**：

- 发送方在 Devnet 持有 ≥ 0.01 SOL
- 接收方为新地址

**步骤**：

1. 记录发送方和接收方初始余额
2. 调用 `solanaService.sendSOL(senderKeypair, recipient, 0.001)`
3. 等待交易确认（`confirmed` 级别）
4. 查询两方余额

**预期结果**：

- 返回 88 字符的 Base58 交易签名
- 接收方余额增加 `0.001 SOL`
- 发送方余额减少 `0.001 + fee（约 0.000005）SOL`
- 签名在 Solscan Devnet 上可查询到状态为 `Success`

---

### TC-SOL-TX-02：余额不足时转账失败

**步骤**：

1. 使用一个仅有 `0.000005 SOL`（只够 fee，不够转账）的地址
2. 尝试发送 `0.001 SOL`

**预期结果**：

- 抛出错误，错误信息包含余额不足的说明
- 不提交交易到链上（preflight 阶段拦截）

---

### TC-SOL-TX-03：费用预估

**步骤**：

1. 构造一笔 SOL 转账交易（不签名、不广播）
2. 调用 `estimateFee(sender, recipient, 100000)`

**预期结果**：

- 返回费用估算值，单位为 SOL
- 值约为 `0.000005 SOL`（5000 lamports）
- 结果为正数，类型为 `number`

---

### TC-SOL-TX-04：SPL Token 转账（ATA 已存在）

**前置条件**：发送方和接收方都已有 USDC ATA，发送方持有 ≥ 1 USDC

**步骤**：

1. 调用 `sendToken(senderKeypair, recipient, USDC_DEVNET_MINT, 100000n)` (0.1 USDC，6位小数)
2. 等待交易确认

**预期结果**：

- 接收方 USDC 增加 `0.1`
- 发送方 USDC 减少 `0.1`
- 发送方 SOL 减少约 `0.000005`（仅 tx fee，无 ATA 创建费）

---

### TC-SOL-TX-05：SPL Token 转账（需创建接收方 ATA）

**前置条件**：

- 发送方持有 USDC，ATA 已存在
- 接收方从未持有 USDC（无 ATA）
- 发送方 SOL 余额 ≥ 0.003 SOL

**步骤**：

1. 确认接收方 USDC ATA 不存在
2. 调用 `sendToken(...)`
3. 确认交易成功

**预期结果**：

- 交易内包含两条指令：`createAssociatedTokenAccount` + `transfer`
- 接收方 USDC ATA 自动创建
- 发送方 SOL 额外扣除约 `0.002 SOL`（ATA 租金）
- UI 提前告知用户需要支付 ATA 创建费用

---

### TC-SOL-TX-06：无效接收地址的转账

**步骤**：

1. 在发送表单中输入一个 EVM 地址（`0xAbCd...`）
2. 点击发送

**预期结果**：

- 表单校验阶段（客户端）拦截，不调用 `sendTransaction`
- 显示错误提示"无效的 Solana 地址"

---

## TC-SOL-CHAIN: 链切换测试

### TC-SOL-CHAIN-01：EVM → Solana 链切换

**步骤**：

1. 当前选中 Ethereum Mainnet
2. 打开链切换组件（ChainSwitcher）
3. 选择 Solana Mainnet

**预期结果**：

- 链图标更新为 Solana
- 余额显示变为 SOL 单位
- 发送按钮可用，发送表单显示 Solana 地址校验规则
- 浏览历史按钮链接指向 Solscan

---

### TC-SOL-CHAIN-02：Solana → EVM 链切换

**步骤**：

1. 当前选中 Solana Devnet
2. 切换到 Arbitrum One

**预期结果**：

- 余额恢复为 ETH 单位
- 发送表单恢复 EVM 地址校验规则（`0x...`）
- RPC 请求不再发向 Solana 节点

---

### TC-SOL-CHAIN-03：Solana Mainnet ↔ Devnet 切换

**步骤**：

1. 从 Solana Mainnet 切换到 Solana Devnet

**预期结果**：

- RPC 切换到 `https://api.devnet.solana.com`
- 余额重新查询（Devnet 余额与 Mainnet 不同）
- 链标签显示"Solana Devnet"

---

## TC-SOL-WALLET: 多钱包测试

### TC-SOL-WALLET-01：多账户派生地址唯一性

**前置条件**：已登录，可通过"添加账户"派生新 Solana 钱包

**步骤**：

1. 查看账户列表中的 Solana 地址（index 0）
2. 添加第二个 Solana 账户（index 1）

**预期结果**：

- 两个账户的 Solana 地址完全不同
- 两个账户的 EVM 地址也完全不同
- 切换账户后余额展示对应改变

---

### TC-SOL-WALLET-02：重新登录后地址一致性

**步骤**：

1. 记录当前登录状态下 Solana index=0 地址
2. 退出登录（清空内存 seed）
3. 使用相同 Passkey 重新登录
4. 查看 Solana index=0 地址

**预期结果**：重新登录后地址与退出前完全一致（确定性派生）

---

## TC-SOL-RPC: RPC 稳定性测试

### TC-SOL-RPC-01：RPC 超时处理

**步骤**：

1. 模拟 RPC 请求超时（可通过设置极短 timeout 或断网）
2. 触发余额查询

**预期结果**：

- 余额显示加载中（loading 状态）
- 超时后显示错误提示"网络请求失败，请重试"
- 不显示 NaN 或 undefined

---

### TC-SOL-RPC-02：Devnet Faucet 集成

> 仅用于开发环境验证，不作为生产功能测试

**步骤**：

1. 在 Devnet 模式下，调用 `requestAirdrop(address, 1)`
2. 等待确认
3. 查询余额

**预期结果**：余额增加 1 SOL

---

## 测试执行说明

### 单元测试（Vitest）

适用范围：TC-SOL-KEY-_, TC-SOL-ADDR-_

```bash
yarn test --grep "solana"
```

### 集成测试（Devnet）

适用范围：TC-SOL-BAL-_, TC-SOL-TX-_

需要配置 Devnet Faucet 账户，执行前先运行 Faucet 充值脚本。

```bash
# 给测试账户充值
yarn test:devnet:fund

# 运行 Devnet 集成测试
yarn test:integration --grep "solana"
```

### E2E 测试（Playwright）

适用范围：TC-SOL-CHAIN-_, TC-SOL-WALLET-_

```bash
yarn test:e2e --grep "solana"
```

---

## 测试数据参考

```typescript
// Devnet 常用地址与 Mint
export const TEST_ADDRESSES = {
  // Devnet USDC Mint
  USDC_DEVNET_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  // System Program（用于地址有效性测试）
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  // Token Program
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

// 测试使用的 masterSeed（仅用于测试，不含真实资产）
export const TEST_SEED = new Uint8Array(32).fill(1) // 全1字节测试种子
```
