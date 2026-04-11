import { Connection } from '@solana/web3.js'
import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../../models/ChainType'
import { SolanaService } from '../../../services/rpc/solanaService'
import { SolanaTokenService } from '../../../services/rpc/solanaTokenService'
import type { TokenInfo } from '../../../utils/tokenStorage'
import type { BalanceAdapter, TokenBalanceResult } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'

const adapter: BalanceAdapter = {
  family: ChainFamily.Solana,
  displayDecimals: 4,
  supportsTokens: true,

  async fetchNativeBalance(address: string, chain: Chain): Promise<string> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    const service = new SolanaService(rpcUrl)
    const bal = await service.getBalance(address)
    return bal.toFixed(4)
  },

  async fetchTokenBalances(
    address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<TokenBalanceResult[]> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    const connection = new Connection(rpcUrl, 'confirmed')
    const tokenService = new SolanaTokenService(connection)

    return Promise.all(
      tokens.map(async (t) => {
        try {
          const balance = await tokenService.getTokenBalance(address, t.address)
          return {
            symbol: t.symbol,
            name: t.name,
            balance: parseFloat(balance).toFixed(4),
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
