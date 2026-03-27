import { NextRequest, NextResponse } from 'next/server'
import { rewriteCssUrls } from '@/server/proxy'

function getProxyBase(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost'
  return `${proto}://${host}`
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age': '86400',
}

const SKIP_REQUEST_HEADERS = new Set([
  'host', 'origin', 'referer', 'cookie',
  'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host',
  'x-vercel-id', 'x-vercel-proxy-signature',
  'connection', 'transfer-encoding',
])

const SKIP_RESPONSE_HEADERS = new Set([
  'content-encoding', 'transfer-encoding', 'connection',
  'content-security-policy', 'content-security-policy-report-only',
  'x-frame-options', 'strict-transport-security',
  'access-control-allow-origin', 'access-control-allow-methods',
  'access-control-allow-headers', 'access-control-expose-headers',
  'access-control-max-age',
])

function buildForwardHeaders(request: NextRequest, targetUrl: string): HeadersInit {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers[key] = value
    }
  })
  try { headers['Referer'] = new URL(targetUrl).origin + '/' } catch {}
  return headers
}

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  const targetUrl = request.nextUrl.searchParams.get('url')
  if (!targetUrl) return NextResponse.json({ error: 'Missing ?url= parameter' }, { status: 400 })

  try {
    const fetchInit: RequestInit = {
      method: request.method,
      headers: buildForwardHeaders(request, targetUrl),
      redirect: 'follow',
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      const body = await request.arrayBuffer()
      if (body.byteLength > 0) fetchInit.body = body
    }

    const response = await fetch(targetUrl, fetchInit)

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const proxyBase = getProxyBase(request)

    const responseHeaders: Record<string, string> = { ...CORS_HEADERS }
    response.headers.forEach((value, key) => {
      if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders[key] = value
      }
    })

    if (request.method === 'GET' && (contentType.includes('text/css') || targetUrl.endsWith('.css'))) {
      let css = await response.text()
      css = rewriteCssUrls(css, targetUrl, proxyBase)
      responseHeaders['Content-Type'] = 'text/css; charset=utf-8'
      responseHeaders['Cache-Control'] = 'public, max-age=3600'
      return new NextResponse(css, { status: response.status, headers: responseHeaders })
    }

    const buffer = await response.arrayBuffer()
    if (!responseHeaders['Cache-Control']) {
      responseHeaders['Cache-Control'] = request.method === 'GET' ? 'public, max-age=3600' : 'no-cache'
    }
    return new NextResponse(buffer, { status: response.status, headers: responseHeaders })
  } catch (err) {
    console.error('[Proxy-Asset]', (err as Error).message)
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 502, headers: CORS_HEADERS })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) { return proxyRequest(request) }
export async function POST(request: NextRequest) { return proxyRequest(request) }
export async function PUT(request: NextRequest) { return proxyRequest(request) }
export async function DELETE(request: NextRequest) { return proxyRequest(request) }
export async function PATCH(request: NextRequest) { return proxyRequest(request) }
export async function HEAD(request: NextRequest) { return proxyRequest(request) }
