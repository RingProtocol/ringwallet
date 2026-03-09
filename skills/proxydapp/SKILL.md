---
name: proxydapp
description: DApp proxy framework for Ring Wallet PWA. Covers iframe container, postMessage bridge (EIP-1193/EIP-6963), server-side proxy injection, DApp list API, admin API, and Neon Postgres DB. Use when working on DApp features, proxy routes, DApp SDK, wallet-DApp communication, or the DApp admin panel.
---

# DApp Proxy & Container Framework

Ring Wallet 的 DApp 框架，通过 iframe + postMessage + 代理注入实现钱包与第三方 DApp 的交互。

## 架构概要

```
PWA Wallet (Parent Window)
├── DApp List (从 /api/v1/dapps 获取列表)
├── DApp Container (iframe 沙箱)
│   └── DApp 页面（通过代理注入 Provider 脚本）
│       ├── window.ethereum (EIP-1193)
│       └── EIP-6963 announceProvider
├── WalletBridge (postMessage 消息路由)
│   ├── 只读方法 → 转发 RPC 节点
│   └── 敏感方法 → 弹出审批 UI → 用户确认 → 签名/发送
└── Wallet Core (AuthContext / walletService / ethers)
```

两种 Provider 注入方式：
- **Proxy 模式**：`/api/v1/proxy?url=<dapp>` 代理加载 HTML 并在 `<head>` 注入 SDK 脚本，DApp 无需任何修改
- **SDK 模式**：DApp 主动引入 `dappsdk.js`，自动创建 EIP-1193 Provider 并通过 postMessage 与钱包通信

## 关键文件

### 前端（钱包侧 DApp 容器）

```
src/features/dapps/
├── components/
│   ├── DAppsPage.tsx          # 入口：列表 ↔ 容器切换
│   ├── DAppList.tsx           # 列表页（搜索/分类/推荐/卡片网格）
│   ├── DAppCard.tsx           # 单个 DApp 卡片
│   ├── DAppContainer.tsx      # iframe 容器 + WalletBridge 绑定
│   ├── ApprovalDialog.tsx     # 审批弹窗（连接/交易/签名/切链）
│   └── DApps.css
├── services/
│   ├── dappService.ts         # API 请求 + localStorage 缓存
│   └── walletBridge.ts        # postMessage 桥接（核心通信层）
├── hooks/
│   ├── useDAppList.ts
│   └── useApproval.ts
├── types/
│   ├── dapp.ts                # DAppInfo, DAppCategory, DAppListResponse
│   ├── messages.ts            # postMessage 消息类型
│   └── approval.ts            # 审批请求类型
└── constants/
    └── rpcMethods.ts          # READ_ONLY_METHODS, APPROVAL_METHODS, RPC_ERRORS
```

DApps 标签页集成在 `src/components/MultiTabs.tsx` 中。

### 服务端（Next.js API Routes）

```
src/server/
├── db.ts                      # Neon Postgres 数据库层 (initDB, CRUD)
├── proxy.ts                   # HTML 代理注入 + URL 重写逻辑
└── admin-auth.ts              # Admin API X-Admin-Token 鉴权

app/api/
├── v1/
│   ├── dapps/route.ts         # GET /api/v1/dapps — DApp 列表
│   ├── proxy/route.ts         # GET /api/v1/proxy?url= — 代理注入
│   └── proxy-asset/route.ts   # GET /api/v1/proxy-asset?url= — 子资源代理
├── admin/
│   ├── dapps/route.ts         # GET/POST DApps
│   ├── dapps/[id]/route.ts    # GET/PUT/DELETE 单个 DApp
│   ├── categories/route.ts    # GET/POST 分类
│   └── categories/[id]/route.ts # DELETE 分类
└── health/route.ts
```

### DApp SDK 与文档

```
public/dappsdk.js              # SDK 脚本（Vercel CDN 静态服务）
skills/dapps/dappsdk.js        # SDK 源文件
skills/dapps/dappdocs.md       # DApp 开发者集成文档
skills/dapps/framework.md      # 完整框架设计文档
```

### 数据库脚本

```
scripts/db.js                  # 独立 DB 模块（供 seed.js 使用，不依赖 Next.js）
scripts/seed.js                # 建表 + 种子数据 (npm run db:seed)
```

## API 接口

### 公开

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/dapps` | DApp 列表（仅 active） |
| GET | `/api/v1/proxy?url=<url>` | 代理 DApp HTML + 注入 Provider |
| GET | `/api/v1/proxy-asset?url=<url>` | 代理子资源（JS/CSS/图片） |
| GET | `/dappsdk.js` | DApp SDK 脚本（静态文件） |
| GET | `/api/health` | 健康检查 |

### Admin（需要 Header `X-Admin-Token`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/admin/dapps` | DApp 列表/创建 |
| GET/PUT/DELETE | `/api/admin/dapps/:id` | 单个 DApp CRUD |
| GET/POST | `/api/admin/categories` | 分类列表/创建 |
| DELETE | `/api/admin/categories/:id` | 删除分类 |

## DApp 列表 API 数据结构

```typescript
// GET /api/v1/dapps 响应
interface DAppListResponse {
  dapps: DAppInfo[]
  categories: DAppCategory[]
  updated_at: string
}

interface DAppInfo {
  id: string                    // "uniswap"
  name: string
  description: string
  url: string                   // DApp 入口 URL
  icon: string                  // 图标 URL
  chains: number[]              // 支持的 chainId 列表 [1, 10, 137]
  category: string              // 分类 ID
  featured: boolean
  inject_mode: 'proxy' | 'sdk'  // Provider 注入方式
  status: 'active' | 'maintenance' | 'deprecated'
}
```

## 代理注入工作原理

`src/server/proxy.ts` 是代理注入的核心：

1. **`GET /api/v1/proxy?url=<dapp_url>`**：
   - 服务端 fetch 目标 DApp HTML
   - 用 `node-html-parser` 解析 DOM
   - 在 `<head>` 最顶部注入 `dappsdk.js` 的 `<script>` 标签
   - 重写所有子资源 URL（src/href）为 `/api/v1/proxy-asset?url=<absolute_url>`
   - 重写 `<a>` 链接为 `/api/v1/proxy?url=<absolute_url>`（导航也走代理）
   - 重写 CSS 中 `url()` 引用
   - 返回修改后的 HTML

2. **`GET /api/v1/proxy-asset?url=<asset_url>`**：
   - 代理获取子资源（JS/CSS/图片/字体）
   - CSS 文件额外处理：重写其中 `url()` 引用也走代理
   - 非 CSS 资源原样透传
   - 设置 `Access-Control-Allow-Origin: *`

所有资源通过代理服务器加载，解决跨域 CORS 问题。

## URL 重写规则

`resolveUrl()` 将各种格式的 URL 转为绝对 URL：

| 原始格式 | 转换结果 |
|----------|----------|
| `//cdn.example.com/x.js` | `https://cdn.example.com/x.js` |
| `https://cdn.example.com/x.js` | 保持不变 |
| `/path/to/resource` | `{targetOrigin}/path/to/resource` |
| `relative/path` | `{targetOrigin}/relative/path` |
| `data:`, `#`, `javascript:` 等 | 跳过不处理 |

`toProxyUrl()` 将绝对 URL 包装为代理 URL：
- 子资源 → `/api/v1/proxy-asset?url={encoded}`
- 导航链接 → `/api/v1/proxy?url={encoded}`

## postMessage 消息协议

DApp iframe ↔ Wallet Parent 通信格式：

```typescript
// DApp → Wallet: 握手
{ type: 'ring_wallet_handshake', version: '1.0.0' }

// DApp → Wallet: RPC 请求
{ type: 'ring_wallet_request', id: number, method: string, params: unknown[] }

// Wallet → DApp: RPC 响应
{ type: 'ring_wallet_response', id: number, result?: unknown, error?: { code, message } }

// Wallet → DApp: 事件推送
{ type: 'ring_wallet_event', event: 'chainChanged'|'accountsChanged'|'connect'|'disconnect', data: unknown }

// Wallet → DApp: 握手确认
{ type: 'ring_wallet_handshake_ack', chainId: string, accounts: string[] }
```

## RPC 方法分类

**本地处理**：`eth_accounts`, `eth_chainId`, `net_version`

**只读转发 RPC**：`eth_call`, `eth_getBalance`, `eth_estimateGas`, `eth_getBlockByNumber`, `eth_getTransactionReceipt`, `eth_getTransactionCount`, `eth_getCode`, `eth_getLogs`, `eth_gasPrice`, `eth_blockNumber`, 等

**需要用户审批**：`eth_requestAccounts`（连接）, `eth_sendTransaction`（交易）, `personal_sign`（签名）, `eth_signTypedData_v4`（EIP-712 签名）, `wallet_switchEthereumChain`（切链）

## EIP-1193 错误码

| Code | 含义 |
|------|------|
| 4001 | 用户拒绝 |
| 4100 | 未授权 |
| 4200 | 不支持的方法 / 超时 |
| 4900 | 已断开连接 |
| 4902 | 链未添加 |

## 数据库

Neon Serverless Postgres (`@neondatabase/serverless`)，环境变量 `DATABASE_URL`。

两张表：
- `categories` (id TEXT PK, name, icon, sort_order)
- `dapps` (id TEXT PK, name, description, url, icon, chains JSONB, category FK, featured, inject_mode, status, sort_order, created_at, updated_at)

Schema 在 `src/server/db.ts` 的 `initDB()` 中自动创建。种子数据用 `npm run db:seed`。

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon Postgres 连接字符串（必须） |
| `ADMIN_TOKEN` | Admin API 鉴权 token |
| `DAPP_WHITELIST` | 代理白名单域名，逗号分隔（空=允许所有） |

## 修改注意事项

- 修改 SDK 脚本时，同时更新 `skills/dapps/dappsdk.js` 和 `public/dappsdk.js`
- 代理的 URL 路径都带 `/api/` 前缀（Next.js API Routes 约定）
- `dappService.ts` 的 API 调用使用相对路径 `/api/v1/dapps`（前端和 API 同域）
- DB schema 变更需同步修改 `src/server/db.ts` 和 `scripts/db.js`
- 前端 DApp 功能入口在 `MultiTabs.tsx` 的 "DApps" tab
