# Ring Wallet DApp SDK — 集成文档

## 概述

Ring Wallet DApp SDK 允许第三方 DApp 在 Ring Wallet 的 iframe 容器中与钱包进行通信。SDK 实现了两个以太坊标准：

- **EIP-1193** — Ethereum Provider JavaScript API（DApp 与钱包通信的标准接口）
- **EIP-6963** — Multi Injected Provider Discovery（多钱包环境下的发现机制）

当 DApp 被 Ring Wallet 以 iframe 形式加载时，SDK 通过 `postMessage` 与钱包父窗口通信，为 DApp 提供完整的以太坊 Provider 功能。

---

## 快速开始

### 1. 引入 SDK

在你的 HTML 页面的 `<head>` 中添加以下脚本标签，**确保在你的应用代码之前加载**：

```html
<script src="https://api.walletapp.testring.org/static/dappsdk.js"></script>
```

或者将 `dappsdk.js` 复制到你的项目中本地引入：

```html
<script src="/path/to/dappsdk.js"></script>
```

### 2. 使用 Provider

SDK 加载后会自动完成以下操作：

1. 创建 EIP-1193 兼容的 Provider 对象
2. 设置 `window.ethereum`（如果尚未被占用）
3. 通过 EIP-6963 事件公告 Ring Wallet Provider

因此，如果你已经使用了 wagmi、RainbowKit、web3-react 等标准库，**无需额外代码**即可与 Ring Wallet 交互。

#### 原生用法（不依赖任何库）

```javascript
// 方式 1：通过 window.ethereum（传统方式）
const provider = window.ethereum

// 方式 2：通过 window.ringWallet
const provider = window.ringWallet.provider

// 方式 3：通过 EIP-6963 发现（推荐）
window.addEventListener('eip6963:announceProvider', (event) => {
  const { info, provider } = event.detail
  console.log('发现钱包:', info.name) // "Ring Wallet"
  // 使用 provider...
})
window.dispatchEvent(new Event('eip6963:requestProvider'))
```

---

## API 参考

### `provider.request(args)`

EIP-1193 核心方法，所有 RPC 调用都通过此方法发起。

**参数：**

```typescript
interface RequestArguments {
  method: string
  params?: unknown[] | object
}
```

**返回：** `Promise<unknown>`

**示例：**

```javascript
// 请求连接钱包
const accounts = await provider.request({
  method: 'eth_requestAccounts'
})
console.log('连接的账户:', accounts[0])

// 获取当前链 ID
const chainId = await provider.request({
  method: 'eth_chainId'
})
console.log('Chain ID:', chainId) // "0x1"

// 获取余额
const balance = await provider.request({
  method: 'eth_getBalance',
  params: [accounts[0], 'latest']
})
```

### `provider.on(event, callback)`

监听 Provider 事件。

```javascript
// 账户变更
provider.on('accountsChanged', (accounts) => {
  console.log('新账户:', accounts)
})

// 链变更
provider.on('chainChanged', (chainId) => {
  console.log('新链:', chainId)
  // 建议在链变更时重新加载页面
  window.location.reload()
})

// 连接
provider.on('connect', (info) => {
  console.log('已连接, chainId:', info.chainId)
})

// 断开
provider.on('disconnect', (error) => {
  console.log('已断开:', error.message)
})
```

### `provider.removeListener(event, callback)`

移除事件监听器。

```javascript
function handleChainChanged(chainId) {
  console.log('链变更:', chainId)
}

provider.on('chainChanged', handleChainChanged)
// 稍后移除
provider.removeListener('chainChanged', handleChainChanged)
```

---

## 支持的 RPC 方法

### 账户相关

| 方法 | 说明 | 需要审批 |
|------|------|---------|
| `eth_requestAccounts` | 请求连接钱包，返回授权的账户列表 | 是（首次） |
| `eth_accounts` | 获取已连接的账户列表 | 否 |

### 链信息

| 方法 | 说明 | 需要审批 |
|------|------|---------|
| `eth_chainId` | 当前链 ID（hex） | 否 |
| `net_version` | 当前网络版本号（decimal string） | 否 |

### 只读查询（直接转发 RPC 节点）

| 方法 | 说明 |
|------|------|
| `eth_call` | 执行消息调用（不创建交易） |
| `eth_estimateGas` | 预估交易 Gas |
| `eth_getBalance` | 查询地址余额 |
| `eth_getBlockByNumber` | 按区块号查询区块 |
| `eth_getBlockByHash` | 按区块哈希查询区块 |
| `eth_getTransactionByHash` | 按交易哈希查询交易 |
| `eth_getTransactionReceipt` | 查询交易收据 |
| `eth_getTransactionCount` | 查询地址 nonce |
| `eth_getCode` | 查询合约代码 |
| `eth_getStorageAt` | 查询合约存储 |
| `eth_getLogs` | 查询事件日志 |
| `eth_gasPrice` | 查询当前 Gas 价格 |
| `eth_blockNumber` | 查询最新区块号 |

### 交易与签名（需要用户审批）

| 方法 | 说明 |
|------|------|
| `eth_sendTransaction` | 发送交易（钱包签名并广播） |
| `personal_sign` | 签名消息 |
| `eth_signTypedData_v4` | EIP-712 结构化数据签名 |
| `eth_signTypedData_v3` | EIP-712 结构化数据签名（v3） |

### 链管理（需要用户审批）

| 方法 | 说明 |
|------|------|
| `wallet_switchEthereumChain` | 切换到指定链 |
| `wallet_addEthereumChain` | 添加新链 |

---

## 常见使用场景

### 1. 连接钱包

```javascript
async function connectWallet() {
  try {
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    })
    console.log('已连接:', accounts[0])
    return accounts[0]
  } catch (err) {
    if (err.code === 4001) {
      console.log('用户拒绝了连接请求')
    } else {
      console.error('连接失败:', err)
    }
    return null
  }
}
```

### 2. 发送 ETH 转账

```javascript
async function sendETH(to, amountInEth) {
  const accounts = await provider.request({ method: 'eth_accounts' })
  if (accounts.length === 0) {
    await provider.request({ method: 'eth_requestAccounts' })
  }

  const amountWei = '0x' + (BigInt(Math.floor(amountInEth * 1e18))).toString(16)

  try {
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        to: to,
        value: amountWei,
      }]
    })
    console.log('交易已发送:', txHash)
    return txHash
  } catch (err) {
    if (err.code === 4001) {
      console.log('用户拒绝了交易')
    }
    throw err
  }
}
```

### 3. 调用合约方法（写入）

```javascript
async function approveToken(tokenAddress, spender, amount) {
  const accounts = await provider.request({ method: 'eth_accounts' })

  // ERC-20 approve 的 ABI 编码
  // approve(address,uint256) = 0x095ea7b3
  const data = '0x095ea7b3'
    + spender.slice(2).padStart(64, '0')
    + BigInt(amount).toString(16).padStart(64, '0')

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: tokenAddress,
      data: data,
    }]
  })

  return txHash
}
```

### 4. 签名消息（用于登录验证）

```javascript
async function signLogin(message) {
  const accounts = await provider.request({ method: 'eth_accounts' })

  // personal_sign 参数顺序：[message, address]
  const signature = await provider.request({
    method: 'personal_sign',
    params: [
      '0x' + Array.from(new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      accounts[0]
    ]
  })

  return signature
}
```

### 5. EIP-712 结构化数据签名

```javascript
async function signPermit(tokenAddress, spender, value, deadline) {
  const accounts = await provider.request({ method: 'eth_accounts' })
  const chainId = await provider.request({ method: 'eth_chainId' })

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    domain: {
      name: 'My Token',
      version: '1',
      chainId: parseInt(chainId, 16),
      verifyingContract: tokenAddress,
    },
    message: {
      owner: accounts[0],
      spender: spender,
      value: value,
      nonce: 0,
      deadline: deadline,
    },
  }

  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [accounts[0], JSON.stringify(typedData)]
  })

  return signature
}
```

### 6. 切换网络

```javascript
async function switchToSepolia() {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }]  // Sepolia = 11155111
    })
  } catch (err) {
    if (err.code === 4902) {
      console.log('该网络未添加到钱包中')
    } else if (err.code === 4001) {
      console.log('用户拒绝了切换请求')
    }
  }
}
```

### 7. 使用 EIP-6963 发现 Provider

```javascript
const providers = []

window.addEventListener('eip6963:announceProvider', (event) => {
  providers.push(event.detail)
  console.log(`发现钱包: ${event.detail.info.name} (${event.detail.info.rdns})`)

  // 找到 Ring Wallet
  if (event.detail.info.rdns === 'org.testring.ringwallet') {
    const ringProvider = event.detail.provider
    ringProvider.request({ method: 'eth_requestAccounts' })
  }
})

// 触发发现
window.dispatchEvent(new Event('eip6963:requestProvider'))
```

---

## 与主流库集成

### wagmi / viem

wagmi v2+ 原生支持 EIP-6963，SDK 加载后 Ring Wallet 会自动出现在连接器列表中：

```javascript
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

// Ring Wallet 会自动被发现，无需额外配置
```

### ethers.js v6

```javascript
import { BrowserProvider } from 'ethers'

// 使用 Ring Wallet 的 Provider
const provider = new BrowserProvider(window.ethereum)
const signer = await provider.getSigner()
const address = await signer.getAddress()
```

### web3.js

```javascript
import Web3 from 'web3'

const web3 = new Web3(window.ethereum)
const accounts = await web3.eth.requestAccounts()
```

---

## 错误处理

SDK 使用 EIP-1193 标准错误码：

| 错误码 | 含义 | 说明 |
|--------|------|------|
| `4001` | User Rejected | 用户拒绝了请求（连接/交易/签名） |
| `4100` | Unauthorized | 请求的方法或账户未授权 |
| `4200` | Unsupported Method | 不支持的 RPC 方法，或请求超时 |
| `4900` | Disconnected | Provider 已断开连接 |
| `4901` | Chain Disconnected | Provider 与指定链断开 |
| `4902` | Chain Not Added | 钱包不支持请求的链 |

```javascript
try {
  await provider.request({ method: 'eth_sendTransaction', params: [tx] })
} catch (err) {
  switch (err.code) {
    case 4001:
      showToast('你取消了交易')
      break
    case 4100:
      showToast('请先连接钱包')
      break
    case 4900:
      showToast('钱包已断开连接')
      break
    default:
      showToast('交易失败: ' + err.message)
  }
}
```

---

## 检测 Ring Wallet 环境

```javascript
// 检测是否在 Ring Wallet iframe 中
function isInRingWallet() {
  return !!(window.ringWallet || (window.ethereum && window.ethereum.isRingWallet))
}

// 检测是否在 iframe 中
function isInIframe() {
  try { return window.self !== window.top } catch (_) { return true }
}
```

---

## 全局对象

SDK 注入以下全局对象：

| 对象 | 说明 |
|------|------|
| `window.ethereum` | EIP-1193 Provider 实例（如果未被其他钱包占用） |
| `window.ringWallet.provider` | EIP-1193 Provider 实例（始终可用） |
| `window.ringWallet.version` | SDK 版本号 |

---

## 注意事项

1. **脚本加载顺序**：确保 `dappsdk.js` 在你的应用代码之前加载，以便 `window.ethereum` 在应用初始化时已就绪。
2. **事件监听**：始终监听 `accountsChanged` 和 `chainChanged` 事件以保持 UI 同步。
3. **重复注入**：SDK 内部有防重复机制（`window.__ringWalletInitialized`），多次引入不会冲突。
4. **非 iframe 环境**：在非 iframe 环境中 SDK 仍会加载，但 postMessage 通信不会触发（无 parent window）。
5. **超时**：需要用户审批的请求（交易/签名）超时时间为 5 分钟，给用户充分的确认时间。
