import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CardType } from '@/features/card/types'
import { MemoryBackedCardAdapter } from '@/features/card/services/adapter/memoryBackedCardAdapter'

const testSpec = {
  id: 'tx-issuer',
  displayName: 'TX Issuer',
  supportedAssets: ['USDC'],
  supportedChains: ['ethereum'],
  supportedCurrencies: ['USD'],
  supportedRegions: ['Global'],
  cardTypes: ['virtual'] as CardType[],
}

const config = {
  apiKey: '',
  environment: 'sandbox' as const,
  walletAddress: '0x0000000000000000000000000000000000000001',
}

describe('MemoryBackedCardAdapter — transactions', () => {
  afterEach(() => { vi.useRealTimers() })

  it(
    'getTransactions returns empty list for a freshly created card',
    async () => {
      vi.useFakeTimers()
      const adapter = new MemoryBackedCardAdapter(testSpec)

      const init = adapter.initialize(config)
      await vi.advanceTimersByTimeAsync(600)
      await init

      const kyc = adapter.startKYC()
      await vi.advanceTimersByTimeAsync(600)
      await kyc

      // Advance past auto-approve
      await vi.advanceTimersByTimeAsync(3500)

      const create = adapter.createCard('virtual')
      await vi.advanceTimersByTimeAsync(600)
      const card = await create

      const txPromise = adapter.getTransactions(card.id, { page: 1, pageSize: 20 })
      await vi.advanceTimersByTimeAsync(600)
      const result = await txPromise

      expect(result.items).toEqual([])
      expect(result.hasMore).toBe(false)
    },
    10_000,
  )

  it(
    'getTransactions for unknown card id returns empty list',
    async () => {
      vi.useFakeTimers()
      const adapter = new MemoryBackedCardAdapter(testSpec)

      const init = adapter.initialize(config)
      await vi.advanceTimersByTimeAsync(600)
      await init

      const txPromise = adapter.getTransactions('nonexistent-card', { page: 1, pageSize: 20 })
      await vi.advanceTimersByTimeAsync(600)
      const result = await txPromise

      expect(result.items).toEqual([])
      expect(result.hasMore).toBe(false)
    },
    10_000,
  )

  it(
    'getCards returns the created card after createCard',
    async () => {
      vi.useFakeTimers()
      const adapter = new MemoryBackedCardAdapter(testSpec)

      const init = adapter.initialize(config)
      await vi.advanceTimersByTimeAsync(600)
      await init

      const kyc = adapter.startKYC()
      await vi.advanceTimersByTimeAsync(600)
      await kyc
      await vi.advanceTimersByTimeAsync(3500)

      const create = adapter.createCard('virtual')
      await vi.advanceTimersByTimeAsync(600)
      const card = await create

      const listPromise = adapter.getCards()
      await vi.advanceTimersByTimeAsync(600)
      const cards = await listPromise

      expect(cards).toHaveLength(1)
      expect(cards[0].id).toBe(card.id)
      expect(cards[0].provider).toBe('tx-issuer')
    },
    10_000,
  )
})
