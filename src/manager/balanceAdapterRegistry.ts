import type { ChainFamily } from '../models/ChainType'
import type { BalanceAdapter } from './balanceTypes'

class BalanceAdapterRegistry {
  private adapters = new Map<ChainFamily, BalanceAdapter>()

  register(adapter: BalanceAdapter): void {
    this.adapters.set(adapter.family, adapter)
  }

  get(family: ChainFamily): BalanceAdapter | undefined {
    return this.adapters.get(family)
  }
}

export const balanceAdapterRegistry = new BalanceAdapterRegistry()
