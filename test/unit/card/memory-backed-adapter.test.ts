import { describe, it, expect, afterEach, vi } from 'vitest'
import type { CardType } from '@/features/card/types'
import { MemoryBackedCardAdapter } from '@/features/card/services/adapter/memoryBackedCardAdapter'

const testSpec = {
  id: 'test-issuer',
  displayName: 'Test Issuer',
  supportedAssets: ['USDC'],
  supportedChains: ['ethereum'],
  supportedCurrencies: ['USD'],
  supportedRegions: ['Global'],
  cardTypes: ['virtual', 'physical'] as CardType[],
}

const providerConfig = {
  apiKey: '',
  environment: 'sandbox' as const,
  walletAddress: '0x0000000000000000000000000000000000000001',
}

describe('MemoryBackedCardAdapter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('startKYC returns about:blank (no placeholder third-party KYC host)', async () => {
    const adapter = new MemoryBackedCardAdapter(testSpec)
    await adapter.initialize(providerConfig)
    const session = await adapter.startKYC()
    expect(session.url).toBe('about:blank')
    expect(session.url).not.toMatch(/mock-kyc|example\.com/i)
    expect(session.sessionId).toMatch(/^kyc_/)
  })

  it('getKYCStatus returns not_started before startKYC is called', async () => {
    const adapter = new MemoryBackedCardAdapter(testSpec)
    await adapter.initialize(providerConfig)
    const status = await adapter.getKYCStatus()
    expect(status).toBe('not_started')
  })

  it(
    'getKYCStatus returns in_progress immediately after startKYC (before auto-approve timer)',
    async () => {
      vi.useFakeTimers()
      const adapter = new MemoryBackedCardAdapter(testSpec)
      const init = adapter.initialize(providerConfig)
      await vi.advanceTimersByTimeAsync(600)
      await init

      const kyc = adapter.startKYC()
      await vi.advanceTimersByTimeAsync(600)
      await kyc

      // Auto-approve timer fires after 3000ms; we're at ~1200ms — status must be in_progress
      const statusPromise = adapter.getKYCStatus()
      await vi.advanceTimersByTimeAsync(600)
      expect(await statusPromise).toBe('in_progress')
    },
    10_000,
  )

  it(
    'KYC transitions to approved and createCard issues a card for this issuer',
    async () => {
      vi.useFakeTimers()
      const adapter = new MemoryBackedCardAdapter(testSpec)
      const init = adapter.initialize(providerConfig)
      await vi.advanceTimersByTimeAsync(600)
      await init

      const kyc = adapter.startKYC()
      await vi.advanceTimersByTimeAsync(600)
      await kyc

      await vi.advanceTimersByTimeAsync(3500)

      const statusPromise = adapter.getKYCStatus()
      await vi.advanceTimersByTimeAsync(500)
      expect(await statusPromise).toBe('approved')

      const create = adapter.createCard('virtual')
      await vi.advanceTimersByTimeAsync(600)
      const card = await create
      expect(card.provider).toBe('test-issuer')
      expect(card.status).toBe('active')
      expect(card.type).toBe('virtual')
      expect(card.balance).toBe('0.00')
      expect(card.cardholderName).toBe('')
      const txsPromise = adapter.getTransactions(card.id, {
        page: 1,
        pageSize: 20,
      })
      await vi.advanceTimersByTimeAsync(500)
      const txs = await txsPromise
      expect(txs.items).toEqual([])
    },
    10_000,
  )
})
