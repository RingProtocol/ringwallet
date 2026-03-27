import { ChainFamily } from '../../models/ChainType'
import type { ChainPlugin, DerivedAccount } from './types'

/** Second slot for Bitcoin testnet (m/44'/1'/…); mainnet stays under `ChainFamily.Bitcoin`. */
export const BITCOIN_TESTNET_ACCOUNTS_KEY = 'bitcoin_testnet' as const

class ChainPluginRegistry {
  private plugins = new Map<ChainFamily, ChainPlugin>()

  register(plugin: ChainPlugin): void {
    this.plugins.set(plugin.family, plugin)
  }

  get(family: ChainFamily): ChainPlugin | undefined {
    return this.plugins.get(family)
  }

  has(family: ChainFamily): boolean {
    return this.plugins.has(family)
  }

  families(): ChainFamily[] {
    return [...this.plugins.keys()]
  }

  getAll(): ChainPlugin[] {
    return [...this.plugins.values()]
  }

  /**
   * Derive accounts for every registered chain family in one call.
   * Individual failures are caught so one broken plugin doesn't block the rest.
   */
  deriveAllAccounts(
    masterSeed: Uint8Array,
    count: number,
  ): Record<string, DerivedAccount[]> {
    const result: Record<string, DerivedAccount[]> = {}
    for (const [family, plugin] of this.plugins) {
      try {
        result[family] = plugin.deriveAccounts(masterSeed, count)
        if (family === ChainFamily.Bitcoin) {
          result[BITCOIN_TESTNET_ACCOUNTS_KEY] = plugin.deriveAccounts(masterSeed, count, {
            isTestnet: true,
          })
        }
      } catch (e) {
        console.error(`[ChainRegistry] Failed to derive ${family} accounts:`, e)
        result[family] = []
      }
    }
    return result
  }
}

export const chainRegistry = new ChainPluginRegistry()
