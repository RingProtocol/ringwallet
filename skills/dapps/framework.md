# DApp 框架设计文档

## 1. 架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                   PWA Wallet (Parent Window)             │
│                                                         │
│  ┌─────────────┐    ┌────────────────────────────────┐  │
│  │  DApp List   │───▶│     DApp Container Page        │  │
│  │  (首页列表)  │    │  ┌──────────────────────────┐  │  │
│  │              │    │  │       <iframe>            │  │  │
│  │  fetch from  │    │  │                          │  │  │
│  │  API server  │    │  │  ┌────────────────────┐  │  │  │
│  └─────────────┘    │  │  │  Injected Provider  │  │  │  │
│                      │  │  │  (EIP-1193)        │  │  │  │
│                      │  │  │  (EIP-6963)        │  │  │  │
│                      │  │  └────────┬───────────┘  │  │  │
│                      │  │           │ postMessage   │  │  │
│                      │  └───────────┼──────────────┘  │  │
│                      │              │                  │  │
│  ┌──────────────────┼──────────────┼───────────────┐  │  │
│  │   WalletBridge   │              │               │  │  │
│  │   ┌──────────────▼──────────────▼────────────┐  │  │  │
│  │   │         Message Router                   │  │  │  │
│  │   │  ┌──────────┐  ┌────────────────────┐    │  │  │  │
│  │   │  │ ReadOnly │  │ Approval Required  │    │  │  │  │
│  │   │  │ Handler  │  │ Handler            │    │  │  │  │
│  │   │  │          │  │  ┌──────────────┐  │    │  │  │  │
│  │   │  │ eth_call │  │  │ Approval UI  │  │    │  │  │  │
│  │   │  │ getBalance│  │  │ (Connect /   │  │    │  │  │  │
│  │   │  │ chainId  │  │  │  Sign / Send) │  │    │  │  │  │
│  │   │  └──────────┘  │  └──────────────┘  │    │  │  │  │
│  │   │                └────────────────────┘    │  │  │  │
│  │   └──────────────────────────────────────────┘  │  │  │
│  └─────────────────────────────────────────────────┘  │  │
│                      └────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Wallet Core (AuthContext / walletService / ethers) ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
         ↕ HTTP                    ↕ JSON-RPC
┌──────────────────┐       ┌──────────────────┐
│ api.walletapp.   │       │  Blockchain RPC  │
│ testring.org     │       │  Nodes           │
│ (DApp列表/代理)  │       │                  │
└──────────────────┘       └──────────────────┘
```

### 1.2 核心模块

| 模块 | 职责 | 位置 |
|------|------|------|
| **DApp 列表服务** | 从 API 获取、缓存、展示 DApp 列表 | `src/features/dapps/` |
| **DApp 容器** | iframe 沙箱，承载 DApp 页面 | `src/features/dapps/components/` |
| **Injected Provider** | 注入 DApp 的 EIP-1193 / EIP-6963 提供者 | `src/features/dapps/provider/` |
| **WalletBridge** | 钱包侧消息处理、操作审批、RPC 转发 | `src/features/dapps/services/` |
| **Approval UI** | 连接 / 签名 / 交易确认弹窗 | `src/features/dapps/components/` |

### 1.3 数据流

```
用户点击 DApp
    │
    ▼
DAppContainer 创建 iframe
    │
    ▼
iframe 加载 DApp 页面（通过代理注入 Provider 脚本）
    │
    ▼
Provider 脚本执行：
  ├── 创建 EIP-1193 Provider 对象
  ├── 设置 window.ethereum（向后兼容）
  └── 通过 EIP-6963 发出 announceProvider 事件
    │
    ▼
DApp 调用 provider.request({ method, params })
    │
    ▼
Provider 将请求序列化为 postMessage 发送给 parent window
    │
    ▼
WalletBridge 接收消息，路由处理：
  ├── 只读方法 → 直接转发 RPC 节点，返回结果
  └── 敏感方法 → 弹出审批 UI → 用户确认 → 签名/发送 → 返回结果
    │
    ▼
结果通过 postMessage 返回给 iframe 中的 Provider
    │
    ▼
Provider 将 Promise resolve/reject 给 DApp
```

---

## 2. DApp 列表

### 2.1 API 接口

```
GET https://api.walletapp.testring.org/v1/dapps

Headers:
  Accept: application/json
  X-Wallet-Version: 1.0.0
  X-Platform: pwa
```

**响应结构**：

```typescript
interface DAppListResponse {
  dapps: DAppInfo[]
  categories: DAppCategory[]
  updated_at: string // ISO 8601
}

interface DAppInfo {
  id: string              // 唯一标识, e.g. "uniswap"
  name: string            // 显示名称
  description: string     // 简介
  url: string             // DApp 入口 URL
  icon: string            // 图标 URL
  chains: number[]        // 支持的 chainId 列表
  category: string        // 分类 ID
  featured: boolean       // 是否推荐
  inject_mode: 'proxy' | 'sdk'  // Provider 注入方式
  status: 'active' | 'maintenance' | 'deprecated'
}

interface DAppCategory {
  id: string
  name: string
  icon: string
  sort_order: number
}
```

### 2.2 DApp 列表缓存策略

```typescript
// src/features/dapps/services/dappService.ts

const CACHE_KEY = 'ring_dapp_list'
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

async function fetchDAppList(): Promise<DAppListResponse> {
  // 1. 检查内存/localStorage 缓存
  // 2. 如果缓存有效，直接返回
  // 3. 否则请求 API，更新缓存
  // 4. 请求失败时降级使用过期缓存
}
```

### 2.3 列表页面组件

```
DAppListPage
├── SearchBar           # 搜索过滤
├── CategoryTabs        # 分类标签 (All / DeFi / NFT / Games / ...)
├── FeaturedCarousel    # 推荐 DApp 轮播（featured: true）
└── DAppGrid            # DApp 卡片网格
    └── DAppCard        # 单个 DApp 卡片（图标 + 名称 + 描述）
        └── onClick → navigate to DAppContainer
```

---

## 3. DApp 容器（iframe 沙箱）

### 3.1 iframe 配置

```tsx
<iframe
  id={`dapp-frame-${dapp.id}`}
  src={buildDAppUrl(dapp)}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
  allow="clipboard-read; clipboard-write"
  style={{ width: '100%', height: '100%', border: 'none' }}
  referrerPolicy="no-referrer"
/>
```

**`sandbox` 属性说明**：

| 属性 | 必要性 | 原因 |
|------|--------|------|
| `allow-scripts` | 必须 | DApp 需要执行 JavaScript |
| `allow-same-origin` | 必须 | DApp 需要访问其 origin 下的资源（API、localStorage 等） |
| `allow-forms` | 必须 | 部分 DApp 包含表单操作 |
| `allow-popups` | 可选 | 某些 DApp 需要弹出窗口（如跳转外部链接） |
| `allow-modals` | 可选 | 某些 DApp 使用 alert/confirm |

**不授予的权限**：
- `allow-top-navigation` — 禁止 DApp 控制顶层导航
- `allow-downloads` — 禁止自动下载

### 3.2 Provider 注入策略

#### 方案 A：服务端代理注入（推荐，兼容任意 DApp）

适用于需要兼容已有 DApp（如 Uniswap、Aave 等已使用 wagmi/RainbowKit 的项目）。

```
用户点击 DApp
    │
    ▼
Wallet 构建代理 URL:
  https://api.walletapp.testring.org/v1/proxy?url=https://app.uniswap.org
    │
    ▼
代理服务器:
  1. 请求原始 DApp 页面 HTML
  2. 在 <head> 最顶部注入 Provider 脚本:
     <script src="https://api.walletapp.testring.org/static/ring-provider.js"></script>
  3. 返回修改后的 HTML
    │
    ▼
iframe 加载代理页面
  → Provider 脚本先于 DApp 代码执行
  → window.ethereum 已就绪
  → EIP-6963 announceProvider 已触发
    │
    ▼
DApp 的 wagmi/web3-react/ethers 检测到 Provider，正常工作
```

**代理服务器核心逻辑**：

```
GET /v1/proxy?url={encodedDAppUrl}

1. 校验 url 是否在 DApp 白名单中
2. fetch 原始页面
3. 解析 HTML
4. 在 <head> 开头插入:
   <script>
     // ring-provider.js 的内联内容
     // 或引用外部脚本
   </script>
5. 重写相对路径资源引用（CSS/JS/图片等）为绝对路径
6. 返回修改后的 HTML，设置适当的 CSP headers
```

#### 方案 B：DApp SDK 集成

适用于与钱包深度集成的合作 DApp。

```typescript
// DApp 侧引入 SDK
import { RingWalletSDK } from '@ring-wallet/dapp-sdk'

const provider = RingWalletSDK.getProvider()
// provider 实现 EIP-1193 接口
// 自动检测 iframe 环境并使用 postMessage 通信
```

### 3.3 DApp 容器组件结构

```
DAppContainerPage
├── DAppNavBar              # 顶部导航栏
│   ├── BackButton          # 返回 DApp 列表
│   ├── DAppTitle + Icon    # 当前 DApp 信息
│   ├── URLDisplay          # 显示当前 URL（安全提示）
│   └── MenuButton          # 刷新 / 断开连接 / 分享
├── ConnectionStatusBar     # 连接状态条（已连接的地址 + 链）
└── DAppIframe              # iframe 容器
```

---

## 4. EIP-1193 Provider 实现

### 4.1 核心接口

[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) 定义了 Ethereum Provider JavaScript API，是 DApp 与钱包通信的标准接口。

```typescript
// src/features/dapps/provider/RingProvider.ts

interface EIP1193Provider {
  request(args: RequestArguments): Promise<unknown>
  on(eventName: string, listener: (...args: any[]) => void): void
  removeListener(eventName: string, listener: (...args: any[]) => void): void
}

interface RequestArguments {
  method: string
  params?: readonly unknown[] | object
}

interface ProviderRpcError extends Error {
  code: number
  data?: unknown
}
```

### 4.2 Provider 实现（注入到 DApp 的脚本）

```typescript
class RingWalletProvider implements EIP1193Provider {
  private _chainId: string | null = null
  private _accounts: string[] = []
  private _connected: boolean = false
  private _requestId: number = 0
  private _pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map()
  private _eventListeners: Map<string, Set<Function>> = new Map()

  constructor() {
    this._setupMessageListener()
    this._handshake()
  }

  // ─── EIP-1193 核心方法 ──────────────────────────────

  async request(args: RequestArguments): Promise<unknown> {
    const { method, params } = args

    // 本地可直接处理的方法
    if (method === 'eth_accounts') {
      return [...this._accounts]
    }
    if (method === 'eth_chainId') {
      return this._chainId
    }
    if (method === 'net_version') {
      return this._chainId ? String(parseInt(this._chainId, 16)) : null
    }

    // 其他方法通过 postMessage 转发给 Wallet
    return this._sendRequest(method, params)
  }

  // ─── EIP-1193 事件方法 ──────────────────────────────

  on(eventName: string, listener: (...args: any[]) => void): void {
    if (!this._eventListeners.has(eventName)) {
      this._eventListeners.set(eventName, new Set())
    }
    this._eventListeners.get(eventName)!.add(listener)
  }

  removeListener(eventName: string, listener: (...args: any[]) => void): void {
    this._eventListeners.get(eventName)?.delete(listener)
  }

  emit(eventName: string, ...args: any[]): void {
    this._eventListeners.get(eventName)?.forEach(listener => {
      try { listener(...args) } catch (e) { console.error(e) }
    })
  }

  // ─── postMessage 通信 ──────────────────────────────

  private _sendRequest(method: string, params?: any): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this._requestId
      this._pendingRequests.set(id, { resolve, reject })

      window.parent.postMessage({
        type: 'ring_wallet_request',
        id,
        method,
        params: params || []
      }, '*') // origin 由 WalletBridge 侧校验

      // 超时处理
      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id)
          reject(new ProviderRpcError(4200, 'Request timeout'))
        }
      }, 300_000) // 5 分钟超时（用户可能需要时间审批）
    })
  }

  private _setupMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      // 处理响应
      if (data.type === 'ring_wallet_response') {
        const pending = this._pendingRequests.get(data.id)
        if (pending) {
          this._pendingRequests.delete(data.id)
          if (data.error) {
            pending.reject(new ProviderRpcError(data.error.code, data.error.message))
          } else {
            pending.resolve(data.result)
          }
        }
      }

      // 处理钱包推送的事件
      if (data.type === 'ring_wallet_event') {
        this._handleWalletEvent(data.event, data.data)
      }
    })
  }

  private _handleWalletEvent(event: string, data: any): void {
    switch (event) {
      case 'chainChanged':
        this._chainId = data
        this.emit('chainChanged', data)
        break
      case 'accountsChanged':
        this._accounts = data
        this.emit('accountsChanged', data)
        break
      case 'connect':
        this._connected = true
        this._chainId = data.chainId
        this.emit('connect', data)
        break
      case 'disconnect':
        this._connected = false
        this._accounts = []
        this.emit('disconnect', data)
        break
    }
  }

  private _handshake(): void {
    // 初始化时向 Wallet 请求当前状态
    window.parent.postMessage({
      type: 'ring_wallet_handshake',
      version: '1.0.0'
    }, '*')
  }
}
```

### 4.3 RPC 方法分类

| 分类 | 方法 | 是否需要审批 | 处理方式 |
|------|------|------------|---------|
| **账户** | `eth_requestAccounts` | 需要（首次连接） | 弹出连接审批 UI |
| **账户** | `eth_accounts` | 不需要 | Provider 本地返回 |
| **链信息** | `eth_chainId` | 不需要 | Provider 本地返回 |
| **链信息** | `net_version` | 不需要 | Provider 本地返回 |
| **只读查询** | `eth_call` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_getBalance` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_getTransactionReceipt` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_estimateGas` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_getBlockByNumber` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_getCode` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_getStorageAt` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_getLogs` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_getTransactionCount` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_gasPrice` | 不需要 | 直接转发 RPC 节点 |
| **只读查询** | `eth_blockNumber` | 不需要 | 直接转发 RPC 节点 |
| **交易** | `eth_sendTransaction` | **需要** | 弹出交易确认 UI |
| **签名** | `personal_sign` | **需要** | 弹出签名确认 UI |
| **签名** | `eth_signTypedData_v4` | **需要** | 弹出签名确认 UI |
| **链切换** | `wallet_switchEthereumChain` | **需要** | 弹出链切换确认 UI |
| **链添加** | `wallet_addEthereumChain` | **需要** | 弹出添加链确认 UI |
| **权限** | `wallet_requestPermissions` | 需要 | 弹出权限请求 UI |
| **权限** | `wallet_getPermissions` | 不需要 | 直接返回 |

### 4.4 错误码（EIP-1193 标准）

```typescript
class ProviderRpcError extends Error {
  code: number
  data?: unknown

  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

// 标准错误码
const RPC_ERRORS = {
  USER_REJECTED:       { code: 4001, message: 'User rejected the request' },
  UNAUTHORIZED:        { code: 4100, message: 'The requested method/account is not authorized' },
  UNSUPPORTED_METHOD:  { code: 4200, message: 'The provider does not support the requested method' },
  DISCONNECTED:        { code: 4900, message: 'The provider is disconnected from all chains' },
  CHAIN_DISCONNECTED:  { code: 4901, message: 'The provider is disconnected from the specified chain' },
  CHAIN_NOT_ADDED:     { code: 4902, message: 'Unrecognized chain ID' },
}
```

---

## 5. EIP-6963 多钱包发现机制

### 5.1 概述

[EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) 解决了多钱包环境下 `window.ethereum` 冲突的问题。通过事件驱动的发现机制，DApp 可以识别并选择多个可用钱包。

即使在 iframe 内只有 Ring Wallet 一个 Provider，也应实现 EIP-6963 以兼容使用现代钱包连接库（如 wagmi v2+、RainbowKit v2+）的 DApp。

### 5.2 接口定义

```typescript
// EIP-6963 Interfaces

interface EIP6963ProviderInfo {
  uuid: string        // 唯一标识符（每次页面加载生成）
  name: string        // 钱包名称
  icon: string        // data URI 格式的图标（SVG 或 PNG）
  rdns: string        // 反向域名标识符
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: EIP1193Provider
}

// 自定义事件类型
interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider'
  detail: EIP6963ProviderDetail
}

interface EIP6963RequestProviderEvent extends Event {
  type: 'eip6963:requestProvider'
}
```

### 5.3 实现（在注入脚本中）

```typescript
// Provider 脚本中的 EIP-6963 实现

const RING_WALLET_INFO: EIP6963ProviderInfo = {
  uuid: crypto.randomUUID(),       // 每次页面加载时生成新的
  name: 'Ring Wallet',
  icon: 'data:image/svg+xml;base64,<base64编码的钱包图标>',
  rdns: 'org.testring.ringwallet'  // 反向域名，全局唯一
}

function announceProvider(provider: RingWalletProvider): void {
  const detail: EIP6963ProviderDetail = Object.freeze({
    info: RING_WALLET_INFO,
    provider
  })

  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', {
      detail
    })
  )
}

// 监听 DApp 的发现请求
window.addEventListener('eip6963:requestProvider', () => {
  announceProvider(provider)
})

// Provider 创建后立即公告一次
announceProvider(provider)
```

### 5.4 初始化脚本完整流程

```typescript
// ring-provider.js — 注入到 DApp 页面的完整脚本

(function() {
  'use strict'

  // 防止重复注入
  if (window.__ringWalletInitialized) return
  window.__ringWalletInitialized = true

  // 1. 创建 EIP-1193 Provider 实例
  const provider = new RingWalletProvider()

  // 2. 设置 window.ethereum（向后兼容传统 DApp）
  //    使用 Object.defineProperty 防止被其他脚本覆盖
  Object.defineProperty(window, 'ethereum', {
    value: provider,
    writable: false,
    configurable: false
  })

  // 3. 设置 EIP-6963 发现机制
  const walletInfo: EIP6963ProviderInfo = {
    uuid: crypto.randomUUID(),
    name: 'Ring Wallet',
    icon: 'data:image/svg+xml;base64,...',
    rdns: 'org.testring.ringwallet'
  }

  function announceProvider() {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({ info: walletInfo, provider })
      })
    )
  }

  window.addEventListener('eip6963:requestProvider', announceProvider)
  announceProvider()

  // 4. 兼容性：设置 isMetaMask 标志（许多 DApp 依赖此检查）
  provider.isMetaMask = false
  provider.isRingWallet = true
})()
```

---

## 6. WalletBridge（钱包侧消息处理）

### 6.1 消息协议

所有 postMessage 消息遵循以下格式：

```typescript
// ─── DApp → Wallet ───────────────────────────────

interface WalletHandshakeMessage {
  type: 'ring_wallet_handshake'
  version: string
}

interface WalletRequestMessage {
  type: 'ring_wallet_request'
  id: number
  method: string
  params: unknown[]
}

// ─── Wallet → DApp ───────────────────────────────

interface WalletResponseMessage {
  type: 'ring_wallet_response'
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface WalletEventMessage {
  type: 'ring_wallet_event'
  event: 'chainChanged' | 'accountsChanged' | 'connect' | 'disconnect'
  data: unknown
}

interface WalletHandshakeAck {
  type: 'ring_wallet_handshake_ack'
  chainId: string
  networkVersion: string
}
```

### 6.2 WalletBridge 实现

```typescript
// src/features/dapps/services/walletBridge.ts

class WalletBridge {
  private iframeRef: HTMLIFrameElement | null = null
  private connectedAccounts: string[] = []
  private approvalCallback: ((request: ApprovalRequest) => Promise<boolean>) | null = null

  constructor(
    private walletService: WalletService,
    private authContext: AuthContext
  ) {}

  // 绑定 iframe 并开始监听
  attach(iframe: HTMLIFrameElement): void {
    this.iframeRef = iframe
    window.addEventListener('message', this.handleMessage)
  }

  detach(): void {
    window.removeEventListener('message', this.handleMessage)
    this.iframeRef = null
    this.connectedAccounts = []
  }

  // 设置审批回调（由 React 组件提供）
  setApprovalHandler(handler: (req: ApprovalRequest) => Promise<boolean>): void {
    this.approvalCallback = handler
  }

  private handleMessage = async (event: MessageEvent) => {
    // 安全校验：确认消息来源
    if (!this.iframeRef || event.source !== this.iframeRef.contentWindow) return
    const data = event.data
    if (!data || typeof data !== 'object') return

    try {
      if (data.type === 'ring_wallet_handshake') {
        this.handleHandshake()
      } else if (data.type === 'ring_wallet_request') {
        await this.handleRequest(data)
      }
    } catch (error) {
      console.error('[WalletBridge] Error handling message:', error)
    }
  }

  private handleHandshake(): void {
    const chainId = this.authContext.activeChain?.chainIdHex || '0x1'
    this.sendToIframe({
      type: 'ring_wallet_handshake_ack',
      chainId,
      networkVersion: String(parseInt(chainId, 16))
    })
  }

  private async handleRequest(data: WalletRequestMessage): Promise<void> {
    const { id, method, params } = data

    try {
      let result: unknown

      if (this.isReadOnlyMethod(method)) {
        result = await this.handleReadOnly(method, params)
      } else if (this.isApprovalRequired(method)) {
        result = await this.handleWithApproval(method, params)
      } else {
        throw new ProviderRpcError(4200, `Unsupported method: ${method}`)
      }

      this.sendToIframe({ type: 'ring_wallet_response', id, result })
    } catch (error) {
      this.sendToIframe({
        type: 'ring_wallet_response',
        id,
        error: {
          code: (error as ProviderRpcError).code || -32603,
          message: (error as Error).message || 'Internal error'
        }
      })
    }
  }

  // ─── 只读方法 ──────────────────────────────

  private isReadOnlyMethod(method: string): boolean {
    const readOnlyMethods = [
      'eth_call', 'eth_estimateGas', 'eth_getBalance',
      'eth_getBlockByNumber', 'eth_getBlockByHash',
      'eth_getTransactionByHash', 'eth_getTransactionReceipt',
      'eth_getTransactionCount', 'eth_getCode', 'eth_getStorageAt',
      'eth_getLogs', 'eth_gasPrice', 'eth_blockNumber',
      'eth_feeHistory', 'eth_maxPriorityFeePerGas',
      'eth_getBlockTransactionCountByNumber',
      'wallet_getPermissions',
    ]
    return readOnlyMethods.includes(method)
  }

  private async handleReadOnly(method: string, params: unknown[]): Promise<unknown> {
    // 直接转发到当前链的 RPC 节点
    const rpcUrl = this.authContext.activeChain?.rpcUrl
    if (!rpcUrl) throw new ProviderRpcError(4900, 'No active chain')

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      })
    })

    const json = await response.json()
    if (json.error) throw new ProviderRpcError(json.error.code, json.error.message)
    return json.result
  }

  // ─── 需要审批的方法 ──────────────────────────

  private isApprovalRequired(method: string): boolean {
    const approvalMethods = [
      'eth_requestAccounts', 'eth_sendTransaction',
      'personal_sign', 'eth_sign',
      'eth_signTypedData_v4', 'eth_signTypedData_v3', 'eth_signTypedData',
      'wallet_switchEthereumChain', 'wallet_addEthereumChain',
      'wallet_requestPermissions',
    ]
    return approvalMethods.includes(method)
  }

  private async handleWithApproval(method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      case 'eth_requestAccounts':
        return this.handleRequestAccounts()
      case 'eth_sendTransaction':
        return this.handleSendTransaction(params)
      case 'personal_sign':
        return this.handlePersonalSign(params)
      case 'eth_signTypedData_v4':
        return this.handleSignTypedData(params)
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChain(params)
      case 'wallet_addEthereumChain':
        return this.handleAddChain(params)
      default:
        throw new ProviderRpcError(4200, `Unsupported method: ${method}`)
    }
  }

  private async handleRequestAccounts(): Promise<string[]> {
    // 如果已连接，直接返回
    if (this.connectedAccounts.length > 0) return this.connectedAccounts

    // 弹出连接审批 UI
    const approved = await this.requestApproval({
      type: 'connect',
      title: '连接请求',
      description: 'DApp 请求连接你的钱包',
    })

    if (!approved) throw new ProviderRpcError(4001, 'User rejected')

    const address = this.authContext.activeWallet?.address
    if (!address) throw new ProviderRpcError(4100, 'No active wallet')

    this.connectedAccounts = [address]

    // 发送 connect 事件
    this.sendEvent('connect', { chainId: this.authContext.activeChain?.chainIdHex })
    this.sendEvent('accountsChanged', this.connectedAccounts)

    return this.connectedAccounts
  }

  private async handleSendTransaction(params: unknown[]): Promise<string> {
    const tx = params[0] as TransactionRequest

    const approved = await this.requestApproval({
      type: 'transaction',
      title: '交易确认',
      description: '请确认以下交易',
      data: tx
    })

    if (!approved) throw new ProviderRpcError(4001, 'User rejected')

    // 使用 walletService 签名并发送交易
    const txHash = await this.walletService.sendTransaction(tx)
    return txHash
  }

  private async handlePersonalSign(params: unknown[]): Promise<string> {
    const [message, address] = params as [string, string]

    const approved = await this.requestApproval({
      type: 'sign',
      title: '签名请求',
      description: '请确认签名以下消息',
      data: { message, address }
    })

    if (!approved) throw new ProviderRpcError(4001, 'User rejected')

    const signature = await this.walletService.personalSign(message, address)
    return signature
  }

  private async handleSignTypedData(params: unknown[]): Promise<string> {
    const [address, typedData] = params as [string, string]
    const parsed = typeof typedData === 'string' ? JSON.parse(typedData) : typedData

    const approved = await this.requestApproval({
      type: 'sign',
      title: '类型化数据签名',
      description: '请确认签名以下结构化数据',
      data: { address, typedData: parsed }
    })

    if (!approved) throw new ProviderRpcError(4001, 'User rejected')

    const signature = await this.walletService.signTypedData(address, parsed)
    return signature
  }

  private async handleSwitchChain(params: unknown[]): Promise<null> {
    const { chainId } = params[0] as { chainId: string }

    const approved = await this.requestApproval({
      type: 'switch_chain',
      title: '切换网络',
      description: `请求切换到 Chain ID: ${chainId}`,
      data: { chainId }
    })

    if (!approved) throw new ProviderRpcError(4001, 'User rejected')

    const chain = this.authContext.chains.find(
      c => c.chainIdHex === chainId
    )
    if (!chain) throw new ProviderRpcError(4902, 'Chain not found')

    await this.authContext.switchChain(chain)
    this.sendEvent('chainChanged', chainId)
    return null
  }

  // ─── 工具方法 ──────────────────────────────

  private async requestApproval(request: ApprovalRequest): Promise<boolean> {
    if (!this.approvalCallback) throw new ProviderRpcError(4100, 'No approval handler')
    return this.approvalCallback(request)
  }

  private sendToIframe(data: object): void {
    this.iframeRef?.contentWindow?.postMessage(data, '*')
  }

  sendEvent(event: string, data: unknown): void {
    this.sendToIframe({ type: 'ring_wallet_event', event, data })
  }

  // 当钱包侧主动切换链/账户时调用
  notifyChainChanged(chainId: string): void {
    this.sendEvent('chainChanged', chainId)
  }

  notifyAccountsChanged(accounts: string[]): void {
    this.connectedAccounts = accounts
    this.sendEvent('accountsChanged', accounts)
  }

  notifyDisconnect(error?: { code: number; message: string }): void {
    this.connectedAccounts = []
    this.sendEvent('disconnect', error || { code: 4900, message: 'Disconnected' })
  }
}
```

### 6.3 审批请求类型

```typescript
interface ApprovalRequest {
  type: 'connect' | 'transaction' | 'sign' | 'switch_chain' | 'add_chain' | 'permission'
  title: string
  description: string
  data?: unknown
}

// 交易审批 data 结构
interface TransactionApprovalData {
  from: string
  to: string
  value: string        // hex
  data: string         // calldata hex
  gas?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  // 解析后的信息（由钱包侧计算）
  parsedValue?: string       // 人类可读的 ETH 数量
  parsedMethod?: string      // 解码的方法名，如 "transfer(address,uint256)"
  estimatedGasFee?: string   // 预估 Gas 费用
  tokenInfo?: {              // 如果是 ERC-20 操作
    symbol: string
    amount: string
    decimals: number
  }
}
```

---

## 7. 审批 UI 设计

### 7.1 连接审批弹窗

```
┌────────────────────────────────┐
│         连接请求               │
│                                │
│  [DApp图标]                    │
│  Uniswap 请求连接你的钱包      │
│  https://app.uniswap.org      │
│                                │
│  将要分享：                    │
│  ✓ 查看你的钱包地址             │
│  ✓ 查看你的账户余额             │
│  ✓ 请求交易审批                 │
│                                │
│  当前账户：0x1234...5678       │
│  当前网络：Ethereum Mainnet    │
│                                │
│  [拒绝]            [连接]      │
└────────────────────────────────┘
```

### 7.2 交易确认弹窗

```
┌────────────────────────────────┐
│         交易确认               │
│                                │
│  [DApp图标] Uniswap           │
│                                │
│  操作：Swap                    │
│  ┌──────────────────────────┐  │
│  │ 发送  0.1 ETH            │  │
│  │ 接收  ~150.5 USDC        │  │
│  │ 合约  0xE592...1d0F      │  │
│  └──────────────────────────┘  │
│                                │
│  预估 Gas 费：~$2.50          │
│  网络：Ethereum Mainnet       │
│                                │
│  ──────── 详细信息 ▼ ──────── │
│  From: 0x1234...5678          │
│  To:   0xE592...1d0F          │
│  Value: 0.1 ETH               │
│  Data: 0x5ae4...               │
│                                │
│  [拒绝]          [确认交易]    │
└────────────────────────────────┘
```

### 7.3 签名确认弹窗

```
┌────────────────────────────────┐
│         签名请求               │
│                                │
│  [DApp图标] OpenSea           │
│                                │
│  请求签名以下消息：             │
│  ┌──────────────────────────┐  │
│  │ Welcome to OpenSea!      │  │
│  │                          │  │
│  │ Click to sign in and     │  │
│  │ accept the Terms of...   │  │
│  └──────────────────────────┘  │
│                                │
│  签名账户：0x1234...5678      │
│                                │
│  ⚠️ 请仅在你信任的网站签名     │
│                                │
│  [拒绝]            [签名]      │
└────────────────────────────────┘
```

---

## 8. 安全设计

### 8.1 Origin 校验

```typescript
// WalletBridge 中的来源校验
private isAllowedOrigin(event: MessageEvent): boolean {
  // 方案 A（代理模式）：所有 DApp 通过代理加载，origin 为代理服务器
  if (event.origin === 'https://api.walletapp.testring.org') return true

  // 方案 B（SDK 模式）：校验 DApp URL 是否在白名单中
  return this.allowedOrigins.has(event.origin)
}
```

### 8.2 安全策略清单

| 安全措施 | 说明 |
|---------|------|
| **iframe sandbox** | 限制 DApp 页面能力，禁止顶层导航和自动下载 |
| **Origin 校验** | WalletBridge 严格校验 postMessage 来源 |
| **用户审批** | 所有敏感操作（连接、交易、签名）必须用户确认 |
| **请求频率限制** | 限制同一 DApp 的 RPC 请求频率，防止滥用 |
| **URL 白名单** | 仅允许加载 API 返回的 DApp 列表中的 URL |
| **交易解析** | 展示人类可读的交易详情，而非原始 hex 数据 |
| **签名风险提示** | 对 EIP-712 签名解析 domain/message，高危操作标红警告 |
| **会话隔离** | 每个 DApp 独立的连接状态，关闭 iframe 即断开 |
| **超时机制** | 未响应的请求自动超时拒绝 |
| **CSP Headers** | 代理服务器设置严格的 Content-Security-Policy |

### 8.3 钓鱼防护

```typescript
// 交易签名前的安全检查
async function performSecurityCheck(tx: TransactionRequest): Promise<SecurityResult> {
  return {
    // 校验目标地址是否在已知恶意地址库中
    isKnownMalicious: await checkMaliciousAddress(tx.to),
    // 校验是否为 approve 无限额度
    isUnlimitedApproval: checkUnlimitedApproval(tx.data),
    // 校验合约是否已验证
    isVerifiedContract: await checkContractVerification(tx.to),
    // 风险等级
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }
}
```

---

## 9. 连接状态管理

### 9.1 DApp 连接会话

```typescript
interface DAppSession {
  dappId: string
  dappUrl: string
  connectedAt: number
  accounts: string[]           // 已授权的账户
  chainId: string              // 当前链
  permissions: string[]        // 已授权的权限
}

// 会话存储（内存中，关闭 iframe 即清除）
class DAppSessionManager {
  private sessions: Map<string, DAppSession> = new Map()

  connect(dappId: string, account: string, chainId: string): DAppSession
  disconnect(dappId: string): void
  getSession(dappId: string): DAppSession | null
  isConnected(dappId: string): boolean
}
```

### 9.2 钱包侧状态变更同步

当钱包侧主动切换账户或链时，需要通知所有已连接的 DApp：

```typescript
// AuthContext 中监听变化
useEffect(() => {
  if (activeWallet && dappBridge) {
    dappBridge.notifyAccountsChanged([activeWallet.address])
  }
}, [activeWallet])

useEffect(() => {
  if (activeChain && dappBridge) {
    dappBridge.notifyChainChanged(activeChain.chainIdHex)
  }
}, [activeChain])
```

---

## 10. 目录结构

```
src/features/dapps/
├── components/
│   ├── DAppListPage.tsx          # DApp 列表页面
│   ├── DAppCard.tsx              # 单个 DApp 卡片组件
│   ├── DAppContainer.tsx         # DApp iframe 容器页面
│   ├── DAppNavBar.tsx            # DApp 页面顶部导航
│   ├── ConnectionStatusBar.tsx   # 连接状态指示条
│   ├── ApprovalDialog.tsx        # 通用审批弹窗容器
│   ├── ConnectApproval.tsx       # 连接审批内容
│   ├── TransactionApproval.tsx   # 交易审批内容
│   ├── SignatureApproval.tsx     # 签名审批内容
│   └── ChainSwitchApproval.tsx   # 链切换审批内容
├── services/
│   ├── dappService.ts            # DApp 列表 API 请求与缓存
│   ├── walletBridge.ts           # postMessage 消息桥接
│   └── sessionManager.ts         # DApp 连接会话管理
├── provider/
│   ├── ringProvider.ts           # EIP-1193 Provider（编译后注入 DApp）
│   ├── eip6963.ts                # EIP-6963 公告逻辑
│   └── buildProviderScript.ts    # 构建注入脚本的工具
├── types/
│   ├── dapp.ts                   # DApp 数据类型
│   ├── messages.ts               # postMessage 消息类型
│   └── approval.ts               # 审批请求类型
├── hooks/
│   ├── useDAppList.ts            # DApp 列表数据 Hook
│   ├── useDAppConnection.ts      # DApp 连接状态 Hook
│   └── useApproval.ts            # 审批弹窗逻辑 Hook
└── constants/
    ├── rpcMethods.ts             # RPC 方法分类常量
    └── errors.ts                 # EIP-1193 错误码定义
```

---

## 11. 技术依赖

| 依赖 | 用途 | 是否已有 |
|------|------|---------|
| `ethers` v6 | RPC 调用、交易签名、消息签名、ABI 解码 | ✅ 已有 |
| `react` v18 | UI 组件 | ✅ 已有 |
| `uuid` | 生成 EIP-6963 uuid / 消息 ID | 可用 `crypto.randomUUID()` 替代 |

无需引入额外的第三方库，核心功能完全基于 Web 标准 API（postMessage、CustomEvent）和已有的 `ethers` 库实现。

---

## 12. 实施路线

### Phase 1：基础框架

- [ ] 实现 DApp 列表 API 对接与展示
- [ ] 实现 DApp iframe 容器（基础沙箱配置）
- [ ] 实现 postMessage 消息协议
- [ ] 实现 RingWalletProvider (EIP-1193)
- [ ] 实现 WalletBridge 消息路由

### Phase 2：连接与审批

- [ ] 实现 `eth_requestAccounts` 连接流程 + 审批 UI
- [ ] 实现 `eth_sendTransaction` 交易流程 + 确认 UI
- [ ] 实现 `personal_sign` / `eth_signTypedData_v4` 签名流程
- [ ] 实现 `wallet_switchEthereumChain` 链切换流程
- [ ] 实现只读 RPC 方法转发

### Phase 3：EIP-6963 与兼容性

- [ ] 实现 EIP-6963 Provider 公告机制
- [ ] 实现服务端代理注入方案
- [ ] 测试与主流 DApp（Uniswap、Aave、OpenSea 等）的兼容性

### Phase 4：安全与优化

- [ ] 实现交易解析（ABI 解码，token 信息展示）
- [ ] 实现安全检查（恶意地址检测、无限授权警告）
- [ ] 实现请求频率限制
- [ ] 性能优化（RPC 请求缓存、批量请求等）
