import type { ChainToken } from '@/models/ChainTokens'
import type { ChainFamily, Chain } from '../../models/ChainType'
import type { TokenInfo } from '../../utils/tokenStorage'

export type AccountBalancesResult = {
  nativeBalance: string
  totalAssetUsd: string
  currentChainUsd: string
  tokens: ChainToken[]
}

export interface BalanceAdapter {
  readonly family: ChainFamily
  readonly displayDecimals: number
  readonly supportsTokens: boolean
  service: unknown
  chainTokens: ChainToken[]

  fetchNativeBalance(address: string, chain: Chain): Promise<ChainToken>

  fetchTokenBalances(
    address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<ChainToken[]>
}
