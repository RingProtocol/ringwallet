import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CardType } from '@/features/card/types'
import { MemoryBackedCardAdapter } from '@/features/card/services/adapter/memoryBackedCardAdapter'
import { CardProviderRegistry } from '@/features/card/services/registry'

const makeSpec = (id: string) => ({
  id,
  displayName: id,
  supportedAssets: ['USDC'],
  supportedChains: ['ethereum'],
  supportedCurrencies: ['USD'],
  supportedRegions: ['Global'],
  cardTypes: ['virtual'] as CardType[],
})

const config = {
  apiKey: '',
  environment: 'sandbox' as const,
  walletAddress: '0x0000000000000000000000000000000000000001',
}

describe('CardProviderRegistry', () => {
  afterEach(() => { vi.useRealTimers() })

  it('get returns undefined for unknown id', () => {
    const registry = new CardProviderRegistry()
    expect(registry.get('nope')).toBeUndefined()
  })

  it('has returns false before registration, true after', () => {
    const registry = new CardProviderRegistry()
    const adapter = new MemoryBackedCardAdapter(makeSpec('a'))
    expect(registry.has('a')).toBe(false)
    registry.register(adapter)
    expect(registry.has('a')).toBe(true)
  })

  it('getAll returns all registered adapters in insertion order', () => {
    const registry = new CardProviderRegistry()
    const a = new MemoryBackedCardAdapter(makeSpec('a'))
    const b = new MemoryBackedCardAdapter(makeSpec('b'))
    registry.register(a)
    registry.register(b)
    expect(registry.getAll().map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('getActiveProvider returns undefined when no adapter is linked', () => {
    const registry = new CardProviderRegistry()
    registry.register(new MemoryBackedCardAdapter(makeSpec('a')))
    registry.register(new MemoryBackedCardAdapter(makeSpec('b')))
    expect(registry.getActiveProvider()).toBeUndefined()
  })

  it(
    'getActiveProvider returns the first linked adapter, not necessarily the first registered',
    async () => {
      vi.useFakeTimers()
      const registry = new CardProviderRegistry()
      const a = new MemoryBackedCardAdapter(makeSpec('a'))
      const b = new MemoryBackedCardAdapter(makeSpec('b'))
      registry.register(a)
      registry.register(b)

      // Initialize only b
      const initB = b.initialize(config)
      await vi.advanceTimersByTimeAsync(600)
      await initB

      expect(registry.getActiveProvider()?.id).toBe('b')
      // a is still not linked — get('a') returns it but it is not "active"
      expect(registry.get('a')?.isLinked()).toBe(false)
    },
    10_000,
  )

  it('get by specific id is independent of getActiveProvider', async () => {
    vi.useFakeTimers()
    const registry = new CardProviderRegistry()
    const a = new MemoryBackedCardAdapter(makeSpec('issuer-a'))
    const b = new MemoryBackedCardAdapter(makeSpec('issuer-b'))
    registry.register(a)
    registry.register(b)

    // Link both
    const initA = a.initialize(config)
    await vi.advanceTimersByTimeAsync(600)
    await initA
    const initB = b.initialize({ ...config, walletAddress: '0x0000000000000000000000000000000000000002' })
    await vi.advanceTimersByTimeAsync(600)
    await initB

    // getActiveProvider returns the first linked (a), but we can still get b by id
    expect(registry.getActiveProvider()?.id).toBe('issuer-a')
    expect(registry.get('issuer-b')?.id).toBe('issuer-b')
    expect(registry.get('issuer-b')?.isLinked()).toBe(true)
  },
  10_000,
  )
})
