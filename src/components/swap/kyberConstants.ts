/**
 * KyberSwap MetaAggregationRouterV2 addresses, hardcoded per chain.
 *
 * The aggregator API will return a `routerAddress` field in every quote/build
 * response; we MUST verify it matches one of these. This is the primary
 * defense against a compromised KyberSwap API redirecting users to a
 * malicious router.
 *
 * Source: https://docs.kyberswap.com/Aggregator/aggregator-api
 *
 * On most EVM chains the production router lives at the same deterministic
 * CREATE2 address. Chains we have not personally verified are intentionally
 * omitted — adding a chain without confirming the router invalidates the
 * security model. To extend coverage, look up the router on the docs site
 * (or check kyberswap.com → Settings → "Smart contracts") then add it here.
 */
export const KYBER_ROUTER_ADDRESSES: Record<number, string> = {
  1: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // Ethereum
  56: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // BNB Smart Chain
  137: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // Polygon PoS
  43114: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // Avalanche C-Chain
  42161: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // Arbitrum One
  10: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // Optimism
  8453: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // Base
  59144: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5', // Linea
}

/** KyberSwap path segment used in API URLs, per chain. */
export const KYBER_CHAIN_NAMES: Record<number, string> = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  43114: 'avalanche',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  59144: 'linea',
}

export const KYBER_API_BASE = 'https://aggregator-api.kyberswap.com'
export const KYBER_TOKEN_API_BASE = 'https://ks-setting.kyberswap.com'
/** Sentinel address Kyber uses for the chain's native asset (ETH, BNB, …). */
export const KYBER_NATIVE_ADDR = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
/** Identifier sent to Kyber for analytics/source tagging. */
export const KYBER_CLIENT_ID = 'ringwallet'

export function isKyberAggregatorSupported(chainId: number): boolean {
  return chainId in KYBER_ROUTER_ADDRESSES && chainId in KYBER_CHAIN_NAMES
}

export function getKyberChainName(chainId: number): string | null {
  return KYBER_CHAIN_NAMES[chainId] ?? null
}

export function getKyberRouter(chainId: number): string | null {
  return KYBER_ROUTER_ADDRESSES[chainId] ?? null
}
