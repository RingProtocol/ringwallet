import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchTokenPriceHistorical,
  type PriceDataPoint,
  type TokenPriceHistoricalRequest,
  type TokenPriceHistoricalResponse,
} from '@/features/balance/tokenPriceHistorical'

const API_URL = 'https://rw.testring.org/v1/token_price_historical'
const API_KEY = 'wallet_s32909jfie829384jjsjnfkdnwh22338dhshwbsnw1j2b3h3j4h8d7'

const MOCK_POINTS: PriceDataPoint[] = [
  { value: '0.9992620396', timestamp: '2024-01-01T00:00:00Z' },
  { value: '1.0012612827', timestamp: '2024-01-02T00:00:00Z' },
  { value: '1.0021169088', timestamp: '2024-01-03T00:00:00Z' },
]

function mockResponse(body: TokenPriceHistoricalResponse, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Bad Request',
    json: async () => body,
  } as Response
}

// yarn vitest run test/unit/features/balance/tokenPriceHistorical.test.ts

describe('fetchTokenPriceHistorical', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchSpy = vi.fn() as any as typeof globalThis.fetch &
    ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends correct request for ERC20 token (network + address)', async () => {
    const responseBody: TokenPriceHistoricalResponse = {
      network: 'eth-mainnet',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      currency: 'usd',
      data: MOCK_POINTS,
    }
    fetchSpy.mockResolvedValueOnce(mockResponse(responseBody))

    const params: TokenPriceHistoricalRequest = {
      network: 'eth-mainnet',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-03T00:00:00Z',
      interval: '1d',
    }

    const result = await fetchTokenPriceHistorical(params)

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(API_URL)
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>)['X-API-Key']).toBe(API_KEY)
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json'
    )
    expect(JSON.parse(init?.body as string)).toEqual(params)
    expect(result).toEqual(MOCK_POINTS)
  })

  it('sends correct request for native token (symbol)', async () => {
    const responseBody: TokenPriceHistoricalResponse = {
      symbol: 'ETH',
      currency: 'usd',
      data: MOCK_POINTS,
    }
    fetchSpy.mockResolvedValueOnce(mockResponse(responseBody))

    const params: TokenPriceHistoricalRequest = {
      symbol: 'ETH',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-03T00:00:00Z',
      interval: '15m',
    }

    const result = await fetchTokenPriceHistorical(params)

    const [, init] = fetchSpy.mock.calls[0]
    expect(JSON.parse(init?.body as string)).toEqual(params)
    expect(result).toEqual(MOCK_POINTS)
  })

  it('returns empty array when response data is null', async () => {
    const responseBody = {
      currency: 'usd',
      data: null,
    } as unknown as TokenPriceHistoricalResponse
    fetchSpy.mockResolvedValueOnce(mockResponse(responseBody))

    const params: TokenPriceHistoricalRequest = {
      symbol: 'ETH',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T01:00:00Z',
      interval: '5m',
    }

    const result = await fetchTokenPriceHistorical(params)
    expect(result).toEqual([])
  })

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ currency: 'usd', data: [] }, 400)
    )

    const params: TokenPriceHistoricalRequest = {
      symbol: 'ETH',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T01:00:00Z',
      interval: '5m',
    }

    await expect(fetchTokenPriceHistorical(params)).rejects.toThrow(
      'token_price_historical failed: 400 Bad Request'
    )
  })

  it('passes AbortSignal to fetch', async () => {
    const responseBody: TokenPriceHistoricalResponse = {
      currency: 'usd',
      data: [],
    }
    fetchSpy.mockResolvedValueOnce(mockResponse(responseBody))

    const controller = new AbortController()
    const params: TokenPriceHistoricalRequest = {
      symbol: 'ETH',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-01T01:00:00Z',
      interval: '5m',
    }

    await fetchTokenPriceHistorical(params, controller.signal)

    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.signal).toBe(controller.signal)
  })
})
