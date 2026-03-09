部署步骤
在 Vercel Dashboard 配置环境变量：DATABASE_URL、ADMIN_TOKEN
DATABASE_URL="..." npm run db:seed — 初始化数据库
vercel --prod — 部署
前端和 API 共享同一个域名，完成
server/ 目录保留了 seed.js 和独立的 db.js（不依赖 Next.js），方便用脚本操作数据库。