import { Connection } from '@solana/web3.js'
import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../../models/ChainType'
import { chainToAccountAssetsNetwork } from '../../../config/chains'
import { parseUnits } from 'ethers'
import { SolanaService } from '../../../services/rpc/solanaService'
import { SolanaTokenService } from '../../../services/rpc/solanaTokenService'
import type { TokenInfo } from '../../../utils/tokenStorage'
import type { BalanceAdapter } from '../balanceTypes'
import { balanceAdapterRegistry } from '../balanceAdapterRegistry'
import type { ChainToken } from '../../../models/ChainTokens'

function lamportsHexFromSol(sol: number): string {
  if (!Number.isFinite(sol) || sol <= 0) return '0x0'
  const lamports = BigInt(Math.round(sol * 1e9))
  return `0x${lamports.toString(16)}`
}

function hexFromFormatted(formatted: string, decimals: number): string {
  try {
    const u = parseUnits(formatted, decimals)
    return `0x${u.toString(16)}`
  } catch {
    return '0x0'
  }
}

function makeNativeSolToken(chain: Chain, tokenBalanceHex: string): ChainToken {
  const network = chainToAccountAssetsNetwork(chain) ?? ''
  return {
    address: '',
    network,
    tokenAddress: null,
    tokenBalance: tokenBalanceHex,
    tokenMetadata: {
      decimals: 9,
      logo: null,
      name: chain.name,
      symbol: chain.symbol,
    },
    tokenPrices: [],
  }
}

function makeSplToken(
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
  family: ChainFamily.Solana,
  displayDecimals: 4,
  supportsTokens: true,
  service: undefined,
  chainTokens: [] as ChainToken[],

  async fetchNativeBalance(address: string, chain: Chain): Promise<ChainToken> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    if (this.service == null) {
      this.service = new SolanaService(rpcUrl)
    }
    const svc = this.service as SolanaService
    const bal = await svc.getBalance(address)
    return makeNativeSolToken(chain, lamportsHexFromSol(bal))
  },

  async fetchTokenBalances(
    address: string,
    chain: Chain,
    tokens: TokenInfo[]
  ): Promise<ChainToken[]> {
    const rpcUrl = getPrimaryRpcUrl(chain)
    const connection = new Connection(rpcUrl, 'confirmed')
    const tokenService = new SolanaTokenService(connection)

    return Promise.all(
      tokens.map(async (t) => {
        try {
          const balance = await tokenService.getTokenBalance(address, t.address)
          return makeSplToken(chain, t, hexFromFormatted(balance, t.decimals))
        } catch {
          return makeSplToken(chain, t, '0x0')
        }
      })
    )
  },
} satisfies BalanceAdapter

balanceAdapterRegistry.register(adapter)
