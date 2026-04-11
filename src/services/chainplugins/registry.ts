import { ChainFamily } from '../../models/ChainType'
import { COSMOS_CHAIN_VARIANTS } from '../../config/chains'
import type { ChainPlugin, DerivedAccount } from './types'

/** Second slot for Bitcoin testnet (m/44'/1'/…); mainnet stays under `ChainFamily.Bitcoin`. */
export const BITCOIN_TESTNET_ACCOUNTS_KEY = 'bitcoin_testnet' as const
/** Second slot for Dogecoin testnet; mainnet stays under `ChainFamily.Dogecoin`. */
export const DOGECOIN_TESTNET_ACCOUNTS_KEY = 'dogecoin_testnet' as const

/** Key for Cosmos chain variant accounts (e.g. 'cosmos_cosmos', 'cosmos_provenance'). */
export function cosmosAccountsKey(variantKey: string): string {
  return `cosmos_${variantKey}`
}

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
    count: number
  ): Record<string, DerivedAccount[]> {
    const result: Record<string, DerivedAccount[]> = {}
    for (const [family, plugin] of this.plugins) {
      try {
        result[family] = plugin.deriveAccounts(masterSeed, count)
        if (family === ChainFamily.Bitcoin) {
          result[BITCOIN_TESTNET_ACCOUNTS_KEY] = plugin.deriveAccounts(
            masterSeed,
            count,
            { isTestnet: true }
          )
        }
        if (family === ChainFamily.Dogecoin) {
          result[DOGECOIN_TESTNET_ACCOUNTS_KEY] = plugin.deriveAccounts(
            masterSeed,
            count,
            { isTestnet: true }
          )
        }
        if (family === ChainFamily.Cosmos) {
          for (const variant of COSMOS_CHAIN_VARIANTS) {
            result[cosmosAccountsKey(variant.key)] = plugin.deriveAccounts(
              masterSeed,
              count,
              {
                coinType: variant.coinType,
                addressPrefix: variant.addressPrefix,
              }
            )
          }
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
