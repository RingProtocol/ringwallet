import type { CardProviderAdapter } from './adapter/types'

/**
 * Registry for card provider adapters.
 *
 * Follows the same pattern as `chainRegistry` in
 * `src/services/chainplugins/registry.ts`.
 */
class CardProviderRegistry {
  private providers = new Map<string, CardProviderAdapter>()

  /** Register a card provider adapter. */
  register(adapter: CardProviderAdapter): void {
    this.providers.set(adapter.id, adapter)
  }

  /** Retrieve an adapter by its unique id. */
  get(id: string): CardProviderAdapter | undefined {
    return this.providers.get(id)
  }

  /** Check whether an adapter with the given id is registered. */
  has(id: string): boolean {
    return this.providers.has(id)
  }

  /** Return all registered adapters. */
  getAll(): CardProviderAdapter[] {
    return [...this.providers.values()]
  }

  /**
   * Return the first adapter that is currently linked (i.e. has an
   * active session), or `undefined` if none are linked.
   */
  getActiveProvider(): CardProviderAdapter | undefined {
    for (const adapter of this.providers.values()) {
      if (adapter.isLinked()) return adapter
    }
    return undefined
  }
}

/** Global singleton — register adapters at app startup. */
export const cardProviderRegistry = new CardProviderRegistry()
