import type { ChainFamily, Chain } from '../../models/ChainType'
import type { TokenInfo } from '../../utils/tokenStorage'

export interface TokenBalanceResult {
  symbol: string
  name: string
  balance: string
  address: string
  decimals: number
}

export interface BalanceAdapter {
  readonly family: ChainFamily
  readonly displayDecimals: number
  readonly supportsTokens: boolean

  fetchNativeBalance(address: string, chain: Chain): Promise<string>

  fetchTokenBalances(
    address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<TokenBalanceResult[]>
}

export interface DisplayToken {
  symbol: string
  name: string
  balance: string
  isNative: boolean
  address?: string
  decimals?: number
}
