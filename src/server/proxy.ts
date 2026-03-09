import { parse } from 'node-html-parser'
import { readFileSync } from 'fs'
import { join } from 'path'

let _providerScript: string | null = null

export function getProviderScript(): string {
  if (!_providerScript) {
    try {
      _providerScript = readFileSync(join(process.cwd(), 'public', 'dappsdk.js'), 'utf-8')
    } catch {
      _providerScript = '// Ring Wallet DApp SDK - file not found'
      console.warn('[proxy] Could not load public/dappsdk.js')
    }
  }
  return _providerScript
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
  const ep = isNav ? '/api/v1/proxy' : '/api/v1/proxy-asset'
  return `${proxyBase}${ep}?url=${encodeURIComponent(absoluteUrl)}`
}

// ─── HTML injection ───

const RESOURCE_ATTRS: Record<string, string[]> = {
  script: ['src'], link: ['href'], img: ['src', 'srcset'],
  source: ['src', 'srcset'], video: ['src', 'poster'], audio: ['src'],
  embed: ['src'], object: ['data'], input: ['src'], iframe: ['src'],
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
    .replace(/(src|href|action)=(["'])\/\/([^"']+)/g, (_, attr, q, rest) =>
      `${attr}=${q}${toProxyUrl('https://' + rest, proxyBase, attr === 'href')}`)
    .replace(/(src|href|action)=(["'])\//g, (_, attr, q) =>
      `${attr}=${q}${proxyBase}/api/v1/proxy-asset?url=${encodeURIComponent(targetOrigin + '/')}`)
    .replace(/(src|href|action)=(["'])(https?:\/\/[^"']+)/g, (_, attr, q, url) => {
      const ep = attr === 'href' ? '/api/v1/proxy' : '/api/v1/proxy-asset'
      return `${attr}=${q}${proxyBase}${ep}?url=${encodeURIComponent(url)}`
    })
}

export function injectProvider(html: string, targetOrigin: string, proxyBase: string): string {
  const script = getProviderScript()
  const providerTag = `<script>\n// ── Ring Wallet Provider (injected) ──\n${script}\n</script>\n`

  try {
    const root = parse(html, { comment: true })
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
    if (rewritten.includes('<head>'))  return rewritten.replace('<head>', '<head>' + providerTag)
    if (rewritten.includes('<HEAD>'))  return rewritten.replace('<HEAD>', '<HEAD>' + providerTag)
    return providerTag + rewritten
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
