# Fix 1: CSP 阻止内联脚本注入

## 问题

部署后打开 Uniswap 等 DApp 报错：

```
Uncaught SyntaxError: Invalid or unexpected token (at proxy?url=https%3A%2F%2Fapp.uniswap.org:5:1)
```

同时控制台显示 CSP 策略违规，Uniswap 的 CSP `script-src` 仅允许 `'self'`，不允许 `'unsafe-inline'`。

## 原因

`proxy.ts` 用 `readFileSync` 读取 `dappsdk.js` 整个内容，然后以内联 `<script>...code...</script>` 方式注入到 HTML 的 `<head>` 中。浏览器根据原站 CSP 策略拒绝执行内联脚本。

此外，代理响应没有剥离原站的 CSP 头和 HTML 中的 `<meta http-equiv="Content-Security-Policy">` 标签。

## 修复

### 1. SDK 注入方式改为外部引用

```typescript
// before
const providerTag = `<script>\n${script}\n</script>\n`

// after
const providerTag = `<script src="${proxyBase}/dappsdk.js"></script>\n`
```

`public/dappsdk.js` 由 Next.js 静态服务，浏览器将其视为同源外部脚本，不受 `unsafe-inline` 限制。

### 2. 剥离原站 CSP

`proxy.ts` 新增 `stripCspMeta()` 移除 HTML 中的 CSP meta 标签：

```typescript
function stripCspMeta(root) {
  for (const meta of root.querySelectorAll('meta')) {
    const equiv = meta.getAttribute('http-equiv')
    if (equiv && /^content-security-policy/i.test(equiv)) {
      meta.remove()
    }
  }
}
```

`app/api/v1/proxy/route.ts` 的响应只返回自定义 headers，不透传原站的 CSP 响应头。

### 3. 允许 iframe 嵌入

代理响应增加 `X-Frame-Options: ALLOWALL`。

## 涉及文件

- `src/server/proxy.ts` — 移除 `fs.readFileSync`，改外部引用，新增 `stripCspMeta()`
- `app/api/v1/proxy/route.ts` — 不透传原站 CSP 头，加 `X-Frame-Options`
