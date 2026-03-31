import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../../../app/api/v1/dapps/route'

const ORIGINAL_DAPP_URL = process.env.VITE_DAPP_URL
const ORIGINAL_DAPP_TOKEN = process.env.DAPP_TOKEN
const TEST_DAPP_URL =
  process.env.VITE_DAPP_URL?.trim() || 'https://example.com/exec'
const TEST_DAPP_TOKEN = process.env.DAPP_TOKEN?.trim() || 'secret-token'

describe('/api/v1/dapps GET', () => {
  beforeEach(() => {
    process.env.VITE_DAPP_URL = TEST_DAPP_URL
    process.env.DAPP_TOKEN = TEST_DAPP_TOKEN
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    if (ORIGINAL_DAPP_URL === undefined) {
      delete process.env.VITE_DAPP_URL
    } else {
      process.env.VITE_DAPP_URL = ORIGINAL_DAPP_URL
    }

    if (ORIGINAL_DAPP_TOKEN === undefined) {
      delete process.env.DAPP_TOKEN
    } else {
      process.env.DAPP_TOKEN = ORIGINAL_DAPP_TOKEN
    }
  })

  it('reads upstream data with secret and testdapp, then returns normalized JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            'App name': 'Uniswap',
            'DApp URL': 'https://app.uniswap.org',
            'App logo URL': 'https://cdn.example.com/uniswap.png',
            'App description': 'Swap tokens',
            Category: 'DEX',
            Top: '7',
          },
        ]),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(
      new Request('http://localhost:3000/api/v1/dapps?testdapp=abc123')
    )
    const payload = await response.json()
    const [calledUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    const upstreamUrl = new URL(String(calledUrl))

    expect(response.status).toBe(200)
    expect(upstreamUrl.origin + upstreamUrl.pathname).toBe(
      new URL(TEST_DAPP_URL).origin + new URL(TEST_DAPP_URL).pathname
    )
    expect(upstreamUrl.searchParams.get('secret')).toBe(TEST_DAPP_TOKEN)
    expect(upstreamUrl.searchParams.get('testdapp')).toBe('abc123')
    expect(init).toMatchObject({
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    expect(payload).toMatchObject({
      dapps: [
        {
          name: 'Uniswap',
          url: 'https://app.uniswap.org',
          icon: 'https://cdn.example.com/uniswap.png',
          description: 'Swap tokens',
          category: 'dex',
          top: 7,
        },
      ],
      categories: [
        {
          id: 'dex',
          name: 'DEX',
        },
      ],
    })
    expect(typeof payload.updated_at).toBe('string')
  })
})
