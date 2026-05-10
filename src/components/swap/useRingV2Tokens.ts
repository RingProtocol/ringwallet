import { useEffect, useMemo, useState } from 'react'
import {
  getTokensForNetwork,
  subscribeTokenCache,
  type ChainToken,
} from '../../models/ChainTokens'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import type { Chain } from '../../models/ChainType'

export interface SwapTokenOption {
  /** ERC-20 address, or `NATIVE` for the chain's native asset. */
  address: string
  symbol: string
  decimals: number
  /** Raw balance (smallest units). 0n when unknown. */
  balance: bigint
  isNative: boolean
  logo?: string | null
}

const NATIVE_KEY = 'NATIVE'

/**
 * Read the wallet's cached tokens for the active chain and project them into
 * a swap-friendly shape. Re-runs when the cache is updated (balances arrive
 * after a fetch, etc.). Returns native first, then tokens with positive
 * balance, then tokens with zero balance, all sorted by USD descending where
 * known.
 */
export function useRingV2Tokens(activeChain: Chain | null | undefined): {
  tokens: SwapTokenOption[]
  loading: boolean
} {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribeTokenCache(() => setTick((t) => t + 1))
  }, [])

  const network = useMemo(
    () => (activeChain ? chainToAccountAssetsNetwork(activeChain) : undefined),
    [activeChain]
  )

  const tokens = useMemo<SwapTokenOption[]>(() => {
    void tick
    if (!network) return []
    const cached: ChainToken[] | undefined = getTokensForNetwork(network)
    if (!cached || cached.length === 0) return []

    const projected: SwapTokenOption[] = []
    for (const t of cached) {
      const decimals = t.tokenMetadata.decimals
      const symbol = t.tokenMetadata.symbol
      if (decimals == null || !symbol) continue
      let balance = 0n
      try {
        balance = t.tokenBalance ? BigInt(t.tokenBalance) : 0n
      } catch {
        // balance remains 0n
      }
      projected.push({
        address: t.tokenAddress ?? NATIVE_KEY,
        symbol,
        decimals,
        balance,
        isNative: t.tokenAddress == null,
        logo: t.tokenMetadata.logo,
      })
    }

    projected.sort((a, b) => {
      if (a.isNative !== b.isNative) return a.isNative ? -1 : 1
      const aHas = a.balance > 0n
      const bHas = b.balance > 0n
      if (aHas !== bHas) return aHas ? -1 : 1
      return a.symbol.localeCompare(b.symbol)
    })

    return projected
  }, [network, tick])

  return { tokens, loading: tokens.length === 0 }
}
