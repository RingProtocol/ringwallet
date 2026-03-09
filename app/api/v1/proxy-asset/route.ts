import { NextRequest, NextResponse } from 'next/server'
import { rewriteCssUrls } from '@/server/proxy'

function getProxyBase(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost'
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url')
  if (!targetUrl) return NextResponse.json({ error: 'Missing ?url= parameter' }, { status: 400 })

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
    const proxyBase = getProxyBase(request)

    if (contentType.includes('text/css') || targetUrl.endsWith('.css')) {
      let css = await response.text()
      css = rewriteCssUrls(css, targetUrl, proxyBase)
      return new NextResponse(css, {
        headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
      })
    }

    const buffer = await response.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('[Proxy-Asset]', (err as Error).message)
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 502 })
  }
}
