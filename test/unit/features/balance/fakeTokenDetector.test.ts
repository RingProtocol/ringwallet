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
    it('returns true for USDT-like token with zero price', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'USDT', name: 'Tether USD', price: 0 })
        )
      ).toBe(true)
    })

    it('returns true for ETH-like token with zero price', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'ETH', name: 'Ethereum', price: 0 })
        )
      ).toBe(true)
    })

    it('returns true for misspelled USDT with zero price (levenshtein)', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'USDDT', name: 'Tether', price: 0 })
        )
      ).toBe(true)
    })

    it('returns true for USDT substring with zero price', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'USDT Token', name: 'Fake Tether', price: 0 })
        )
      ).toBe(true)
    })

    it('returns false for USDT with non-zero price', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'USDT', name: 'Tether USD', price: 1 })
        )
      ).toBe(false)
    })

    it('returns false for unknown token with zero price', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'SHIBA', name: 'Shiba Inu', price: 0 })
        )
      ).toBe(false)
    })

    it('returns false for normal token with price', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'DAI', name: 'Dai Stablecoin', price: 1 })
        )
      ).toBe(false)
    })

    it('returns false for empty symbol/name with zero price', () => {
      expect(
        isSuspiciousFakeToken(makeToken({ symbol: '', name: '', price: 0 }))
      ).toBe(false)
    })

    it('returns false when tokenPrices is empty (no price data)', () => {
      expect(
        isSuspiciousFakeToken(
          makeToken({ symbol: 'ETH', name: 'Ethereum', price: undefined })
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
      expect(visible).toHaveLength(2)
      expect(hidden).toHaveLength(1)
      expect(visible.map((t) => t.tokenMetadata.symbol)).toContain('USDT')
      expect(visible.map((t) => t.tokenMetadata.symbol)).toContain('FAKE')
      expect(hidden[0].tokenMetadata.symbol).toBe('ETH')
    })

    it('returns all visible when no suspicious tokens', () => {
      const tokens = [
        makeToken({ symbol: 'USDT', name: 'Tether', price: 1 }),
        makeToken({ symbol: 'BTC', name: 'Bitcoin', price: 50000 }),
      ]
      const { visible, hidden } = partitionTokens(tokens)
      expect(visible).toHaveLength(2)
      expect(hidden).toHaveLength(0)
    })

    it('returns all hidden when all are suspicious', () => {
      const tokens = [
        makeToken({ symbol: 'USDT', name: 'Tether', price: 0 }),
        makeToken({ symbol: 'ETH', name: 'Ethereum', price: 0 }),
      ]
      const { visible, hidden } = partitionTokens(tokens)
      expect(visible).toHaveLength(0)
      expect(hidden).toHaveLength(2)
    })
  })
})
