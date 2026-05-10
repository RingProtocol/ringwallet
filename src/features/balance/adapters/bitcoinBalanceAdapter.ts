import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../../models/ChainType'
import { chainToAccountAssetsNetwork } from '../../../config/chains'
import {
  BitcoinService,
  bitcoinForkForChain,
} from '../../../services/rpc/bitcoinService'
import {
  chainToTokenPriceNetwork,
  fetchTokenPricesBySymbol,
} from '../tokenPrice'
import type { BalanceAdapter } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'
import type { ChainToken } from '../../../models/ChainTokens'

function satsHexFromBtc(btc: number): string {
  if (!Number.isFinite(btc) || btc <= 0) return '0x0'
  // Best-effort conversion; avoids float-to-BigInt by rounding sats.
  const sats = BigInt(Math.round(btc * 1e8))
  return `0x${sats.toString(16)}`
}

function makeNativeBtcToken(chain: Chain, tokenBalanceHex: string): ChainToken {
  const network = chainToAccountAssetsNetwork(chain) ?? ''
  return {
    address: '',
    network,
    tokenAddress: null,
    tokenBalance: tokenBalanceHex,
    tokenMetadata: {
      decimals: 8,
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

const adapter = {
  family: ChainFamily.Bitcoin,
  displayDecimals: 8,
  supportsTokens: false,
  service: undefined,
  chainTokens: [] as ChainToken[],

  async fetchNativeBalance(address: string, chain: Chain): Promise<ChainToken> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    if (this.service == null) {
      this.service = new BitcoinService(
        rpcUrl,
        chain.network === 'testnet',
        bitcoinForkForChain(chain)
      )
    }
    const svc = this.service as BitcoinService
    const bal = await svc.getBalance(address)
    const token = makeNativeBtcToken(chain, satsHexFromBtc(bal))
    try {
      const network = chainToTokenPriceNetwork(chain)
      if (network) {
        // BTC uses symbol-based price API (no "native" address).
        const res = await fetchTokenPricesBySymbol(['BTC'])
        const prices =
          res.find((x) => x.network === network)?.prices ?? res[0]?.prices
        if (Array.isArray(prices) && prices.length > 0) {
          token.tokenPrices = prices
        }
      }
    } catch {
      // Best-effort only; keep default tokenPrices.
    }
    return token
  },

  async fetchTokenBalances(): Promise<ChainToken[]> {
    return []
  },
} satisfies BalanceAdapter

balanceAdapterRegistry.register(adapter)
