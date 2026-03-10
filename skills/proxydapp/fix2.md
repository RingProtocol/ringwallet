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

### 1. 第三方脚本直接加载白名单（已生效）

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
  ...
}
```

### 2. `<base href>` 方案（已回退 ❌）

曾尝试在 `<head>` 注入 `<base href="{targetOrigin}/">`，让 JS 动态生成的相对路径解析到原始域名。

**回退原因**：`<base href>` 影响范围过大，也会改变 JS `import()` 动态模块加载的路径解析。导致：

```
Access to script at 'https://app.uniswap.org/assets/service_connect-DN_dqJnm.js'
from origin 'https://proxy.vercel.app' has been blocked by CORS policy
```

动态 `import('/assets/xxx.js')` 被解析到原始域名，跨域加载脚本触发 CORS 拦截。图片跨域加载不受 CORS 限制，但脚本受限。

### 3. 图片 404 的现状

[3][4] 的图片 404 属于代理方案的固有局限 — JS 代码内部硬编码的相对路径无法通过 HTML 重写覆盖。这些是装饰性资源（背景纹理、logo），不影响 DApp 核心功能。

## 经验教训

- **不要使用 `<base href>`**：它会影响所有 URL 解析，包括 `import()`、`fetch()`、`new URL()`、`<a href>` 等，副作用不可控
- 第三方脚本（Turnstile、Datadog、Sentry 等）有自校验机制，必须直接从原始域名加载
- JS 内部动态生成的相对路径 404 是代理方案的已知局限，功能无影响

## 涉及文件

- `src/server/proxy.ts` — 新增 `DIRECT_LOAD_DOMAINS`、`shouldDirectLoad()`
