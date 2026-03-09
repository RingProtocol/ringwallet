# Ring Wallet Proxy Server

DApp 代理服务器，部署到 Vercel，使用 Neon Serverless Postgres 存储数据。

**核心功能：**

1. **DApp 列表 API** (`/v1/dapps`) — 从数据库读取 DApp 目录
2. **HTML 代理注入** (`/v1/proxy`) — 代理加载 DApp 页面，自动注入 EIP-1193/EIP-6963 Provider
3. **Admin API** (`/admin/*`) — DApp 和分类的增删改查

---

## 部署到 Vercel

### 第一步：创建 Neon 数据库

1. 访问 [console.neon.tech](https://console.neon.tech) 注册 / 登录
2. 创建一个新 Project（Free 计划即可）
3. 复制 Connection String，格式如：
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### 第二步：部署到 Vercel

```bash
cd server

# 安装 Vercel CLI（如果未安装）
npm i -g vercel

# 登录
vercel login

# 部署（首次会创建项目）
vercel
```

部署过程中 Vercel CLI 会询问项目设置，直接回车使用默认值即可。

### 第三步：配置环境变量

在 Vercel Dashboard → 你的项目 → Settings → Environment Variables 中添加：

| 变量 | 值 | 说明 |
|------|---|------|
| `DATABASE_URL` | `postgresql://...` | Neon 连接字符串（**必须**） |
| `ADMIN_TOKEN` | `your-secret-token` | Admin API 鉴权 token（推荐设置） |
| `DAPP_WHITELIST` | 空或域名列表 | 代理白名单，逗号分隔 |

设置后重新部署：

```bash
vercel --prod
```

### 第四步：初始化数据库 + 种子数据

```bash
# 本地运行 seed 脚本（会自动建表 + 插入初始数据）
DATABASE_URL="postgresql://neondb_owner:npg_QU4MFy7tOejE@ep-lucky-forest-afzb0038-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" node seed.js
```

输出：
```
Initializing database schema...
Schema ready.
Seeding categories...
  + defi
  + nft
  + game
  + social
  + tool
  + bridge
Seeding DApps...
  + uniswap
  + aave
  + opensea
Done!
```

---

## 本地开发

```bash
cd server
npm install

# 创建 .env（参考 .env.example）
cp .env.example .env
# 编辑 .env，填入你的 DATABASE_URL

# 初始化数据库
npm run seed

# 启动开发服务器
npm run dev
```

---

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/dapps` | 获取 DApp 列表（仅 active 状态） |
| GET | `/v1/proxy?url=<url>` | 代理加载 DApp 并注入 Provider |
| GET | `/v1/proxy-asset?url=<url>` | 代理加载子资源（CSS/JS/图片） |
| GET | `/static/dappsdk.js` | 获取 DApp SDK 脚本 |
| GET | `/health` | 健康检查 |

### Admin 接口

需要 Header: `X-Admin-Token: <ADMIN_TOKEN>`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/dapps` | 列出所有 DApp（含非 active） |
| GET | `/admin/dapps/:id` | 获取单个 DApp |
| POST | `/admin/dapps` | 创建 DApp |
| PUT | `/admin/dapps/:id` | 更新 DApp |
| DELETE | `/admin/dapps/:id` | 删除 DApp |
| GET | `/admin/categories` | 列出所有分类 |
| POST | `/admin/categories` | 创建/更新分类 |
| DELETE | `/admin/categories/:id` | 删除分类 |

### Admin API 示例

```bash
# 添加一个 DApp
curl -X POST https://your-project.vercel.app/admin/dapps \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-secret-token" \
  -d '{
    "id": "pancakeswap",
    "name": "PancakeSwap",
    "description": "DEX on BNB Chain",
    "url": "https://pancakeswap.finance",
    "icon": "https://pancakeswap.finance/favicon.ico",
    "chains": [56, 1, 42161],
    "category": "defi",
    "featured": false,
    "inject_mode": "proxy",
    "status": "active"
  }'

# 更新 DApp
curl -X PUT https://your-project.vercel.app/admin/dapps/pancakeswap \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-secret-token" \
  -d '{ "featured": true }'

# 删除 DApp
curl -X DELETE https://your-project.vercel.app/admin/dapps/pancakeswap \
  -H "X-Admin-Token: your-secret-token"
```

---

## 数据库结构

### categories 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 分类 ID（如 `defi`） |
| name | TEXT | 显示名称 |
| icon | TEXT | 图标 URL |
| sort_order | INTEGER | 排序 |
| created_at | TIMESTAMPTZ | 创建时间 |

### dapps 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | DApp ID（如 `uniswap`） |
| name | TEXT | 名称 |
| description | TEXT | 描述 |
| url | TEXT | 入口 URL |
| icon | TEXT | 图标 URL |
| chains | JSONB | 支持的 chainId 数组 |
| category | TEXT FK | 关联分类 |
| featured | BOOLEAN | 是否推荐 |
| inject_mode | TEXT | `proxy` 或 `sdk` |
| status | TEXT | `active` / `maintenance` / `deprecated` |
| sort_order | INTEGER | 排序 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

---

## 项目结构

```
server/
├── api/
│   └── index.js          # Vercel serverless entry point
├── index.js              # Express app (所有路由)
├── db.js                 # Neon Postgres 数据库层
├── seed.js               # 数据库初始化 + 种子数据
├── provider-script.js    # SDK 脚本加载器
├── dappsdk.js            # DApp SDK 脚本副本
├── vercel.json           # Vercel 部署配置
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 技术选型

| 组件 | 选择 | 原因 |
|------|------|------|
| **运行时** | Vercel Serverless | 免运维、自动扩缩、全球 CDN |
| **数据库** | Neon (Serverless Postgres) | Vercel 官方推荐、Serverless 原生、免费额度充足 |
| **框架** | Express.js | 兼容本地开发 + Vercel 部署 |
| **DB 驱动** | `@neondatabase/serverless` | HTTP-based，无 TCP 连接，适合 serverless 冷启动 |
