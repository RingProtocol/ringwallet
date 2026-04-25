import { ChainFamily, type Chain } from '../../../models/ChainType'
import { chainToAccountAssetsNetwork } from '../../../config/chains'
import { tronAddressToHex } from '../../../services/chainplugins/tron/tronPlugin'
import { parseUnits } from 'ethers'
import { RpcService } from '../../../services/rpc/rpcService'
import type EvmRpcService from '../../../services/rpc/evmRpcService'
import type { TokenInfo } from '../../../utils/tokenStorage'
import {
  chainToTokenPriceNetwork,
  fetchTokenPricesBySymbol,
} from '../tokenPrice'
import type { BalanceAdapter } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'
import type { ChainToken } from '../../../models/ChainTokens'

function hexFromFormatted(formatted: string, decimals: number): string {
  try {
    const u = parseUnits(formatted, decimals)
    return `0x${u.toString(16)}`
  } catch {
    return '0x0'
  }
}

function makeNativeTrxToken(chain: Chain, tokenBalanceHex: string): ChainToken {
  const network = chainToAccountAssetsNetwork(chain) ?? ''
  return {
    address: '',
    network,
    tokenAddress: null,
    tokenBalance: tokenBalanceHex,
    tokenMetadata: {
      decimals: 6,
      logo: null,
      name: chain.name,
      symbol: chain.symbol,
    },
    tokenPrices: [
      {
        currency: 'usd',
        value: '0',
        lastUpdatedAt: new Date().toISOString(),
        changePercent24h: null,
      },
    ],
  }
}

const PRICE_CACHE_TTL_MS = 60_000
let cachedTrxPrices: {
  ts: number
  prices: import('../../../models/ChainTokens').ChainTokenPrice[]
} | null = null

function makeTrc20Token(
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
  family: ChainFamily.Tron,
  displayDecimals: 4,
  supportsTokens: true,
  service: undefined,
  chainTokens: [] as ChainToken[],

  async fetchNativeBalance(address: string, chain: Chain): Promise<ChainToken> {
    if (this.service == null) {
      this.service = RpcService.fromChain(chain).getEvmService()
    }
    const hexAddr = tronAddressToHex(address)
    const svc = this.service as EvmRpcService
    const raw = await svc.getFormattedBalance(hexAddr)
    const token = makeNativeTrxToken(chain, hexFromFormatted(raw, 6))
    try {
      const network = chainToTokenPriceNetwork(chain)
      if (network) {
        const now = Date.now()
        if (cachedTrxPrices && now - cachedTrxPrices.ts < PRICE_CACHE_TTL_MS) {
          token.tokenPrices = cachedTrxPrices.prices
        } else {
          const res = await fetchTokenPricesBySymbol(['TRX'])
          const prices =
            res.find((x) => x.network === network)?.prices ?? res[0]?.prices
          if (Array.isArray(prices) && prices.length > 0) {
            cachedTrxPrices = { ts: now, prices }
            token.tokenPrices = prices
          }
        }
      }
    } catch {
      // Best-effort only; keep default tokenPrices.
      if (cachedTrxPrices) token.tokenPrices = cachedTrxPrices.prices
    }
    return token
  },

  async fetchTokenBalances(
    address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<ChainToken[]> {
    const evmService = RpcService.fromChain(chain).getEvmService()
    const hexWallet = tronAddressToHex(address)

    return Promise.all(
      tokens.map(async (t) => {
        try {
          const hexToken = tronAddressToHex(t.address)
          const formatted = await evmService.getFormattedTokenBalance(
            hexToken,
            hexWallet,
            t.decimals
          )
          return makeTrc20Token(
            chain,
            t,
            hexFromFormatted(formatted, t.decimals)
          )
        } catch {
          return makeTrc20Token(chain, t, '0x0')
        }
      })
    )
  },
} satisfies BalanceAdapter

balanceAdapterRegistry.register(adapter)
