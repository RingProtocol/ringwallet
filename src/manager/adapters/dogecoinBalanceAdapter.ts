import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../models/ChainType'
import { DogecoinService } from '../../services/dogecoinService'
import type { BalanceAdapter, TokenBalanceResult } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'

const adapter: BalanceAdapter = {
  family: ChainFamily.Dogecoin,
  displayDecimals: 8,
  supportsTokens: false,

  async fetchNativeBalance(address: string, chain: Chain): Promise<string> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    const service = new DogecoinService(rpcUrl, chain.network === 'testnet')
    const bal = await service.getBalance(address)
    return bal.toFixed(8)
  },

  async fetchTokenBalances(): Promise<TokenBalanceResult[]> {
    return []
  },
}

balanceAdapterRegistry.register(adapter)
