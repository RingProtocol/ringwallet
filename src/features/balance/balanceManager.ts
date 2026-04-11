import { ChainFamily, type Chain } from '../../models/ChainType'
import type { TokenInfo } from '../../utils/tokenStorage'
import type { DisplayToken } from './balanceTypes'
import { balanceAdapterRegistry } from './balanceAdapterRegistry'
import './adapters'

export interface FetchBalancesResult {
  nativeBalance: string
  tokens: DisplayToken[]
}

export function emptyBalance(family: ChainFamily | undefined): string {
  if (family === ChainFamily.Bitcoin || family === ChainFamily.Dogecoin) {
    return '0.00000000'
  }
  return '0.0000'
}

export async function fetchAllBalances(
  address: string,
  chain: Chain,
  importedTokens: TokenInfo[]
): Promise<FetchBalancesResult> {
  const family = chain.family ?? ChainFamily.EVM
  const adapter = balanceAdapterRegistry.get(family)

  if (!adapter) {
    const zero = emptyBalance(family)
    return {
      nativeBalance: zero,
      tokens: [
        {
          symbol: chain.symbol || 'UNKNOWN',
          name: chain.name,
          balance: zero,
          isNative: true,
        },
      ],
    }
  }

  const nativeBalance = await adapter.fetchNativeBalance(address, chain)

  const nativeToken: DisplayToken = {
    symbol: chain.symbol || 'UNKNOWN',
    name: chain.name,
    balance: nativeBalance,
    isNative: true,
  }

  let importedDisplayTokens: DisplayToken[] = []
  if (adapter.supportsTokens && importedTokens.length > 0) {
    const results = await adapter.fetchTokenBalances(
      address,
      chain,
      importedTokens
    )
    importedDisplayTokens = results.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      balance: t.balance,
      isNative: false,
      address: t.address,
      decimals: t.decimals,
    }))
  }

  return {
    nativeBalance,
    tokens: [nativeToken, ...importedDisplayTokens],
  }
}
