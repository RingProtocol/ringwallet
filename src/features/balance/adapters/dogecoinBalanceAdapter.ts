import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../../models/ChainType'
import { chainToAccountAssetsNetwork } from '../../../config/chains'
import { DogecoinService } from '../../../services/rpc/dogecoinService'
import type { BalanceAdapter } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'
import type { ChainToken } from '../../../models/ChainTokens'

function satsHexFromDoge(doge: number): string {
  if (!Number.isFinite(doge) || doge <= 0) return '0x0'
  const sats = BigInt(Math.round(doge * 1e8))
  return `0x${sats.toString(16)}`
}

function makeNativeDogeToken(
  chain: Chain,
  tokenBalanceHex: string
): ChainToken {
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
    tokenPrices: [],
  }
}

const adapter = {
  family: ChainFamily.Dogecoin,
  displayDecimals: 8,
  supportsTokens: false,
  service: undefined,
  chainTokens: [] as ChainToken[],

  async fetchNativeBalance(address: string, chain: Chain): Promise<ChainToken> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    if (this.service == null) {
      this.service = new DogecoinService(rpcUrl, chain.network === 'testnet')
    }
    const svc = this.service as DogecoinService
    const bal = await svc.getBalance(address)
    return makeNativeDogeToken(chain, satsHexFromDoge(bal))
  },

  async fetchTokenBalances(): Promise<ChainToken[]> {
    return []
  },
} satisfies BalanceAdapter

balanceAdapterRegistry.register(adapter)
