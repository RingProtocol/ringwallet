import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPolymarketMarkets,
  formatPolymarketVolume,
  getPolymarketEventUrl,
} from '@/services/polymarketService'

const MOCK_MARKETS = [
  {
    question: 'Will it rain tomorrow?',
    slug: 'will-it-rain-tomorrow',
    image: 'https://example.com/rain.png',
    volume24hr: '1250000000000',
    volume: '5000000000000',
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.6", "0.4"]',
  },
  {
    question: 'Who will win the election?',
    slug: 'who-will-win-the-election',
    image: '',
    volume24hr: '890000000000',
    volume: '2100000000000',
    outcomes: '["Candidate A", "Candidate B"]',
    outcomePrices: '["0.55", "0.45"]',
  },
]

describe('polymarketService', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(MOCK_MARKETS), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('fetchPolymarketMarkets', () => {
    it('fetches markets from Gamma API with correct query params', async () => {
      const markets = await fetchPolymarketMarkets(10)
      const fetchMock = vi.mocked(global.fetch)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const calledUrl = String(fetchMock.mock.calls[0][0])
      const url = new URL(calledUrl)
      expect(url.origin + url.pathname).toBe(
        'https://gamma-api.polymarket.com/markets'
      )
      expect(url.searchParams.get('active')).toBe('true')
      expect(url.searchParams.get('closed')).toBe('false')
      expect(url.searchParams.get('limit')).toBe('10')
      expect(url.searchParams.get('sortBy')).toBe('volume24hr')
      expect(url.searchParams.get('sortDirection')).toBe('desc')
    })

    it('returns parsed market array on success', async () => {
      const markets = await fetchPolymarketMarkets(20)
      expect(markets).toHaveLength(2)
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
        'Polymarket API error: HTTP 500'
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
})
