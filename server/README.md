# Server 模块说明

> **注意：** server 的 API 接口已整合到主项目的 Next.js API Routes 中（`app/api/`），
> 部署到 Vercel 后前端和 API 共享同一个域名，无需跨域。
>
> 此目录仅保留 **seed 脚本**和独立运行的 **db.js**（用于脚本操作数据库）。

## 接口现在在主项目中

部署后所有接口路径如下（与前端同域名）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/dapps` | 获取 DApp 列表（仅 active 状态） |
| GET | `/api/v1/proxy?url=<url>` | 代理加载 DApp 并注入 Provider |
| GET | `/api/v1/proxy-asset?url=<url>` | 代理加载子资源 |
| GET | `/dappsdk.js` | DApp SDK 脚本（public 静态文件） |
| GET | `/api/health` | 健康检查 |
| GET/POST | `/api/admin/dapps` | Admin: DApp 列表/创建 |
| GET/PUT/DELETE | `/api/admin/dapps/:id` | Admin: DApp 详情/更新/删除 |
| GET/POST | `/api/admin/categories` | Admin: 分类列表/创建 |
| DELETE | `/api/admin/categories/:id` | Admin: 删除分类 |

## 数据库初始化

```bash
# 设置 DATABASE_URL（Neon Postgres 连接字符串）
export DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# 运行 seed（建表 + 插入初始数据）
npm run db:seed
# 或
node server/seed.js
```

## 文件说明

| 文件 | 用途 |
|------|------|
| `db.js` | 独立的数据库模块（供 seed.js 使用，不依赖 Next.js） |
| `seed.js` | 数据库初始化 + 种子数据脚本 |
| `package.json` | seed 脚本的依赖（`@neondatabase/serverless`） |

## 主项目中的对应文件

| 文件 | 用途 |
|------|------|
| `src/server/db.ts` | 数据库层（TypeScript，供 API Routes 使用） |
| `src/server/proxy.ts` | 代理注入逻辑 |
| `src/server/admin-auth.ts` | Admin 鉴权 |
| `app/api/v1/dapps/route.ts` | DApp 列表 API |
| `app/api/v1/proxy/route.ts` | 代理注入 API |
| `app/api/v1/proxy-asset/route.ts` | 资源代理 API |
| `app/api/admin/*/route.ts` | Admin CRUD API |
| `public/dappsdk.js` | DApp SDK 脚本（静态文件） |
