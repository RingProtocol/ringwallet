# Ring Wallet Proxy Server

DApp 代理服务器，提供两个核心功能：

1. **DApp 列表 API** — 为钱包前端提供 DApp 目录
2. **HTML 代理注入** — 代理加载 DApp 页面，自动在 `<head>` 注入 EIP-1193/EIP-6963 Provider 脚本，使任意 DApp 无需修改代码即可与 Ring Wallet 通信

## 快速开始

```bash
cd server
npm install
npm run dev
```

服务器默认运行在 `http://localhost:3001`。

## API 接口

### GET /v1/dapps

返回 DApp 列表（当前为 mock 数据，生产环境替换为数据库）。

```bash
curl http://localhost:3001/v1/dapps
```

### GET /v1/proxy?url=\<dapp-url\>

代理加载指定 DApp 页面并注入 Provider 脚本。

```bash
# 示例：代理加载 example.com
curl http://localhost:3001/v1/proxy?url=https://example.com
```

**工作原理：**
1. 服务器向 `url` 发起请求获取 HTML
2. 解析 HTML，在 `<head>` 最顶部注入 `dappsdk.js` 脚本
3. 将页面中相对路径的资源引用（src、href）重写为绝对路径
4. 返回修改后的 HTML

### GET /v1/proxy-asset?url=\<asset-url\>

代理加载 DApp 的子资源（CSS、JS、图片等）。

### GET /static/dappsdk.js

返回 DApp SDK 脚本文件（供 DApp 直接引入）。

### GET /health

健康检查。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务器端口 |
| `DAPP_WHITELIST` | 空（允许所有） | 允许代理的域名列表，逗号分隔，例如 `app.uniswap.org,aave.com` |

## 部署

### 方式 1：直接运行

```bash
cd server
npm install
PORT=3001 node index.js
```

### 方式 2：使用 PM2

```bash
npm install -g pm2
cd server
npm install
pm2 start index.js --name ring-proxy
pm2 save
```

### 方式 3：Docker

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/index.js ./
COPY skills/dapps/dappsdk.js ./skills/dapps/dappsdk.js
RUN npm install --production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "index.js"]
```

```bash
docker build -t ring-proxy .
docker run -d -p 3001:3001 --name ring-proxy ring-proxy
```

### 方式 4：Nginx 反向代理

将 Node 服务配合 Nginx 使用：

```nginx
server {
    listen 80;
    server_name api.walletapp.testring.org;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 生产环境注意事项

1. **DApp 列表**：当前 `/v1/dapps` 返回 mock 数据，生产环境需要接入数据库
2. **白名单**：生产环境务必设置 `DAPP_WHITELIST`，限制可代理的 DApp 域名
3. **HTTPS**：生产环境必须使用 HTTPS（通过 Nginx / CloudFlare 等）
4. **CORS**：当前允许所有来源，生产环境建议限制为钱包前端的域名
5. **缓存**：可在 Nginx 层面对 `/static/dappsdk.js` 和静态资源添加缓存
6. **速率限制**：建议添加请求频率限制防止滥用

## 测试代理注入

启动服务器后，在浏览器访问：

```
http://localhost:3001/v1/proxy?url=https://example.com
```

打开开发者工具的 Console，应能看到：

```
[Ring Wallet] DApp SDK v1.0.0 initialized (iframe mode)
```

检查 `window.ethereum` 和 `window.ringWallet` 是否存在。
