import { NextRequest, NextResponse } from 'next/server'
import { injectProvider } from '@/server/proxy'

const DAPP_WHITELIST = new Set(
  (process.env.DAPP_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
)

function isDAppAllowed(url: string): boolean {
  if (DAPP_WHITELIST.size === 0) return true
  try { return DAPP_WHITELIST.has(new URL(url).hostname) } catch { return false }
}

function getProxyBase(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost'
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url')
  if (!targetUrl) return NextResponse.json({ error: 'Missing ?url= parameter' }, { status: 400 })
  if (!isDAppAllowed(targetUrl)) return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })

  try {
    const targetOrigin = new URL(targetUrl).origin
    const proxyBase = getProxyBase(request)

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
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300' },
      })
    }

    const html = await response.text()
    const injected = injectProvider(html, targetOrigin, proxyBase)
    // Do not set X-Frame-Options so the proxied page can be embedded in our iframe.
    // (Omitting the header = allow framing; ALLOWALL is non-standard.)
    return new NextResponse(injected, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[Proxy]', (err as Error).message)
    return NextResponse.json(
      { error: 'Failed to fetch target page', detail: (err as Error).message },
      { status: 502 },
    )
  }
}
