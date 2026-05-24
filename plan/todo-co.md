# Ring Wallet 第三方钱包集合集成方案

> 目标：将 Ring Wallet 集成到 WalletRadar、WalletConnect 等知名钱包集合/发现平台
> 参考链接：https://walletradar.org/docs/

---

## 一、集成目标平台概览

### 1.1 核心平台

| 平台                     | 类型              | 流量/影响力    | 集成难度 | 优先级 |
| ------------------------ | ----------------- | -------------- | -------- | ------ |
| **WalletRadar**          | 钱包研究/对比平台 | 开发者首选参考 | 低       | P0     |
| **WalletConnect**        | 通用连接协议      | 行业标配       | 中       | P0     |
| **Ethereum.org Wallets** | 官方钱包列表      | 新手入口       | 低       | P1     |
| **ChainList**            | 链信息聚合        | 开发者工具     | 低       | P1     |
| **WalletBeat**           | 安全审计数据库    | 安全导向用户   | 中       | P2     |

### 1.2 集成价值

- **流量获取**：被更多用户发现，降低获客成本
- **信任背书**：第三方平台的审核和推荐 = 免费信任背书
- **SEO 提升**：反向链接提升搜索排名
- **开发者生态**：被 dApp 开发者纳入兼容测试矩阵

---

## 二、WalletRadar 集成方案

### 2.1 WalletRadar 简介

WalletRadar 是一个**开发者导向的加密钱包研究和对比平台**，特点：

- 独立、开源、教育性质
- 基于 GitHub API、WalletBeat 等公开数据源评分
- 分数从可见的对比表格列自动生成，非手工调优
- 覆盖 Software Wallets、Hardware Wallets、Crypto Cards、On/Off Ramps 四大类

### 2.2 集成方式

WalletRadar 是**开源项目**，通过 GitHub 提交数据来添加钱包。

**步骤**：

#### Step 1：准备钱包数据

根据 WalletRadar 的数据格式，准备 Ring Wallet 的完整信息：

```yaml
# Ring Wallet 基础信息
name: 'Ring Wallet'
category: 'software'
launch_date: '2025-XX-XX' # 需确认
website: 'https://wallet.ring.exchange'
github: 'https://github.com/ringprotocol/wallet'
license: 'GPL'

# 核心特性
custody: 'self-custody' # 自托管
key_management: 'passkey' # Passkey 生物识别
account_type: 'eoa + smart_account' # EOA + EIP-7951 智能账户
open_source: true

# 平台支持
platforms:
  - pwa: true # PWA 应用
  - browser_extension: true # Chrome 扩展
  - mobile_web: true # 移动端网页

# 链支持（7+ 链）
chains:
  - ethereum
  - base
  - arbitrum
  - optimism
  - bnb
  - polygon
  - solana
  - bitcoin
  - tron
  - dogecoin
  - cosmos

# 安全特性
security:
  - biometric_auth: true # 生物识别认证
  - no_seed_phrase: true # 无助记词
  - transaction_simulation: false # 暂不支持（可规划）
  - hardware_wallet_support: false # 暂不支持
  - audit: false # 待进行第三方审计

# 开发者特性
dev_features:
  - dapp_browser: true # 内置 DApp 浏览器
  - wallet_connect: false # 暂不支持（需集成）
  - custom_rpc: true # 支持自定义 RPC
  - testnet_support: true # 支持测试网

# 评分相关数据（WalletRadar 自动抓取）
github_metrics:
  stars: '待统计'
  issues: '待统计'
  last_commit: '待统计'
  contributors: '待统计'
```

#### Step 2：提交到 WalletRadar

1. Fork [WalletRadar GitHub 仓库](https://github.com/)
2. 在对应分类（Software Wallets）中添加 Ring Wallet 数据
3. 提交 Pull Request
4. 等待维护者审核合并

**提交内容**：

- 钱包基本信息表格行
- 图标/logo（SVG 格式）
- 官网和 GitHub 链接
- 功能特性勾选

#### Step 3：持续维护

- 定期更新版本号和新功能
- 回应社区 Issue 中的问题
- 保持 GitHub 活跃度（stars、commits）

### 2.3 评分优化建议

WalletRadar 的评分基于多个维度。针对 Ring Wallet 的短板，建议：

| 维度                          | 当前状态      | 优化建议                          |
| ----------------------------- | ------------- | --------------------------------- |
| **Transparency（透明度）**    | 开源 ✅       | 保持 GPL 开源，完善文档           |
| **Security（安全）**          | 无第三方审计  | 尽快安排 CertiK/OpenZeppelin 审计 |
| **Dev Control（开发者控制）** | 自定义 RPC ✅ | 增加更多开发者工具                |
| **Core（核心功能）**          | 多链 ✅       | 增加 WalletConnect 支持提升兼容性 |

---

## 三、WalletConnect 集成方案

### 3.1 WalletConnect 简介

WalletConnect 是 Web3 的**通用连接协议**，几乎所有 dApp 都支持。集成 WalletConnect 意味着：

- Ring Wallet 用户可以在任意支持 WalletConnect 的 dApp 上连接
- Ring Wallet 出现在 WalletConnect 官方钱包列表中
- 获得 WalletConnect Cloud 的曝光

### 3.2 集成方式

WalletConnect 目前有两个版本：

- **v2（当前主流）**：基于 Relay 服务器，支持多链
- **v3（未来）**：更轻量，仍在开发中

Ring Wallet 应优先集成 **WalletConnect v2**。

#### 技术方案

Ring Wallet 目前已有自定义的 DApp 连接机制（`WalletBridge`），需要扩展支持 WalletConnect 协议。

**现有架构**：

```
DApp SDK (dappsdk.js) ──postMessage──→ WalletBridge ──→ Ring Wallet
```

**目标架构**：

```
DApp (WalletConnect) ──WC Protocol──→ WalletConnect Provider ──→ Ring Wallet
                                     │
DApp (Ring SDK) ────────postMessage──→ WalletBridge ─────────────┘
```

#### 实现步骤

**Step 1：安装 WalletConnect 依赖**

```bash
npm install @walletconnect/ethereum-provider @walletconnect/types
```

**Step 2：创建 WalletConnect Provider 适配器**

```typescript
// src/features/dapps/services/walletConnectProvider.ts
import { EthereumProvider } from '@walletconnect/ethereum-provider'
import type { BridgeConfig } from './walletBridge'

export class WalletConnectProvider {
  private provider: EthereumProvider | null = null
  private config: BridgeConfig

  constructor(config: BridgeConfig) {
    this.config = config
  }

  async init(projectId: string): Promise<void> {
    this.provider = await EthereumProvider.init({
      projectId,
      chains: [this.config.getActiveChainId()],
      showQrModal: false, // Ring Wallet 使用自己的 UI
      methods: [
        'eth_sendTransaction',
        'eth_sign',
        'personal_sign',
        'eth_signTypedData',
        'eth_signTypedData_v4',
        'wallet_switchEthereumChain',
        'wallet_addEthereumChain',
      ],
      events: ['chainChanged', 'accountsChanged'],
    })

    // 监听连接请求
    this.provider.on('connect', this.handleConnect.bind(this))
    this.provider.on('disconnect', this.handleDisconnect.bind(this))
    this.provider.on('session_request', this.handleSessionRequest.bind(this))
  }

  private async handleSessionRequest(event: {
    id: number
    topic: string
    params: unknown
  }): Promise<void> {
    // 使用 Ring Wallet 的审批流程
    const { id, params } = event
    const request = (
      params as { request: { method: string; params: unknown[] } }
    ).request

    // 转发到现有的 WalletBridge 审批机制
    // ...
  }

  async approveSession(accounts: string[], chainId: number): Promise<void> {
    await this.provider?.approveSession({ accounts, chainId })
  }

  async rejectSession(): Promise<void> {
    await this.provider?.rejectSession()
  }

  async respondRequest(id: number, result: unknown): Promise<void> {
    await this.provider?.respond({ id, result })
  }

  async disconnect(): Promise<void> {
    await this.provider?.disconnect()
  }
}
```

**Step 3：注册到 WalletConnect Cloud**

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 注册账号并创建新项目
3. 获取 `projectId`
4. 提交钱包信息：
   - 名称：Ring Wallet
   - 图标：上传 logo
   - 下载链接：Chrome Web Store / PWA 链接
   - 支持平台：Extension、PWA
   - 支持链：Ethereum、Base、Solana 等

**Step 4：在 DApp 列表中展示**

WalletConnect Cloud 会自动将注册的钱包展示在：

- WalletConnect 官方钱包列表
- 合作 dApp 的"连接钱包"弹窗中

### 3.3 多链支持

WalletConnect v2 原生支持多链会话。Ring Wallet 需要：

```typescript
// 初始化时声明所有支持的链
const provider = await EthereumProvider.init({
  projectId,
  chains: [1, 8453, 137, 56, 42161, 10], // ETH, Base, Polygon, BNB, Arb, OP
  optionalChains: [501, 1], // Solana 需要额外适配
  // ...
})
```

**注意**：Solana 使用不同的签名机制，需要单独适配或提示用户切换到 EVM 链。

---

## 四、Ethereum.org Wallets 集成

### 4.1 简介

Ethereum.org 是以太坊基金会的官方网站，其 [Wallets 页面](https://ethereum.org/en/wallets/find-wallet/) 是新用户发现钱包的主要入口。

### 4.2 集成方式

Ethereum.org 的钱包列表通过 GitHub 维护：

1. Fork [ethereum.org 仓库](https://github.com/ethereum/ethereum-org-website)
2. 在 `src/data/wallets/` 添加 Ring Wallet 数据
3. 提交 PR 并等待审核

**数据格式**：

```json
{
  "id": "ring-wallet",
  "name": "Ring Wallet",
  "description": "A secure multi-chain crypto wallet with biometric login. No passwords, no mnemonics.",
  "url": "https://wallet.ring.exchange",
  "brand_color": "#XXXXXX",
  "logo": "ring-wallet.png",
  "active": true,
  "new_to_crypto": true,
  "features": [
    " biometric_auth",
    "multi_chain",
    "self_custody",
    "dapp_browser",
    "nft_support"
  ],
  "supported_chains": ["ethereum", "base", "polygon"],
  "platforms": ["browser", "mobile"],
  "social_links": {
    "twitter": "https://x.com/ringexchange",
    "github": "https://github.com/ringprotocol/wallet"
  }
}
```

### 4.3 审核标准

Ethereum.org 对钱包有严格要求：

- ✅ 开源代码
- ✅ 自托管
- ✅ 活跃维护
- ✅ 无恶意行为记录
- ⚠️ 建议有第三方安全审计

---

## 五、ChainList 集成

### 5.1 简介

ChainList 是 [DefiLlama](https://defillama.com/) 旗下的链信息聚合平台，开发者常用来查找 RPC 节点。

### 5.2 集成方式

ChainList 主要收录链信息而非钱包，但 Ring Wallet 可以：

1. 确保 Ring Wallet 支持的所有链都在 ChainList 上有准确信息
2. 如果 Ring Wallet 提供公共 RPC，可提交到 ChainList

---

## 六、WalletBeat 集成

### 6.1 简介

WalletBeat 是 WalletRadar 的数据源之一，专注于钱包安全审计和许可证信息。

### 6.2 集成方式

1. 访问 [WalletBeat](https://walletbeat.fyi/)
2. 提交钱包信息表单
3. 提供安全审计报告（如有）
4. 等待审核和评分

---

## 七、其他推广渠道

### 7.1 钱包发现平台

| 平台                                        | 集成方式     | 优先级 |
| ------------------------------------------- | ------------ | ------ |
| **CoinGecko**                               | 提交钱包信息 | P2     |
| **CoinMarketCap**                           | 提交钱包信息 | P2     |
| **Product Hunt**                            | 发布产品     | P2     |
| **Reddit (r/ethfinance, r/cryptocurrency)** | 社区推广     | P2     |
| **Twitter/X**                               | 官方账号运营 | P1     |

### 7.2 dApp 合作

主动与热门 dApp 合作，确保 Ring Wallet 在其"连接钱包"列表中：

- Uniswap、Aave、Compound 等 DeFi 协议
- OpenSea、Blur 等 NFT 市场
- Polymarket（已集成）等预测市场

---

## 八、集成优先级与时间表

### 8.1 优先级矩阵

```
            高影响力
               │
    ┌──────────┼──────────┐
    │          │          │
    │  Wallet  │  Wallet  │
    │  Radar   │ Connect  │
    │   (P0)   │   (P0)   │
低  │          │          │  高
难  ├──────────┼──────────┤  易
度  │          │          │  度
    │  Wallet  │ Ethereum │
    │  Beat    │ .org     │
    │   (P2)   │   (P1)   │
    │          │          │
    └──────────┼──────────┘
               │
            低影响力
```

### 8.2 实施时间表

| 阶段        | 时间   | 目标                                       |
| ----------- | ------ | ------------------------------------------ |
| **Phase 1** | 1-2 周 | WalletRadar 提交、WalletConnect Cloud 注册 |
| **Phase 2** | 2-4 周 | WalletConnect SDK 集成开发、测试           |
| **Phase 3** | 4-6 周 | Ethereum.org 提交、WalletBeat 提交         |
| **Phase 4** | 6-8 周 | 社区推广、Product Hunt 发布                |

---

## 九、技术实现清单

### 9.1 WalletConnect 集成任务

- [ ] 注册 WalletConnect Cloud 项目，获取 `projectId`
- [ ] 安装 `@walletconnect/ethereum-provider`
- [ ] 创建 `WalletConnectProvider` 适配器类
- [ ] 实现 session 请求审批流程（复用现有 `ApprovalDialog`）
- [ ] 实现 `eth_sendTransaction` 转发到现有签名服务
- [ ] 实现 `personal_sign` / `eth_signTypedData` 转发
- [ ] 实现 `wallet_switchEthereumChain` 支持
- [ ] 实现 `wallet_addEthereumChain` 支持
- [ ] 在 DApp 浏览器中同时支持 Ring SDK 和 WalletConnect
- [ ] QA 测试：连接 Uniswap、Aave 等主流 dApp
- [ ] 提交到 WalletConnect 官方钱包列表

### 9.2 数据准备任务

- [ ] 准备 WalletRadar 所需的所有钱包数据
- [ ] 准备各尺寸 logo（16x16, 32x32, 128x128, 512x512）
- [ ] 准备钱包截图（首页、发送、DApp 浏览器等）
- [ ] 准备品牌素材（品牌色、标语、描述文案）
- [ ] 整理 GitHub 仓库信息（stars、contributors、license）

### 9.3 安全与合规

- [ ] 安排第三方安全审计（CertiK / OpenZeppelin / Trail of Bits）
- [ ] 准备隐私政策页面（已有）
- [ ] 准备服务条款页面（已有）
- [ ] 确保开源许可证合规（GPL）

---

## 十、成功指标

| 指标                     | 目标值             | 时间线 |
| ------------------------ | ------------------ | ------ |
| WalletRadar 上线         | 被收录并展示       | 2 周内 |
| WalletConnect 集成完成   | 可连接任意 WC dApp | 4 周内 |
| Ethereum.org 上线        | 被收录             | 6 周内 |
| WalletConnect 月活连接数 | 1000+              | 3 个月 |
| 新用户来自钱包集合占比   | 10%+               | 6 个月 |

---

## 十一、参考资源

- [WalletRadar 文档](https://walletradar.org/docs/)
- [WalletRadar Contributing Guide](https://walletradar.org/docs/guide/contributing/)
- [WalletConnect Cloud](https://cloud.walletconnect.com/)
- [WalletConnect Docs](https://docs.walletconnect.com/)
- [Ethereum.org Wallets](https://ethereum.org/en/wallets/find-wallet/)
- [ChainList](https://chainlist.org/)
- [WalletBeat](https://walletbeat.fyi/)
