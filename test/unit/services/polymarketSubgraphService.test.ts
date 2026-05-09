import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPositions,
  fetchOrders,
} from '@/services/polymarket/polymarketSubgraphService'

const MOCK_POSITIONS_RESPONSE = {
  data: {
    userPositions: [
      {
        id: 'pos-1',
        market: {
          id: 'm1',
          question: 'Will it rain?',
          conditionId: '0xabc',
          outcomePrices: '["0.6", "0.4"]',
          outcomes: '["Yes", "No"]',
          slug: 'will-it-rain',
          image: '',
        },
        outcomeIndex: 0,
        quantity: '100',
        avgPrice: '0.55',
        updatedAt: '1710000000',
      },
    ],
  },
}

const MOCK_ORDERS_RESPONSE = {
  data: {
    orders: [
      {
        id: 'ord-1',
        market: {
          id: 'm1',
          question: 'Will it rain?',
          slug: 'will-it-rain',
        },
        outcomeIndex: 0,
        side: 'BUY',
        makerAmount: '50',
        takerAmount: '100',
        price: '0.5',
        status: 'FILLED',
        transactionHash: '0xabc',
        timestamp: '1710000000',
      },
    ],
  },
}

describe('polymarketSubgraphService', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('positions')) {
          return Promise.resolve(
            new Response(JSON.stringify(MOCK_POSITIONS_RESPONSE), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            })
          )
        }
        if (typeof url === 'string' && url.includes('activity')) {
          return Promise.resolve(
            new Response(JSON.stringify(MOCK_ORDERS_RESPONSE), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            })
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify({ data: {} }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        )
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('fetchPositions', () => {
    it('returns parsed positions array', async () => {
      const positions = await fetchPositions('0x123')
      expect(positions).toHaveLength(1)
      expect(positions[0].market.question).toBe('Will it rain?')
      expect(positions[0].outcomeIndex).toBe(0)
    })

    it('throws on HTTP error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('Error', { status: 500 }))
      )
      await expect(fetchPositions('0x123')).rejects.toThrow('Subgraph error')
    })
  })

  describe('fetchOrders', () => {
    it('returns parsed orders array', async () => {
      const orders = await fetchOrders('0x123')
      expect(orders).toHaveLength(1)
      expect(orders[0].side).toBe('BUY')
      expect(orders[0].status).toBe('FILLED')
    })
  })
})
