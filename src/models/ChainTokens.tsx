export interface ChainTokenPrice {
  currency: string
  /** Unit price in `currency` as a string (e.g. `"2385.02"`). */
  value: string
  lastUpdatedAt: string
}

export interface ChainTokenMetadata {
  decimals: number | null
  logo: string | null
  name: string | null
  symbol: string | null
}

export interface ChainToken {
  address: string
  network: string
  /** `null` means native token for that network. */
  tokenAddress: string | null
  /** Hex string (0x...) token amount in smallest units. */
  tokenBalance: string
  tokenMetadata: ChainTokenMetadata
  tokenPrices: ChainTokenPrice[]
}

/**
 * key: network
 * value: ChainToken[]
 */
const chainTokensMap: Map<string, ChainToken[]> = new Map()
const chainTotalUsdMap: Map<string, string> = new Map()

const tokenCacheListeners = new Set<() => void>()

export function subscribeTokenCache(listener: () => void): () => void {
  tokenCacheListeners.add(listener)
  return () => {
    tokenCacheListeners.delete(listener)
  }
}

export function notifyTokenCacheUpdated(): void {
  for (const listener of [...tokenCacheListeners]) {
    try {
      listener()
    } catch (e) {
      console.error('Token cache listener failed', e)
    }
  }
}

export function clearChainTokenCache(): void {
  chainTokensMap.clear()
  chainTotalUsdMap.clear()
  notifyTokenCacheUpdated()
}

/**
 * Cache token list for a network, and cache a best-effort total USD.
 *
 * Note: `tokenPrices.value` is a **unit price**, not a portfolio value.
 * We only have enough info to compute a real portfolio value once we
 * decode balances + decimals elsewhere, so here we keep the total as
 * "sum of per-token USD values if already precomputed".
 */
export function cacheTokensForNetwork(
  network: string,
  tokens: ChainToken[],
  totalUsd?: string
): void {
  chainTokensMap.set(network, tokens)
  if (totalUsd != null) {
    chainTotalUsdMap.set(network, totalUsd)
  }
}

/**
 *
 * @param network
 * @returns cached total USD string if set
 */
export function getTotalUsdForNetwork(network: string): string | undefined {
  return chainTotalUsdMap.get(network)
}

/**
 *
 * @param network
 * @returns cached tokens for the network, if present
 */
export function getTokensForNetwork(network: string): ChainToken[] | undefined {
  return chainTokensMap.get(network)
}
