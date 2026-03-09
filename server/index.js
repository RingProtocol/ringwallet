import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { parse } from 'node-html-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// ─── Load the provider script that will be injected ───

const PROVIDER_SCRIPT = readFileSync(
  join(__dirname, '..', 'skills', 'dapps', 'dappsdk.js'),
  'utf-8'
)

// ─── DApp whitelist (in production, fetch from database) ───

const DAPP_WHITELIST = new Set(
  (process.env.DAPP_WHITELIST || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
)

function isDAppAllowed(url) {
  if (DAPP_WHITELIST.size === 0) return true
  try {
    const hostname = new URL(url).hostname
    return DAPP_WHITELIST.has(hostname)
  } catch {
    return false
  }
}

// ─── Middleware ───

app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
}))

app.use(express.json())

// ─── Serve the SDK script directly ───

app.get('/static/dappsdk.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(PROVIDER_SCRIPT)
})

// ─── DApp list API (mock — replace with database in production) ───

app.get('/v1/dapps', (_req, res) => {
  res.json({
    dapps: [
      {
        id: 'example',
        name: 'Example DApp',
        description: 'A test DApp for Ring Wallet integration',
        url: 'https://example.com',
        icon: 'https://via.placeholder.com/80',
        chains: [1, 11155111],
        category: 'defi',
        featured: true,
        inject_mode: 'sdk',
        status: 'active',
      },
    ],
    categories: [
      { id: 'defi', name: 'DeFi', icon: '', sort_order: 1 },
      { id: 'nft', name: 'NFT', icon: '', sort_order: 2 },
      { id: 'game', name: 'Games', icon: '', sort_order: 3 },
      { id: 'tool', name: 'Tools', icon: '', sort_order: 4 },
    ],
    updated_at: new Date().toISOString(),
  })
})

// ─── Proxy endpoint: fetch DApp page and inject provider script ───

app.get('/v1/proxy', async (req, res) => {
  const targetUrl = req.query.url
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing ?url= parameter' })
  }

  if (!isDAppAllowed(targetUrl)) {
    return res.status(403).json({ error: 'DApp URL not whitelisted' })
  }

  try {
    const targetOrigin = new URL(targetUrl).origin

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type') || ''

    // Non-HTML resources: proxy directly
    if (!contentType.includes('text/html')) {
      const buffer = Buffer.from(await response.arrayBuffer())
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.send(buffer)
    }

    const html = await response.text()
    const injectedHtml = injectProvider(html, targetOrigin)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.send(injectedHtml)
  } catch (err) {
    console.error('[Proxy] Error fetching:', targetUrl, err.message)
    res.status(502).json({ error: 'Failed to fetch target page', detail: err.message })
  }
})

// ─── Sub-resource proxy (CSS, JS, images referenced by relative paths) ───

app.get('/v1/proxy-asset', async (req, res) => {
  const targetUrl = req.query.url
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing ?url= parameter' })
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const buffer = Buffer.from(await response.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(buffer)
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch asset' })
  }
})

// ─── HTML injection logic ───

function injectProvider(html, targetOrigin) {
  const providerTag = `<script>\n// ── Ring Wallet Provider (injected) ──\n${PROVIDER_SCRIPT}\n</script>\n`

  try {
    const root = parse(html, { comment: true })
    const head = root.querySelector('head')

    if (head) {
      // Insert provider script as the very first child of <head>
      head.innerHTML = providerTag + head.innerHTML
    } else {
      // No <head> tag — prepend to entire document
      html = providerTag + html
      return rewriteRelativeUrls(html, targetOrigin)
    }

    // Rewrite relative URLs to absolute (so assets load from original server)
    const result = root.toString()
    return rewriteRelativeUrls(result, targetOrigin)
  } catch (err) {
    console.error('[Inject] Parse error, using regex fallback:', err.message)
    // Fallback: regex-based injection
    if (html.includes('<head>')) {
      return rewriteRelativeUrls(
        html.replace('<head>', '<head>' + providerTag),
        targetOrigin
      )
    }
    if (html.includes('<HEAD>')) {
      return rewriteRelativeUrls(
        html.replace('<HEAD>', '<HEAD>' + providerTag),
        targetOrigin
      )
    }
    return providerTag + rewriteRelativeUrls(html, targetOrigin)
  }
}

function rewriteRelativeUrls(html, origin) {
  // Rewrite src="/..." and href="/..." to use absolute URLs from original origin
  // This ensures assets (JS, CSS, images) load from the DApp's server
  return html
    .replace(/(src|href|action)=(["'])\//g, `$1=$2${origin}/`)
    .replace(/(src|href|action)=(["'])(?!https?:\/\/|\/\/|data:|#|javascript:|mailto:)([^"']+)/g,
      (match, attr, quote, path) => {
        if (path.startsWith('{') || path.startsWith('$')) return match
        return `${attr}=${quote}${origin}/${path}`
      }
    )
}

// ─── Health check ───

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

// ─── Start ───

app.listen(PORT, () => {
  console.log(`Ring Wallet Proxy Server running on port ${PORT}`)
  console.log(`  DApp list:   http://localhost:${PORT}/v1/dapps`)
  console.log(`  Proxy:       http://localhost:${PORT}/v1/proxy?url=<dapp-url>`)
  console.log(`  SDK script:  http://localhost:${PORT}/static/dappsdk.js`)
  console.log(`  Health:      http://localhost:${PORT}/health`)
  if (DAPP_WHITELIST.size > 0) {
    console.log(`  Whitelist:   ${[...DAPP_WHITELIST].join(', ')}`)
  } else {
    console.log(`  Whitelist:   DISABLED (all URLs allowed)`)
  }
})
