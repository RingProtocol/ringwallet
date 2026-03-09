import express from 'express'
import cors from 'cors'
import { parse } from 'node-html-parser'
import { PROVIDER_SCRIPT } from './provider-script.js'
import {
  initDB, getCategories, upsertCategory, deleteCategory,
  getDApps, getDAppById, createDApp, updateDApp, deleteDApp,
} from './db.js'

const app = express()

// ─── Middleware ───

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))
app.use(express.json())

// ─── DApp whitelist (env-level override, DB is the primary source) ───

const DAPP_WHITELIST = new Set(
  (process.env.DAPP_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
)

function isDAppAllowed(url) {
  if (DAPP_WHITELIST.size === 0) return true
  try { return DAPP_WHITELIST.has(new URL(url).hostname) } catch { return false }
}

// ─── DB auto-init on first request ───

let dbReady = false
async function ensureDB() {
  if (dbReady) return
  try {
    await initDB()
    dbReady = true
  } catch (err) {
    console.error('[DB] init error:', err.message)
  }
}

// ─── Serve the SDK script ───

app.get('/static/dappsdk.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(PROVIDER_SCRIPT)
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/v1/dapps', async (_req, res) => {
  try {
    await ensureDB()
    const [dapps, categories] = await Promise.all([
      getDApps({ status: 'active' }),
      getCategories(),
    ])
    res.json({
      dapps,
      categories,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[API] /v1/dapps error:', err.message)
    res.status(500).json({ error: 'Failed to fetch DApps' })
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ADMIN API (protect with auth middleware in production)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token']
  const expected = process.env.ADMIN_TOKEN
  if (expected && token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// ── DApps CRUD ──

app.get('/admin/dapps', adminAuth, async (_req, res) => {
  try {
    await ensureDB()
    const dapps = await getDApps()
    res.json({ dapps })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/admin/dapps/:id', adminAuth, async (req, res) => {
  try {
    await ensureDB()
    const dapp = await getDAppById(req.params.id)
    if (!dapp) return res.status(404).json({ error: 'Not found' })
    res.json(dapp)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/admin/dapps', adminAuth, async (req, res) => {
  try {
    await ensureDB()
    const { id, name, url } = req.body
    if (!id || !name || !url) {
      return res.status(400).json({ error: 'id, name, url are required' })
    }
    const rows = await createDApp(req.body)
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/admin/dapps/:id', adminAuth, async (req, res) => {
  try {
    await ensureDB()
    const rows = await updateDApp(req.params.id, req.body)
    if (!rows) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/admin/dapps/:id', adminAuth, async (req, res) => {
  try {
    await ensureDB()
    const rows = await deleteDApp(req.params.id)
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ deleted: rows[0].id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Categories CRUD ──

app.get('/admin/categories', adminAuth, async (_req, res) => {
  try {
    await ensureDB()
    const categories = await getCategories()
    res.json({ categories })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/admin/categories', adminAuth, async (req, res) => {
  try {
    await ensureDB()
    const { id, name } = req.body
    if (!id || !name) return res.status(400).json({ error: 'id, name are required' })
    const rows = await upsertCategory(req.body)
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/admin/categories/:id', adminAuth, async (req, res) => {
  try {
    await ensureDB()
    const rows = await deleteCategory(req.params.id)
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ deleted: rows[0].id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PROXY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getProxyBase(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol
  const host = req.headers['x-forwarded-host'] || req.get('host')
  return `${proto}://${host}`
}

app.get('/v1/proxy', async (req, res) => {
  const targetUrl = req.query.url
  if (!targetUrl) return res.status(400).json({ error: 'Missing ?url= parameter' })
  if (!isDAppAllowed(targetUrl)) return res.status(403).json({ error: 'URL not allowed' })

  try {
    const targetOrigin = new URL(targetUrl).origin
    const proxyBase = getProxyBase(req)

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      const buffer = Buffer.from(await response.arrayBuffer())
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.send(buffer)
    }

    const html = await response.text()
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.send(injectProvider(html, targetOrigin, proxyBase))
  } catch (err) {
    console.error('[Proxy]', err.message)
    res.status(502).json({ error: 'Failed to fetch target page', detail: err.message })
  }
})

app.get('/v1/proxy-asset', async (req, res) => {
  const targetUrl = req.query.url
  if (!targetUrl) return res.status(400).json({ error: 'Missing ?url= parameter' })

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
        'Accept': '*/*',
        'Referer': new URL(targetUrl).origin + '/',
      },
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const proxyBase = getProxyBase(req)

    if (contentType.includes('text/css') || targetUrl.endsWith('.css')) {
      let css = await response.text()
      const assetOrigin = new URL(targetUrl).origin
      const assetDir = targetUrl.substring(0, targetUrl.lastIndexOf('/'))

      css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, quote, rawUrl) => {
        const trimmed = rawUrl.trim()
        if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') ||
            trimmed.startsWith('#') || trimmed.startsWith('about:')) return match
        let absolute
        if (trimmed.startsWith('//'))             absolute = 'https:' + trimmed
        else if (/^https?:\/\//i.test(trimmed))   absolute = trimmed
        else if (trimmed.startsWith('/'))           absolute = assetOrigin + trimmed
        else                                        absolute = assetDir + '/' + trimmed
        return `url(${quote}${proxyBase}/v1/proxy-asset?url=${encodeURIComponent(absolute)}${quote})`
      })

      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.send(css)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(buffer)
  } catch (err) {
    console.error('[Proxy-Asset]', err.message)
    res.status(502).json({ error: 'Failed to fetch asset' })
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HTML INJECTION + URL REWRITING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function injectProvider(html, targetOrigin, proxyBase) {
  const providerTag = `<script>\n// ── Ring Wallet Provider (injected) ──\n${PROVIDER_SCRIPT}\n</script>\n`

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
  } catch (err) {
    console.error('[Inject] Parse error, regex fallback:', err.message)
    const rewritten = rewriteUrlsRegex(html, targetOrigin, proxyBase)
    if (rewritten.includes('<head>'))  return rewritten.replace('<head>', '<head>' + providerTag)
    if (rewritten.includes('<HEAD>'))  return rewritten.replace('<HEAD>', '<HEAD>' + providerTag)
    return providerTag + rewritten
  }
}

function resolveUrl(rawUrl, targetOrigin) {
  if (!rawUrl) return null
  const t = rawUrl.trim()
  if (!t || /^(data:|#|javascript:|mailto:|blob:|about:|\{|\$|\{\{)/.test(t)) return null
  if (t.startsWith('//'))              return 'https:' + t
  if (/^https?:\/\//i.test(t))         return t
  if (t.startsWith('/'))                return targetOrigin + t
  return targetOrigin + '/' + t
}

function toProxyUrl(absoluteUrl, proxyBase, isNav) {
  if (!absoluteUrl) return null
  const ep = isNav ? '/v1/proxy' : '/v1/proxy-asset'
  return `${proxyBase}${ep}?url=${encodeURIComponent(absoluteUrl)}`
}

const RESOURCE_ATTRS = {
  script: ['src'], link: ['href'], img: ['src', 'srcset'],
  source: ['src', 'srcset'], video: ['src', 'poster'], audio: ['src'],
  embed: ['src'], object: ['data'], input: ['src'], iframe: ['src'],
}

function rewriteElementUrls(root, targetOrigin, proxyBase) {
  for (const [tag, attrs] of Object.entries(RESOURCE_ATTRS)) {
    for (const el of root.querySelectorAll(tag)) {
      for (const attr of attrs) {
        const val = el.getAttribute(attr)
        if (!val) continue
        if (attr === 'srcset') {
          el.setAttribute(attr, rewriteSrcset(val, targetOrigin, proxyBase))
        } else {
          const abs = resolveUrl(val, targetOrigin)
          const p = abs && toProxyUrl(abs, proxyBase, false)
          if (p) el.setAttribute(attr, p)
        }
      }
    }
  }
  for (const a of root.querySelectorAll('a')) {
    const href = a.getAttribute('href')
    if (!href) continue
    const abs = resolveUrl(href, targetOrigin)
    const p = abs && toProxyUrl(abs, proxyBase, true)
    if (p) a.setAttribute('href', p)
  }
  for (const f of root.querySelectorAll('form')) {
    const action = f.getAttribute('action')
    if (!action) continue
    const abs = resolveUrl(action, targetOrigin)
    const p = abs && toProxyUrl(abs, proxyBase, true)
    if (p) f.setAttribute('action', p)
  }
}

function rewriteSrcset(srcset, targetOrigin, proxyBase) {
  return srcset.split(',').map(entry => {
    const parts = entry.trim().split(/\s+/)
    if (!parts.length) return entry
    const abs = resolveUrl(parts[0], targetOrigin)
    if (abs) parts[0] = toProxyUrl(abs, proxyBase, false)
    return parts.join(' ')
  }).join(', ')
}

function rewriteInlineCssUrls(html, targetOrigin, proxyBase) {
  return html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, q, raw) => {
    const abs = resolveUrl(raw, targetOrigin)
    if (!abs) return match
    return `url(${q}${toProxyUrl(abs, proxyBase, false)}${q})`
  })
}

function rewriteUrlsRegex(html, targetOrigin, proxyBase) {
  return html
    .replace(/(src|href|action)=(["'])\/\/([^"']+)/g, (_, attr, q, rest) =>
      `${attr}=${q}${toProxyUrl('https://' + rest, proxyBase, attr === 'href')}`)
    .replace(/(src|href|action)=(["'])\//g, (_, attr, q) =>
      `${attr}=${q}${proxyBase}/v1/proxy-asset?url=${encodeURIComponent(targetOrigin + '/')}`)
    .replace(/(src|href|action)=(["'])(https?:\/\/[^"']+)/g, (_, attr, q, url) => {
      const ep = attr === 'href' ? '/v1/proxy' : '/v1/proxy-asset'
      return `${attr}=${q}${proxyBase}${ep}?url=${encodeURIComponent(url)}`
    })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HEALTH + START
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', db: dbReady })
})

// Vercel uses the exported app; local dev uses listen()
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`Ring Wallet Proxy Server running on port ${PORT}`)
    console.log(`  Health:  http://localhost:${PORT}/health`)
    console.log(`  DApps:   http://localhost:${PORT}/v1/dapps`)
    console.log(`  Proxy:   http://localhost:${PORT}/v1/proxy?url=<url>`)
    console.log(`  Admin:   http://localhost:${PORT}/admin/dapps`)
  })
}

export default app
