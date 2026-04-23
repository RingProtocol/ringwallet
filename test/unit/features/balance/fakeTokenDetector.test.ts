import { describe, expect, it } from 'vitest'
import {
  isSuspiciousFakeToken,
  partitionTokens,
} from '@/features/balance/fakeTokenDetector'
import type { ChainToken } from '@/models/ChainTokens'

function makeToken(
  opts: Partial<ChainToken> & { symbol?: string; name?: string; price?: number }
): ChainToken {
  const { symbol, name, price, ...rest } = opts
  return {
    address: '0x1234567890123456789012345678901234567890',
    network: 'eth-mainnet',
    tokenAddress: '0x0000000000000000000000000000000000000001',
    tokenBalance: '0x1',
    tokenMetadata: {
      decimals: 18,
      logo: null,
      name: name ?? 'Test Token',
      symbol: symbol ?? 'TEST',
    },
    tokenPrices:
      price !== undefined
        ? [
            {
              currency: 'USD',
              value: String(price),
              lastUpdatedAt: '2024-01-01T00:00:00Z',
            },
          ]
        : [],
    ...rest,
  }
}

describe('fakeTokenDetector', () => {
  describe('isSuspiciousFakeToken', () => {
    it('returns true when price is 0', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'USDT', name: 'Tether USD', price: 0 })
        )
      ).toBe(true)
    })

    it('returns true when no price data (empty tokenPrices)', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'ETH', name: 'Ethereum', price: undefined })
        )
      ).toBe(true)
    })

    it('returns false when price is non-zero', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'USDT', name: 'Tether USD', price: 1 })
        )
      ).toBe(false)
    })

    it('returns true for any token with zero price regardless of symbol', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'SHIBA', name: 'Shiba Inu', price: 0 })
        )
      ).toBe(true)
    })

    it('returns false for normal token with price', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'DAI', name: 'Dai Stablecoin', price: 1 })
        )
      ).toBe(false)
    })
  })

  describe('partitionTokens', () => {
    it('splits visible and hidden tokens correctly', () => {
      const tokens = [
        makeToken({ symbol: 'ETH', name: 'Ethereum', price: 0 }),
        makeToken({ symbol: 'USDT', name: 'Tether', price: 1 }),
        makeToken({ symbol: 'FAKE', name: 'Fake Token', price: 0 }),
      ]
      const { visible, hidden } = partitionTokens(tokens)
      expect(visible).toHaveLength(1)
      expect(hidden).toHaveLength(2)
      expect(visible[0].tokenMetadata.symbol).toBe('USDT')
      expect(hidden.map((t) => t.tokenMetadata.symbol)).toContain('ETH')
      expect(hidden.map((t) => t.tokenMetadata.symbol)).toContain('FAKE')
    })

    it('returns all visible when no hidden tokens', () => {
      const tokens = [
        makeToken({ symbol: 'USDT', name: 'Tether', price: 1 }),
        makeToken({ symbol: 'BTC', name: 'Bitcoin', price: 50000 }),
      ]
      const { visible, hidden } = partitionTokens(tokens)
      expect(visible).toHaveLength(2)
      expect(hidden).toHaveLength(0)
    })

    it('returns all hidden when all have zero or no price', () => {
      const tokens = [
        makeToken({ symbol: 'USDT', name: 'Tether', price: 0 }),
        makeToken({ symbol: 'ETH', name: 'Ethereum', price: undefined }),
      ]
      const { visible, hidden } = partitionTokens(tokens)
      expect(visible).toHaveLength(0)
      expect(hidden).toHaveLength(2)
    })
  })
})
