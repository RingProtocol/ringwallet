import { NextResponse } from 'next/server'
import { getCorsHeaders, getHistory, isOriginAllowed, validateAddress } from '@/server/history'
import { ChainFamily, type Chain } from '@/models/ChainType'
import { DEFAULT_CHAINS } from '@/config/chains'

function resolveChain(chainId: string): Chain | null {
  const matched = DEFAULT_CHAINS.find(chain => String(chain.id) === chainId)
  if (matched) return matched

  if (/^\d+$/.test(chainId)) {
    return {
      id: Number(chainId),
      name: `Chain ${chainId}`,
      symbol: 'ETH',
      rpcUrl: [],
      explorer: 'https://etherscan.io',
      family: ChainFamily.EVM,
    }
  }

  return null
}

function parsePendingHashes(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(hash => hash.trim())
    .filter(hash => /^0x([A-Fa-f0-9]{64})$/.test(hash))
    .slice(0, 5)
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 })
  }

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin')
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403, headers: getCorsHeaders(origin) },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')?.trim() ?? ''
    const chainId = searchParams.get('chainId')?.trim() ?? ''
    const limit = Number(searchParams.get('limit') ?? '8')
    const pendingHashes = parsePendingHashes(searchParams.get('pending'))

    if (!address || !chainId) {
      return NextResponse.json(
        { error: 'Missing address or chainId' },
        { status: 400, headers: getCorsHeaders(origin) },
      )
    }

    const chain = resolveChain(chainId)
    if (!chain) {
      return NextResponse.json(
        { error: 'Unsupported chain' },
        { status: 400, headers: getCorsHeaders(origin) },
      )
    }

    if (!validateAddress(chain, address)) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400, headers: getCorsHeaders(origin) },
      )
    }

    const payload = await getHistory({
      address,
      chainId,
      limit,
      pendingHashes,
    })

    return NextResponse.json(payload, {
      headers: getCorsHeaders(origin),
    })
  } catch (error) {
    console.error('[API] /v1/history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500, headers: getCorsHeaders(origin) },
    )
  }
}
