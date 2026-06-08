import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPolymarketMarkets,
  fetchPolymarketMarketDetail,
  formatPolymarketVolume,
  getPolymarketEventUrl,
  marketMatchesCategory,
  filterMarketsByCategory,
  CATEGORY_TABS,
  type PolymarketMarket,
} from '@/services/polymarketService'

const MOCK_MARKETS: PolymarketMarket[] = [
  {
    id: 1,
    question: 'Will it rain tomorrow?',
    slug: 'will-it-rain-tomorrow',
    image: 'https://example.com/rain.png',
    volume24hr: '1250000000000',
    volume: '5000000000000',
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.6", "0.4"]',
  },
  {
    id: 2,
    question: 'Who will win the election?',
    slug: 'who-will-win-the-election',
    image: '',
    volume24hr: '890000000000',
    volume: '2100000000000',
    outcomes: '["Candidate A", "Candidate B"]',
    outcomePrices: '["0.55", "0.45"]',
  },
  {
    id: 3,
    question: 'Will Bitcoin hit $100k this year?',
    slug: 'will-bitcoin-hit-100k',
    image: '',
    volume24hr: '2000000000000',
    volume: '8000000000000',
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.3", "0.7"]',
  },
  {
    id: 4,
    question: 'NBA Finals 2025 Champion?',
    slug: 'nba-finals-2025-champion',
    image: '',
    volume24hr: '1500000000000',
    volume: '4000000000000',
    outcomes: '["Lakers", "Celtics"]',
    outcomePrices: '["0.5", "0.5"]',
  },
]

describe('polymarketService', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SERVER_API_KEY', 'test-server-api-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ source: 'polymarket', data: MOCK_MARKETS }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('fetchPolymarketMarkets', () => {
    it('fetches markets from proxy server with correct body', async () => {
      const markets = await fetchPolymarketMarkets(10)
      const fetchMock = vi.mocked(global.fetch)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const [calledUrl, calledInit] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe('https://wapi.testring.org/v1/prediction_markets')
      expect(calledInit?.method).toBe('POST')
      expect(calledInit?.headers).toMatchObject({
        'Content-Type': 'application/json',
        'X-API-Key': expect.any(String),
      })
      const body = JSON.parse(calledInit?.body as string)
      expect(body).toEqual({
        source: 'polymarket',
        active: true,
        closed: false,
        limit: 10,
        offset: 0,
        order: 'volume_24hr',
        ascending: false,
      })
    })

    it('passes offset to the API', async () => {
      await fetchPolymarketMarkets(20, 40)
      const fetchMock = vi.mocked(global.fetch)
      const [, calledInit] = fetchMock.mock.calls[0]
      const body = JSON.parse(calledInit?.body as string)
      expect(body.offset).toBe(40)
    })

    it('passes category to the API when provided', async () => {
      await fetchPolymarketMarkets(20, 0, 'sports')
      const fetchMock = vi.mocked(global.fetch)
      const [, calledInit] = fetchMock.mock.calls[0]
      const body = JSON.parse(calledInit?.body as string)
      expect(body.category).toBe('sports')
    })

    it('does not include category in body when omitted', async () => {
      await fetchPolymarketMarkets(20)
      const fetchMock = vi.mocked(global.fetch)
      const [, calledInit] = fetchMock.mock.calls[0]
      const body = JSON.parse(calledInit?.body as string)
      expect(body).not.toHaveProperty('category')
    })

    it('returns parsed market array on success', async () => {
      const markets = await fetchPolymarketMarkets(20)
      expect(markets).toHaveLength(4)
      expect(markets[0].question).toBe('Will it rain tomorrow?')
      expect(markets[0].slug).toBe('will-it-rain-tomorrow')
      expect(markets[1].volume24hr).toBe('890000000000')
    })

    it('throws when API returns non-OK status', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response('Internal Server Error', { status: 500 })
          )
      )
      await expect(fetchPolymarketMarkets()).rejects.toThrow(
        'Prediction market API error: HTTP 500'
      )
    })
  })

  describe('fetchPolymarketMarketDetail', () => {
    it('fetches detail from proxy server with correct body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              source: 'polymarket',
              data: { question: 'Will it rain?', slug: 'will-it-rain' },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        )
      )
      const detail = await fetchPolymarketMarketDetail('will-it-rain')
      const fetchMock = vi.mocked(global.fetch)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const [calledUrl, calledInit] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe(
        'https://wapi.testring.org/v1/prediction_markets/detail'
      )
      expect(calledInit?.method).toBe('POST')
      const body = JSON.parse(calledInit?.body as string)
      expect(body).toEqual({
        source: 'polymarket',
        slug: 'will-it-rain',
      })
      expect(detail).toEqual({
        question: 'Will it rain?',
        slug: 'will-it-rain',
      })
    })

    it('returns null when API returns empty data', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ source: 'polymarket', data: null }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        )
      )
      const detail = await fetchPolymarketMarketDetail('unknown-slug')
      expect(detail).toBeNull()
    })

    it('throws when detail API returns non-OK status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }))
      )
      await expect(fetchPolymarketMarketDetail('unknown')).rejects.toThrow(
        'Prediction market detail API error: HTTP 404'
      )
    })
  })

  describe('formatPolymarketVolume', () => {
    it('formats billions', () => {
      expect(formatPolymarketVolume('2000000000000000')).toBe('$2.0B')
      expect(formatPolymarketVolume('1250000000000000')).toBe('$1.3B')
    })

    it('formats millions', () => {
      expect(formatPolymarketVolume('500000000000000')).toBe('$500.0M')
      expect(formatPolymarketVolume('1250000000000')).toBe('$1.3M')
    })

    it('formats thousands', () => {
      expect(formatPolymarketVolume('850000000000')).toBe('$850.0K')
      expect(formatPolymarketVolume('1200000000')).toBe('$1.2K')
    })

    it('formats small values', () => {
      expect(formatPolymarketVolume('500000000')).toBe('$500')
      expect(formatPolymarketVolume('1000000')).toBe('$1')
    })
  })

  describe('getPolymarketEventUrl', () => {
    it('returns correct event URL for a slug', () => {
      expect(getPolymarketEventUrl('will-it-rain-tomorrow')).toBe(
        'https://polymarket.com/event/will-it-rain-tomorrow'
      )
    })
  })

  describe('marketMatchesCategory', () => {
    it('matches hot category for any market', () => {
      expect(marketMatchesCategory(MOCK_MARKETS[0], 'hot')).toBe(true)
      expect(marketMatchesCategory(MOCK_MARKETS[1], 'hot')).toBe(true)
    })

    it('matches crypto keywords', () => {
      expect(marketMatchesCategory(MOCK_MARKETS[2], 'crypto')).toBe(true)
      expect(marketMatchesCategory(MOCK_MARKETS[0], 'crypto')).toBe(false)
    })

    it('matches sports keywords', () => {
      expect(marketMatchesCategory(MOCK_MARKETS[3], 'sports')).toBe(true)
      expect(marketMatchesCategory(MOCK_MARKETS[1], 'sports')).toBe(false)
    })

    it('matches politics keywords', () => {
      expect(marketMatchesCategory(MOCK_MARKETS[1], 'politics')).toBe(true)
      expect(marketMatchesCategory(MOCK_MARKETS[3], 'politics')).toBe(false)
    })

    it('is case-insensitive', () => {
      const market: PolymarketMarket = {
        ...MOCK_MARKETS[0],
        question: 'Will The NBA Finals Be Cancelled?',
      }
      expect(marketMatchesCategory(market, 'sports')).toBe(true)
    })

    it('checks slug as well as question', () => {
      const market: PolymarketMarket = {
        ...MOCK_MARKETS[0],
        question: 'Will this happen?',
        slug: 'presidential-election-2024',
      }
      expect(marketMatchesCategory(market, 'politics')).toBe(true)
    })
  })

  describe('filterMarketsByCategory', () => {
    it('returns all markets for hot category', () => {
      expect(filterMarketsByCategory(MOCK_MARKETS, 'hot')).toHaveLength(4)
    })

    it('filters to sports markets only', () => {
      const sports = filterMarketsByCategory(MOCK_MARKETS, 'sports')
      expect(sports).toHaveLength(1)
      expect(sports[0].slug).toBe('nba-finals-2025-champion')
    })

    it('filters to crypto markets only', () => {
      const crypto = filterMarketsByCategory(MOCK_MARKETS, 'crypto')
      expect(crypto).toHaveLength(1)
      expect(crypto[0].slug).toBe('will-bitcoin-hit-100k')
    })

    it('returns empty array when no markets match', () => {
      expect(filterMarketsByCategory(MOCK_MARKETS, 'world')).toHaveLength(0)
    })
  })

  describe('CATEGORY_TABS', () => {
    it('has hot as the first tab', () => {
      expect(CATEGORY_TABS[0].key).toBe('hot')
    })

    it('has unique keys', () => {
      const keys = CATEGORY_TABS.map((t) => t.key)
      expect(new Set(keys).size).toBe(keys.length)
    })

    it('has non-empty keywords for non-all tabs', () => {
      CATEGORY_TABS.slice(1).forEach((tab) => {
        expect(tab.keywords.length).toBeGreaterThan(0)
      })
    })
  })
})
