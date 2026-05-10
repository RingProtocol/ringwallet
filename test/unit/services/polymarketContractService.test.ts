import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getConditionalTokenBalance,
  getConditionalTokenBalances,
  getUsdcAllowance,
  getUsdcBalance,
  formatPolyAmount,
  parsePolyAmount,
} from '@/services/polymarket/polymarketContractService'

const MOCK_BALANCE = 123456789n

function makeMockProvider(returnValue: unknown) {
  return {
    getFeeData: vi.fn().mockResolvedValue({
      maxFeePerGas: 30000000000n,
      maxPriorityFeePerGas: 1500000000n,
    }),
  } as unknown as import('ethers').JsonRpcProvider
}

describe('polymarketContractService', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: MOCK_BALANCE.toString() }), {
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

  describe('formatPolyAmount', () => {
    it('formats 6-decimal bigint to string', () => {
      expect(formatPolyAmount(1000000n)).toBe('1.0')
      expect(formatPolyAmount(1500000n)).toBe('1.5')
      expect(formatPolyAmount(0n)).toBe('0.0')
    })
  })

  describe('parsePolyAmount', () => {
    it('parses string to 6-decimal bigint', () => {
      expect(parsePolyAmount('1')).toBe(1000000n)
      expect(parsePolyAmount('1.5')).toBe(1500000n)
      expect(parsePolyAmount('0')).toBe(0n)
    })
  })
})
