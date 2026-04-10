import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../models/ChainType'
import {
  BitcoinService,
  bitcoinForkForChain,
} from '../../services/bitcoinService'
import type { BalanceAdapter, TokenBalanceResult } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'

const adapter: BalanceAdapter = {
  family: ChainFamily.Bitcoin,
  displayDecimals: 8,
  supportsTokens: false,

  async fetchNativeBalance(address: string, chain: Chain): Promise<string> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    const service = new BitcoinService(
      rpcUrl,
      chain.network === 'testnet',
      bitcoinForkForChain(chain)
    )
    const bal = await service.getBalance(address)
    return bal.toFixed(8)
  },

  async fetchTokenBalances(): Promise<TokenBalanceResult[]> {
    return []
  },
}

balanceAdapterRegistry.register(adapter)
