# Fix 3: DApp API 调用被 CORS 拦截

## 问题

DApp (Uniswap) 运行时 JS 向自家后端发起 `fetch()` 请求，CORS 被拒：

```
Access to fetch at 'https://entry-gateway.backend-prod.api.uniswap.org/...'
from origin 'https://proxy.vercel.app' has been blocked by CORS policy
```

## 原因

之前只代理了 HTML/CSS/JS **静态资源**的 URL 重写，没有拦截 DApp 运行时的 `fetch()` / `XMLHttpRequest` 调用。

DApp 的 JS 代码直接向其后端 API 发请求（如 `entry-gateway.backend-prod.api.uniswap.org`），浏览器的 `Origin` 头是我们代理域名，DApp 后端不识别此 origin，CORS preflight 被拒。

这是代理方案必须解决的根本问题：**不仅要代理页面资源，还要代理所有运行时网络请求**。

## 修复

### 1. SDK 中拦截 fetch/XHR (`public/dappsdk.js`)

在 SDK 初始化时检测代理上下文（从 URL 提取原始 DApp origin），然后 monkey-patch `fetch` 和 `XMLHttpRequest.prototype.open`：

```javascript
// 检测代理上下文
var _m = window.location.href.match(/\/api\/v1\/proxy\?url=([^&]+)/)
if (_m) {
  _dappOrigin = new URL(decodeURIComponent(_m[1])).origin
  _proxyBase = window.location.origin
}

// 将所有非代理域名的请求通过 proxy-asset 中转
function _proxyUrl(url) {
  var abs = _toAbsolute(url)
  if (!_shouldProxy(abs)) return url  // 已经指向代理的不处理
  return _proxyBase + '/api/v1/proxy-asset?url=' + encodeURIComponent(abs)
}

// Override fetch
var _origFetch = window.fetch
window.fetch = function(input, init) {
  // rewrite URL → proxy-asset
  return _origFetch.call(window, rewrittenInput, init)
}

// Override XHR.open
var _origOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function(method, url) {
  arguments[1] = _proxyUrl(String(url))
  return _origOpen.apply(this, arguments)
}
```

关键规则：
- 相对路径 `/api/xxx` → 解析为 `{dappOrigin}/api/xxx` → 包装为 proxy-asset URL
- 跨域绝对 URL `https://other.api.com/xxx` → 包装为 proxy-asset URL
- 已经是代理域名的 URL → 不处理（避免双重代理）
- `data:`/`blob:` 等特殊 URL → 不处理

### 2. proxy-asset 支持所有 HTTP 方法 (`app/api/v1/proxy-asset/route.ts`)

从只处理 GET 升级为全方法反向代理：

- 导出 `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS` 处理器
- `OPTIONS` 直接返回 CORS 预检响应
- 其他方法：转发请求体、筛选转发请求头（剥离 `Origin`/`Cookie` 等）、剥离响应中的 CSP/CORS 头后添加宽松的 CORS 头
- CSS 文件仍做 `url()` 重写

请求头处理：
- **不转发**：`host`, `origin`, `referer`, `cookie`（会暴露代理身份）
- **设置 Referer** 为目标域名 origin（部分 API 校验 Referer）
- 其他头原样转发（包括 `Content-Type`, `Authorization` 等）

响应头处理：
- **剥离**：`content-security-policy`, `x-frame-options`, `access-control-*`（避免冲突）
- **添加**：宽松 CORS 头 (`Access-Control-Allow-Origin: *`)
- 其他头原样返回

## 经验教训

- 代理方案要完整工作，必须代理 **所有网络流量**（HTML/CSS/JS + API 调用），只代理静态资源不够
- `fetch` 和 `XMLHttpRequest` 是 DApp 运行时 HTTP 请求的两个入口，都需要拦截
- 服务端代理转发没有 CORS 限制（server-to-server），所以把客户端跨域请求改为同域请求后由服务端中转是通用解法
- `<base href>` 方案不可用（见 fix2.md），monkey-patch fetch/XHR 是更精准的拦截方式

## 涉及文件

- `public/dappsdk.js` — 新增 fetch/XHR 拦截逻辑
- `skills/dapps/dappsdk.js` — 同步更新
- `app/api/v1/proxy-asset/route.ts` — 全面重写，支持全 HTTP 方法反向代理
