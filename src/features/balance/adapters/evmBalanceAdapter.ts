import { ChainFamily, type Chain } from '../../../models/ChainType'
import { RpcService } from '../../../services/rpc/rpcService'
import type { TokenInfo } from '../../../utils/tokenStorage'
import type { BalanceAdapter, TokenBalanceResult } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'

const adapter: BalanceAdapter = {
  family: ChainFamily.EVM,
  displayDecimals: 4,
  supportsTokens: true,

  async fetchNativeBalance(address: string, chain: Chain): Promise<string> {
    const evmService = RpcService.fromChain(chain).getEvmService()
    const raw = await evmService.getFormattedBalance(address)
    return parseFloat(raw).toFixed(4)
  },

  async fetchTokenBalances(
    address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<TokenBalanceResult[]> {
    const evmService = RpcService.fromChain(chain).getEvmService()

    return Promise.all(
      tokens.map(async (t) => {
        try {
          const formatted = await evmService.getFormattedTokenBalance(
            t.address,
            address,
            t.decimals
          )
          return {
            symbol: t.symbol,
            name: t.name,
            balance: parseFloat(formatted).toFixed(4),
            address: t.address,
            decimals: t.decimals,
          }
        } catch {
          return {
            symbol: t.symbol,
            name: t.name,
            balance: '0.0000',
            address: t.address,
            decimals: t.decimals,
          }
        }
      })
    )
  },
}

balanceAdapterRegistry.register(adapter)
