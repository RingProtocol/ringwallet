# Fix 2: 第三方脚本校验失败 + JS 动态资源路径 404

## 问题

打开 Uniswap DApp 后控制台出现多个错误：

```
[1] Uncaught TurnstileError: Could not find Turnstile valid script tag
[2] Datadog Browser SDK: SDK is loaded more than once
[3] GET .../images/noise-color.png 404
[4] GET .../assets/uniswap-logo-Do-eRXOS.png 404
```

## 原因

### [1] Turnstile 校验失败

Cloudflare Turnstile 脚本会回查 DOM 中自己的 `<script>` 标签，验证 `src` 是否指向 `challenges.cloudflare.com`。代理将其 src 改写为 `/api/v1/proxy-asset?url=https://challenges.cloudflare.com/...`，导致校验失败。

### [2] Datadog 双加载

类似原因，Datadog SDK 用 URL 去重检测是否已加载。代理改写 URL 后去重失败，同一个 SDK 被加载两次。

### [3][4] JS 动态资源 404

Uniswap 的打包后 JS 代码中用相对路径引用静态资源（如 `"/images/noise-color.png"`、`"/assets/uniswap-logo.png"`），这些路径不在 HTML 标签属性中，无法被 `proxy.ts` 的 URL 重写捕获。浏览器按当前页面 origin（代理域名）发起请求，导致 404。

## 修复

### 1. 第三方脚本直接加载白名单

`proxy.ts` 新增 `DIRECT_LOAD_DOMAINS` 集合，`toProxyUrl()` 对白名单域名返回原始绝对 URL 而不包装为 proxy-asset：

```typescript
const DIRECT_LOAD_DOMAINS = new Set([
  'challenges.cloudflare.com',
  'browser-intake-datadoghq.com',
  'www.datadoghq-browser-agent.com',
  'static.cloudflareinsights.com',
  'www.google-analytics.com',
  'www.googletagmanager.com',
  'cdn.segment.com',
  'js.sentry-cdn.com',
  'cdn.amplitude.com',
])

function toProxyUrl(absoluteUrl, proxyBase, isNav) {
  if (shouldDirectLoad(absoluteUrl)) return absoluteUrl  // 直接返回原始 URL
  const ep = isNav ? '/api/v1/proxy' : '/api/v1/proxy-asset'
  return `${proxyBase}${ep}?url=${encodeURIComponent(absoluteUrl)}`
}
```

### 2. `<base href>` 修复 JS 动态路径

在 `<head>` 顶部注入 `<base href="{targetOrigin}/">` 标签。效果：

- JS 代码动态创建的 `img.src = '/images/noise-color.png'` 解析为 `https://app.uniswap.org/images/noise-color.png`（图片加载无 CORS 限制）
- 已被 proxy.ts 重写的 HTML 资源 URL 都是绝对路径，不受 `<base>` 影响
- 移除 DApp 原有的 `<base>` 标签避免冲突

```typescript
const baseTag = `<base href="${targetOrigin}/">\n`
// 移除已有 base 标签
const existingBase = root.querySelector('base')
if (existingBase) existingBase.remove()
// 注入到 head 顶部
head.innerHTML = providerTag + baseTag + head.innerHTML
```

## 注意事项

- `<base href>` 也会影响 `fetch()` 的相对路径解析 — DApp 的 `fetch('/api/xxx')` 会解析到原始域名，这通常是正确行为
- 如果遇到新的第三方脚本校验失败，往 `DIRECT_LOAD_DOMAINS` 添加对应域名即可
- CSS 中的 `url()` 引用已在 `rewriteCssUrls()` 中处理，不受此影响

## 涉及文件

- `src/server/proxy.ts` — 新增 `DIRECT_LOAD_DOMAINS`、`shouldDirectLoad()`、`<base href>` 注入
