import { parse } from 'node-html-parser'
import { dappsdkScriptTag } from './dappsdk'

// Third-party domains whose scripts must load directly (self-validating, anti-tamper, etc.)
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

function shouldDirectLoad(absoluteUrl: string): boolean {
  try { return DIRECT_LOAD_DOMAINS.has(new URL(absoluteUrl).hostname) } catch { return false }
}

// ─── URL resolution ───

function resolveUrl(rawUrl: string, targetOrigin: string): string | null {
  const t = rawUrl?.trim()
  if (!t || /^(data:|#|javascript:|mailto:|blob:|about:|\{|\$|\{\{)/.test(t)) return null
  if (t.startsWith('//'))              return 'https:' + t
  if (/^https?:\/\//i.test(t))         return t
  if (t.startsWith('/'))                return targetOrigin + t
  return targetOrigin + '/' + t
}

function toProxyUrl(absoluteUrl: string, proxyBase: string, isNav: boolean): string {
  if (shouldDirectLoad(absoluteUrl)) return absoluteUrl
  const ep = isNav ? '/api/v1/proxy' : '/api/v1/proxy-asset'
  return `${proxyBase}${ep}?url=${encodeURIComponent(absoluteUrl)}`
}

// ─── HTML injection ───

const RESOURCE_ATTRS: Record<string, string[]> = {
  script: ['src'],
  link: ['href'],
  img: ['src', 'srcset'],
  source: ['src', 'srcset'],
  video: ['src', 'poster', 'track'],
  audio: ['src', 'track'],
  embed: ['src'],
  object: ['data'],
  input: ['src'],
  iframe: ['src'],
  frame: ['src'],
}

function rewriteElementUrls(root: ReturnType<typeof parse>, targetOrigin: string, proxyBase: string) {
  for (const [tag, attrs] of Object.entries(RESOURCE_ATTRS)) {
    for (const el of root.querySelectorAll(tag)) {
      for (const attr of attrs) {
        const val = el.getAttribute(attr)
        if (!val) continue
        if (attr === 'srcset') {
          el.setAttribute(attr, rewriteSrcset(val, targetOrigin, proxyBase))
        } else {
          const abs = resolveUrl(val, targetOrigin)
          if (abs) el.setAttribute(attr, toProxyUrl(abs, proxyBase, false))
        }
      }
    }
  }
  for (const a of root.querySelectorAll('a')) {
    const href = a.getAttribute('href')
    if (!href) continue
    const abs = resolveUrl(href, targetOrigin)
    if (abs) a.setAttribute('href', toProxyUrl(abs, proxyBase, true))
  }
  for (const f of root.querySelectorAll('form')) {
    const action = f.getAttribute('action')
    if (!action) continue
    const abs = resolveUrl(action, targetOrigin)
    if (abs) f.setAttribute('action', toProxyUrl(abs, proxyBase, true))
  }
}

function rewriteSrcset(srcset: string, targetOrigin: string, proxyBase: string): string {
  return srcset.split(',').map(entry => {
    const parts = entry.trim().split(/\s+/)
    if (!parts.length) return entry
    const abs = resolveUrl(parts[0], targetOrigin)
    if (abs) parts[0] = toProxyUrl(abs, proxyBase, false)
    return parts.join(' ')
  }).join(', ')
}

function rewriteInlineCssUrls(html: string, targetOrigin: string, proxyBase: string): string {
  return html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, q, raw) => {
    const abs = resolveUrl(raw, targetOrigin)
    if (!abs) return match
    return `url(${q}${toProxyUrl(abs, proxyBase, false)}${q})`
  })
}

function rewriteUrlsRegex(html: string, targetOrigin: string, proxyBase: string): string {
  return html
    .replace(/(src|href|action)=(["'])\/\/([^"']+)/g, (_, attr, q, rest) => {
      const abs = 'https://' + rest
      return `${attr}=${q}${toProxyUrl(abs, proxyBase, attr === 'href')}`
    })
    .replace(/(src|href|action)=(["'])\//g, (_, attr, q) =>
      `${attr}=${q}${proxyBase}/api/v1/proxy-asset?url=${encodeURIComponent(targetOrigin + '/')}`)
    .replace(/(src|href|action)=(["'])(https?:\/\/[^"']+)/g, (_, attr, q, url) => {
      return `${attr}=${q}${toProxyUrl(url, proxyBase, attr === 'href')}`
    })
}

/**
 * @param root Inject csp is not necessary, as it is stripped.
 */
function stripCspMeta(root: ReturnType<typeof parse>) {
  for (const meta of root.querySelectorAll('meta')) {
    const equiv = meta.getAttribute('http-equiv')
    if (equiv && /^content-security-policy/i.test(equiv)) {
      meta.remove()
    }
  }
}

export function injectProvider(html: string, targetOrigin: string, proxyBase: string): string {
  const providerTag = dappsdkScriptTag(proxyBase)

  try {
    const root = parse(html, { comment: true })
    stripCspMeta(root)
    rewriteElementUrls(root, targetOrigin, proxyBase)
    const head = root.querySelector('head')
    if (head) {
      head.innerHTML = providerTag + head.innerHTML
    } else {
      return providerTag + rewriteInlineCssUrls(root.toString(), targetOrigin, proxyBase)
    }
    return rewriteInlineCssUrls(root.toString(), targetOrigin, proxyBase)
  } catch {
    const rewritten = rewriteUrlsRegex(html, targetOrigin, proxyBase)
    const stripped = rewritten.replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, '')
    if (stripped.includes('<head>'))  return stripped.replace('<head>', '<head>' + providerTag)
    if (stripped.includes('<HEAD>'))  return stripped.replace('<HEAD>', '<HEAD>' + providerTag)
    return providerTag + stripped
  }
}

export function rewriteCssUrls(css: string, assetUrl: string, proxyBase: string): string {
  const assetOrigin = new URL(assetUrl).origin
  const assetDir = assetUrl.substring(0, assetUrl.lastIndexOf('/'))

  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, quote, rawUrl) => {
    const trimmed = rawUrl.trim()
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') ||
        trimmed.startsWith('#') || trimmed.startsWith('about:')) return match

    let absolute: string
    if (trimmed.startsWith('//'))             absolute = 'https:' + trimmed
    else if (/^https?:\/\//i.test(trimmed))   absolute = trimmed
    else if (trimmed.startsWith('/'))           absolute = assetOrigin + trimmed
    else                                        absolute = assetDir + '/' + trimmed

    return `url(${quote}${proxyBase}/api/v1/proxy-asset?url=${encodeURIComponent(absolute)}${quote})`
  })
}
