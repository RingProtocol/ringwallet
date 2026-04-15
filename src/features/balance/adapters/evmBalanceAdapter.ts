import { ChainFamily, type Chain } from '../../../models/ChainType'
import { chainToAccountAssetsNetwork } from '../../../config/chains'
import { parseUnits } from 'ethers'
import { RpcService } from '../../../services/rpc/rpcService'
import type EvmRpcService from '../../../services/rpc/evmRpcService'
import type { TokenInfo } from '../../../utils/tokenStorage'
import type { BalanceAdapter } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'
import type { ChainToken } from '../../../models/ChainTokens'

function hexFromFormatted(formatted: string, decimals: number): string {
  try {
    const wei = parseUnits(formatted, decimals)
    return `0x${wei.toString(16)}`
  } catch {
    return '0x0'
  }
}

function makeNativeToken(chain: Chain, tokenBalanceHex: string): ChainToken {
  const network = chainToAccountAssetsNetwork(chain) ?? ''
  return {
    address: '',
    network,
    tokenAddress: null,
    tokenBalance: tokenBalanceHex,
    tokenMetadata: {
      decimals: 18,
      logo: null,
      name: chain.name,
      symbol: chain.symbol,
    },
    tokenPrices: [],
  }
}

function makeErc20Token(
  chain: Chain,
  token: TokenInfo,
  tokenBalanceHex: string
): ChainToken {
  const network = chainToAccountAssetsNetwork(chain) ?? ''
  return {
    address: '',
    network,
    tokenAddress: token.address,
    tokenBalance: tokenBalanceHex,
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
  family: ChainFamily.EVM,
  displayDecimals: 4,
  supportsTokens: true,
  service: undefined,
  chainTokens: [] as ChainToken[],

  async fetchNativeBalance(address: string, chain: Chain): Promise<ChainToken> {
    if (this.service == null) {
      this.service = RpcService.fromChain(chain).getEvmService()
    }
    const svc = this.service as EvmRpcService
    const raw = await svc.getFormattedBalance(address)
    return makeNativeToken(chain, hexFromFormatted(raw, 18))
  },

  async fetchTokenBalances(
    address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<ChainToken[]> {
    const evmService = RpcService.fromChain(chain).getEvmService()

    return Promise.all(
      tokens.map(async (t) => {
        try {
          const formatted = await evmService.getFormattedTokenBalance(
            t.address,
            address,
            t.decimals
          )
          return makeErc20Token(
            chain,
            t,
            hexFromFormatted(formatted, t.decimals)
          )
        } catch {
          return makeErc20Token(chain, t, '0x0')
        }
      })
    )
  },
} satisfies BalanceAdapter

balanceAdapterRegistry.register(adapter)
