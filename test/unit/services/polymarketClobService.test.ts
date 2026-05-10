import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildCtfOrder,
  signCtfOrder,
  hmacSignature,
  getTickRounding,
} from '@/services/polymarket/polymarketClobService'
import {
  CTF_EXCHANGE_V1_DOMAIN,
  POLYMARKET_CLOB_API,
} from '@/services/polymarket/constants'

describe('polymarketClobService', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              apiKey: 'key',
              secret: 'sec',
              passphrase: 'pass',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('buildCtfOrder', () => {
    it('returns an unsigned order with correct fields', () => {
      const order = buildCtfOrder(
        {
          tokenId: '123',
          price: 0.55,
          size: 50,
          side: 'BUY',
          tickSize: '0.001',
        },
        '0xMaker',
        '0xSigner'
      )
      expect(order.maker).toBe('0xMaker')
      expect(order.signer).toBe('0xSigner')
      expect(order.tokenId).toBe('123')
      expect(order.side).toBe(0)
      expect(order.signatureType).toBe(0)
      expect(order.taker).toBe('0x0000000000000000000000000000000000000000')
      expect(BigInt(order.makerAmount)).toBeGreaterThan(0n)
      expect(BigInt(order.takerAmount)).toBeGreaterThan(0n)
    })

    it('computes SELL side correctly', () => {
      const order = buildCtfOrder(
        {
          tokenId: '123',
          price: 0.55,
          size: 50,
          side: 'SELL',
          tickSize: '0.001',
        },
        '0xMaker',
        '0xSigner'
      )
      expect(order.side).toBe(1)
    })
  })

  describe('getTickRounding', () => {
    it('returns correct rounding for known tick sizes', () => {
      expect(getTickRounding('0.1')).toEqual({ price: 1, size: 2 })
      expect(getTickRounding('0.01')).toEqual({ price: 2, size: 2 })
      expect(getTickRounding('0.001')).toEqual({ price: 3, size: 2 })
      expect(getTickRounding('0.0001')).toEqual({ price: 4, size: 2 })
    })

    it('defaults to 2 decimals for unknown tick size', () => {
      expect(getTickRounding('unknown')).toEqual({ price: 2, size: 2 })
    })
  })
})
