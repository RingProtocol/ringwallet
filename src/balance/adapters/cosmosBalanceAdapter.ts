import { ChainFamily, type Chain } from '../../models/ChainType'
import type { TokenInfo } from '../../utils/tokenStorage'
import type { BalanceAdapter, TokenBalanceResult } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'

const adapter: BalanceAdapter = {
  family: ChainFamily.Cosmos,
  displayDecimals: 4,
  supportsTokens: true,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchNativeBalance(_address: string, _chain: Chain): Promise<string> {
    // No Cosmos balance service yet — return placeholder
    return '--'
  },

  async fetchTokenBalances(
    _address: string,
    _chain: Chain,
    tokens: TokenInfo[]
  ): Promise<TokenBalanceResult[]> {
    return tokens.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      balance: '--',
      address: t.address,
      decimals: t.decimals,
    }))
  },
}

balanceAdapterRegistry.register(adapter)
