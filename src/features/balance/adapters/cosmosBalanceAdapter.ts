import { ChainFamily, type Chain } from '../../../models/ChainType'
import { chainToAccountAssetsNetwork } from '../../../config/chains'
import type { TokenInfo } from '../../../utils/tokenStorage'
import type { BalanceAdapter } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'
import type { ChainToken } from '../../../models/ChainTokens'

function makeNativeCosmosToken(chain: Chain): ChainToken {
  const network = chainToAccountAssetsNetwork(chain) ?? ''
  return {
    address: '',
    network,
    tokenAddress: null,
    tokenBalance: '0x0',
    tokenMetadata: {
      decimals: null,
      logo: null,
      name: chain.name,
      symbol: chain.symbol,
    },
    tokenPrices: [],
  }
}

function makeCosmosToken(chain: Chain, token: TokenInfo): ChainToken {
  const network = chainToAccountAssetsNetwork(chain) ?? ''
  return {
    address: '',
    network,
    tokenAddress: token.address,
    tokenBalance: '0x0',
    tokenMetadata: {
      decimals: token.decimals,
      logo: null,
      name: token.name,
      symbol: token.symbol,
    },
    tokenPrices: [],
  }
}

const adapter = {
  family: ChainFamily.Cosmos,
  displayDecimals: 4,
  supportsTokens: true,
  service: undefined,
  chainTokens: [] as ChainToken[],

  async fetchNativeBalance(
    _address: string,
    chain: Chain
  ): Promise<ChainToken> {
    // No Cosmos balance service yet — return placeholder
    return makeNativeCosmosToken(chain)
  },

  async fetchTokenBalances(
    _address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<ChainToken[]> {
    return tokens.map((t) => makeCosmosToken(chain, t))
  },
} satisfies BalanceAdapter

balanceAdapterRegistry.register(adapter)
