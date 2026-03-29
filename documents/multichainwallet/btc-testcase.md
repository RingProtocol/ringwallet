# Bitcoin 钱包集成测试用例

> 测试环境：Bitcoin Testnet（或 Signet）
> 框架：Vitest（单元/集成测试）+ Playwright（E2E）

---

## TC-BTC-KEY: 密钥派生测试

### TC-BTC-KEY-01：标准路径派生地址

**目标**：验证 BIP32/secp256k1 派生 P2WPKH 地址与第三方钱包一致

**前置条件**：已知 masterSeed 及对应的 BIP44 标准钱包（如 Electrum/Sparrow）在相同路径下的地址

**输入**：

```ts
const masterSeed = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
// 路径: m/44'/0'/0'/0/0（mainnet P2WPKH）
```

**步骤**：

1. 调用 `BitcoinKeyService.deriveAccountNode(masterSeed, false, 0)`
2. 取返回值中的 `address`
3. 与已知测试向量地址对比

**预期结果**：

- 输出 Bech32 格式地址（以 `bc1q` 开头）
- 与标准钱包在相同 seed、相同路径下的地址完全一致

**通过标准**：地址完全匹配

---

### TC-BTC-KEY-02：多账户派生隔离性

**目标**：不同 address_index 派生出不同地址，且确定性可复现

**步骤**：

1. 使用相同 `masterSeed`，分别派生 index 0, 1, 2, 3, 4
2. 验证五个地址两两不同
3. 重复派生 index 0，验证与第一次完全相同

**预期结果**：

- 5 个地址全部不同
- index=0 两次派生结果 100% 一致

---

### TC-BTC-KEY-03：EVM / Solana / Bitcoin 密钥隔离

**目标**：同一 masterSeed 派生的三种链私钥完全独立

**步骤**：

1. 从 masterSeed 派生 EVM 地址（路径 `m/44'/60'/0'/0/0`）
2. 从 masterSeed 派生 Solana 地址（路径 `m/44'/501'/0'/0'`）
3. 从 masterSeed 派生 Bitcoin 地址（路径 `m/44'/0'/0'/0/0`）
4. 验证三者对应的私钥字节不同

**预期结果**：三组私钥两两互不相同，无任何字节重合

---

### TC-BTC-KEY-04：非法 masterSeed 处理

**目标**：输入异常 seed 时应有明确错误，不应静默失败

**步骤**：

1. 传入空 `Uint8Array(0)`
2. 传入长度不足 16 字节的 seed
3. 传入全零 32 字节（`Uint8Array(32).fill(0)`）

**预期结果**：

- 前两种情况：抛出明确错误（如 `InvalidSeedLength`）
- 全零 seed：技术上有效（BIP32 允许），应正常派生，但业务层应警告

---

### TC-BTC-KEY-05：Testnet 路径与 Mainnet 路径隔离

**目标**：Testnet 使用 `coin_type = 1'` 时，地址与 Mainnet 完全不同

**步骤**：

1. 使用相同 masterSeed 分别派生 Mainnet 地址（`m/44'/0'/0'/0/0`）和 Testnet 地址（`m/44'/1'/0'/0/0`）
2. 验证两者不同
3. 验证 Mainnet 地址以 `bc1q` 开头、Testnet 地址以 `tb1q` 开头

**预期结果**：

- 地址不同
- 前缀分别为 `bc1q` 和 `tb1q`

---

## TC-BTC-ADDR: 地址验证测试

### TC-BTC-ADDR-01：有效 Bitcoin 地址校验

**步骤**：将以下地址传入 `isValidBitcoinAddress()` 函数

**输入/预期**：

| 地址                                           | 预期     | 说明                                |
| ---------------------------------------------- | -------- | ----------------------------------- |
| `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`   | ✅ true  | 有效 P2WPKH 地址（BIP173 测试向量） |
| `bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq`   | ✅ true  | 常见 P2WPKH 地址                    |
| `tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx`   | ✅ true  | 有效 Testnet P2WPKH 地址            |
| `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`           | ❌ false | P2PKH（当前仅支持 P2WPKH）          |
| `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy`           | ❌ false | P2SH（当前仅支持 P2WPKH）           |
| `0x1234567890abcdef1234567890abcdef12345678`   | ❌ false | EVM 格式地址                        |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | ❌ false | Solana 格式地址                     |
| `invalid-address-string`                       | ❌ false | 随机字符串                          |
| `""`                                           | ❌ false | 空字符串                            |
| `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5`   | ❌ false | 校验和错误（最后一位改动）          |

---

### TC-BTC-ADDR-02：发送表单地址输入验证

**步骤**：

1. 在 Bitcoin 链下打开发送表单
2. 在 `recipient` 输入框输入 EVM 地址（`0x...`）
3. 验证错误提示文本
4. 清空并输入 Solana 地址
5. 验证仍有错误提示
6. 清空并输入合法 `bc1q...` 地址
7. 验证错误消失，金额输入框可用

**预期结果**：

- 输入非 Bitcoin 地址时显示"请输入有效的 Bitcoin 地址"
- 输入合法 Bech32 地址后错误消失

---

## TC-BTC-BAL: 余额查询测试

### TC-BTC-BAL-01：BTC 余额查询（Testnet）

**前置条件**：持有一个 Testnet 地址，已通过 Faucet 充值 ≥ 0.001 tBTC

**步骤**：

1. 初始化 `BitcoinService('https://blockstream.info/testnet/api', testnetNetwork)`
2. 调用 `getUtxos(address)` 并累加 `sum(utxo.value)`
3. 同时在 [mempool.space/testnet](https://mempool.space/testnet) 查询相同地址

**预期结果**：

- UTXO 累加值与 mempool.space 显示余额一致
- 返回值单位为 satoshis（整数），UI 层转换为 BTC 显示

---

### TC-BTC-BAL-02：零余额地址查询

**步骤**：

1. 生成一个全新的 Bitcoin Testnet 地址（从未接收过交易）
2. 调用 `getUtxos(newAddress)`

**预期结果**：返回空数组 `[]`，不抛出异常。UI 显示余额 `0 BTC`

---

### TC-BTC-BAL-03：多 UTXO 地址余额聚合

**前置条件**：一个地址分多次接收了 3 笔以上的小额 tBTC

**步骤**：

1. 调用 `getUtxos(address)`
2. 验证返回的 UTXO 数量 ≥ 3
3. 验证 `sum(utxo.value)` 与链上总余额一致

**预期结果**：

- UTXO 列表包含所有未花费输出
- 累加值正确

---

## TC-BTC-UTXO: UTXO 与选币测试

### TC-BTC-UTXO-01：简单选币——精确匹配

**输入**：

```ts
const utxos = [
  { txid: 'aaa...', vout: 0, value: 50000 },
  { txid: 'bbb...', vout: 1, value: 30000 },
  { txid: 'ccc...', vout: 0, value: 20000 },
]
const targetAmount = 50000 // sats
```

**步骤**：执行选币逻辑

**预期结果**：选中第一个 UTXO（50000 sats），不需额外 UTXO

---

### TC-BTC-UTXO-02：简单选币——需要多个 UTXO

**输入**：

```ts
const utxos = [
  { txid: 'aaa...', vout: 0, value: 30000 },
  { txid: 'bbb...', vout: 1, value: 30000 },
  { txid: 'ccc...', vout: 0, value: 20000 },
]
const targetAmount = 50000 // sats
```

**步骤**：执行选币逻辑

**预期结果**：选中前两个 UTXO（总计 60000 sats），产生找零

---

### TC-BTC-UTXO-03：UTXO 不足时拒绝

**输入**：

```ts
const utxos = [{ txid: 'aaa...', vout: 0, value: 1000 }]
const targetAmount = 50000
```

**预期结果**：抛出 `Insufficient balance` 错误

---

## TC-BTC-FEE: 手续费与找零测试

### TC-BTC-FEE-01：手续费估算接口

**步骤**：

1. 调用 `bitcoinService.getFeeRate()`
2. 验证返回值为正数（sat/vByte）

**预期结果**：

- 返回值 > 0，类型为 `number`
- 值在合理范围内（Testnet 通常 1–20 sat/vByte）

---

### TC-BTC-FEE-02：找零大于 dust threshold

**输入**：

- UTXO 总额：100,000 sats
- 转账金额：50,000 sats
- 预估手续费：500 sats

**预期结果**：

- 找零 = 100,000 - 50,000 - 500 = 49,500 sats
- 49,500 > 546（dust threshold）
- 交易包含 2 个输出：目标地址 + 找零地址

---

### TC-BTC-FEE-03：找零小于 dust threshold

**输入**：

- UTXO 总额：50,600 sats
- 转账金额：50,000 sats
- 预估手续费：500 sats

**预期结果**：

- 找零 = 50,600 - 50,000 - 500 = 100 sats
- 100 < 546（dust threshold）
- 交易只包含 1 个输出（找零并入手续费）
- 实际手续费 = 600 sats

---

### TC-BTC-FEE-04：手续费 + 金额 > 余额时拒绝

**输入**：

- UTXO 总额：50,000 sats
- 转账金额：50,000 sats
- 预估手续费：500 sats

**预期结果**：

- 构造交易时检测到总额不足（50,000 < 50,000 + 500）
- 抛出错误，提示用户余额不足以支付手续费

---

## TC-BTC-TX: 交易测试（Testnet）

### TC-BTC-TX-01：BTC 转账全流程

**前置条件**：

- 发送方在 Testnet 持有 ≥ 0.001 tBTC
- 接收方为新地址

**步骤**：

1. 记录发送方和接收方初始余额（UTXO 累加）
2. 调用 `bitcoinService.buildAndSignTransaction({ fromAddress, toAddress, amountSats: 10000, masterSeed, addressIndex: 0 })`
3. 调用 `bitcoinService.broadcast(txHex)`
4. 等待交易确认（至少 1 个确认）
5. 重新查询两方余额

**预期结果**：

- `broadcast` 返回 64 字符十六进制 txid
- 接收方余额增加 10,000 sats
- 发送方余额减少 10,000 + fee sats
- txid 在 mempool.space/testnet 上可查询到

---

### TC-BTC-TX-02：余额不足时转账失败

**步骤**：

1. 使用一个仅有 1,000 sats 的地址
2. 尝试发送 50,000 sats

**预期结果**：

- 抛出错误，信息包含余额不足的说明
- 不广播任何交易

---

### TC-BTC-TX-03：发送全部余额（扫币）

**前置条件**：发送方持有少量 tBTC（如 50,000 sats），仅有 1 个 UTXO

**步骤**：

1. 查询当前余额（= UTXO value）
2. 计算可发送金额 = UTXO value - 预估手续费
3. 构造并发送该金额

**预期结果**：

- 交易只有 1 个输出（无找零）
- 发送方余额归零
- 接收方收到 UTXO value - fee

---

### TC-BTC-TX-04：PSBT 签名验证

**目标**：验证 PSBT 构造与签名的正确性

**步骤**：

1. 构造一笔交易，但不广播
2. 从签名后的 PSBT 中提取原始交易
3. 使用 `bitcoinjs-lib` 解析原始交易
4. 验证：
   - 输入数量与选中 UTXO 一致
   - 输出中包含目标地址与正确金额
   - witness 数据存在且长度合理

**预期结果**：交易结构正确，签名字段非空

---

### TC-BTC-TX-05：无效接收地址的转账

**步骤**：

1. 在发送表单中输入一个 EVM 地址（`0xAbCd...`）
2. 点击发送

**预期结果**：

- 表单校验阶段（客户端）拦截，不构造交易
- 显示错误提示"无效的 Bitcoin 地址"

---

### TC-BTC-TX-06：向 P2PKH/P2SH 地址发送

**目标**：验证当前仅支持 P2WPKH 发送时，向旧格式地址发送的行为

**步骤**：

1. 在发送表单中输入 P2PKH 地址（`1...`）或 P2SH 地址（`3...`）

**预期结果**：

- 如果设计上允许向任意有效 Bitcoin 地址**发送**（只是自身**接收**地址为 P2WPKH），则正常构造交易
- 如果设计上限制只能发送到 P2WPKH，则显示提示"当前仅支持 bc1q 格式地址"
- 需明确产品决策并在此标注

---

## TC-BTC-CHAIN: 链切换测试

### TC-BTC-CHAIN-01：EVM → Bitcoin 链切换

**步骤**：

1. 当前选中 Ethereum Mainnet
2. 打开链切换组件（ChainSwitcher）
3. 选择 Bitcoin

**预期结果**：

- 链图标更新为 Bitcoin
- 余额显示变为 BTC 单位
- 地址显示区域展示 `bc1q...` 格式地址
- 发送按钮可用，发送表单显示 Bitcoin 地址校验规则
- 浏览历史按钮链接指向 mempool.space

---

### TC-BTC-CHAIN-02：Bitcoin → Solana 链切换

**步骤**：

1. 当前选中 Bitcoin
2. 切换到 Solana Mainnet

**预期结果**：

- 余额单位变为 SOL
- 地址显示区域展示 Solana Base58 地址
- 发送表单恢复 Solana 地址校验规则
- API 请求不再发向 Bitcoin API

---

### TC-BTC-CHAIN-03：Bitcoin Mainnet ↔ Testnet 切换

**步骤**：

1. 从 Bitcoin Mainnet 切换到 Bitcoin Testnet

**预期结果**：

- API 切换到 Testnet endpoint
- 地址前缀从 `bc1q` 变为 `tb1q`
- 余额重新查询（Testnet 余额与 Mainnet 不同）
- 链标签显示"Bitcoin Testnet"
- 浏览器链接指向 mempool.space/testnet

---

## TC-BTC-WALLET: 多钱包测试

### TC-BTC-WALLET-01：多账户派生地址唯一性

**前置条件**：已登录，可通过"添加账户"派生新 Bitcoin 钱包

**步骤**：

1. 查看账户列表中的 Bitcoin 地址（index 0）
2. 添加第二个账户（index 1）

**预期结果**：

- 两个账户的 Bitcoin 地址完全不同
- 两个账户的 EVM / Solana 地址也完全不同
- 切换账户后余额展示对应改变

---

### TC-BTC-WALLET-02：重新登录后地址一致性

**步骤**：

1. 记录当前登录状态下 Bitcoin index=0 地址
2. 退出登录（清空内存 seed）
3. 使用相同 Passkey 重新登录
4. 查看 Bitcoin index=0 地址

**预期结果**：重新登录后地址与退出前完全一致（确定性派生）

---

## TC-BTC-API: API 稳定性测试

### TC-BTC-API-01：API 超时处理

**步骤**：

1. 模拟 API 请求超时（可通过设置极短 timeout 或断网）
2. 触发余额查询

**预期结果**：

- 余额显示加载中（loading 状态）
- 超时后显示错误提示"网络请求失败，请重试"
- 不显示 NaN 或 undefined

---

### TC-BTC-API-02：API 降级备选

**步骤**：

1. 将主 API（如 Blockstream）设置为不可用
2. 触发余额查询或交易广播

**预期结果**：

- 自动降级到备选 API（如 mempool.space）
- 功能正常运行，或提供明确的错误提示

---

### TC-BTC-API-03：广播失败处理

**步骤**：

1. 构造一笔使用已花费 UTXO 的交易
2. 尝试广播

**预期结果**：

- API 返回错误
- 用户看到明确的错误提示（如"交易被拒绝"），不出现静默失败

---

## TC-BTC-SEC: 安全测试

### TC-BTC-SEC-01：私钥不泄漏到存储

**步骤**：

1. 完成一次 BTC 转账全流程
2. 检查 LocalStorage、SessionStorage、IndexedDB
3. 检查浏览器控制台日志

**预期结果**：

- 任何持久化存储中均不包含 Bitcoin 私钥或 WIF 格式密钥
- 控制台无私钥泄漏

---

### TC-BTC-SEC-02：私钥不出现在网络请求中

**步骤**：

1. 打开浏览器 DevTools Network 面板
2. 完成一次 BTC 转账
3. 检查所有请求的 payload

**预期结果**：

- 所有网络请求中不包含原始私钥
- 仅 `POST /tx` 请求包含已签名的原始交易 hex

---

### TC-BTC-SEC-03：重复广播防护

**步骤**：

1. 发起一笔转账
2. 在第一次广播完成前快速连续点击发送按钮

**预期结果**：

- 只广播一次交易
- 按钮在广播过程中置灰或显示 loading，防止重复提交

---

## 测试执行说明

### 单元测试（Vitest）

适用范围：TC-BTC-KEY-_, TC-BTC-ADDR-_, TC-BTC-UTXO-_, TC-BTC-FEE-_

```bash
yarn test --grep "bitcoin"
```

### 集成测试（Testnet）

适用范围：TC-BTC-BAL-_, TC-BTC-TX-_, TC-BTC-API-\*

需要提前获取 Testnet tBTC（通过 Faucet），执行前确认测试地址有余额。

```bash
# 运行 Testnet 集成测试
yarn test:integration --grep "bitcoin"
```

> Testnet Faucet 参考：
>
> - https://coinfaucet.eu/en/btc-testnet/
> - https://bitcoinfaucet.uo1.net/
> - https://signetfaucet.com/（如使用 Signet）

### E2E 测试（Playwright）

适用范围：TC-BTC-CHAIN-_, TC-BTC-WALLET-_, TC-BTC-SEC-\*

```bash
yarn test:e2e --grep "bitcoin"
```

---

## 测试数据参考

```typescript
// 测试使用的 masterSeed（仅用于测试，不含真实资产）
export const TEST_SEED = new Uint8Array(32).fill(1)

// 常用测试常量
export const BTC_TEST_CONSTANTS = {
  DUST_THRESHOLD: 546, // satoshis
  TYPICAL_P2WPKH_VBYTES: 141, // 单输入单输出 P2WPKH 交易的典型 vBytes
  SATS_PER_BTC: 100_000_000,
}

// 地址格式测试向量
export const BTC_ADDRESS_VECTORS = {
  VALID_MAINNET_P2WPKH: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  VALID_TESTNET_P2WPKH: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  LEGACY_P2PKH: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  LEGACY_P2SH: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
}
```
