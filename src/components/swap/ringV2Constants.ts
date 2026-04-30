/**
 * Ring V2 swap configuration.
 *
 * Routes through the Few Token Router (FewV1Router ABI), which transparently
 * wraps ERC-20 → FewToken on the way in and unwraps on the way out. The router
 * can ONLY hit Few V2 pairs (it reads from FewFactory), so any swap that goes
 * through it is FewV2-only by construction — no other DEX is reachable.
 *
 * Source of truth for addresses:
 *   ring-interface/src/constants/tokens.ts → FEW_TOKEN_ROUTER_ADDRESSES
 */

/**
 * "Ring Swap Router" addresses sourced from official docs (single source of truth):
 *   docs/docs/contracts/fewv2/deployments.md
 *
 * Do NOT copy these from ring-interface/src/constants/tokens.ts — many entries
 * there are stale, swapped (Ring Swap Factory vs Router vs UniversalRouter), or
 * placeholders. The docs repo is the authoritative source.
 *
 * Testnets are intentionally omitted; they're not in the docs and would risk
 * routing to a wrong contract. Add them once they're documented.
 */
export const FEW_TOKEN_ROUTER_ADDRESSES: Record<number, string> = {
  1: '0x39d1d8fcC5E6EEAf567Bce4e29B94fec956D3519',
  56: '0x20504f37A95eF80e3FC7476c4801fb39AaE6bAd0',
  999: '0x701D1d675415efA2d2429fB122ccC6dD4FCcA959',
}

export function getRingV2Router(chainId: number): string | null {
  return FEW_TOKEN_ROUTER_ADDRESSES[chainId] ?? null
}

export function isRingV2Supported(chainId: number): boolean {
  return chainId in FEW_TOKEN_ROUTER_ADDRESSES
}

export const FEW_ROUTER_ABI = [
  'function WETH() view returns (address)',
  'function fwWETH() view returns (address)',
  'function fewFactory() view returns (address)',
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
  'function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)',
  'function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
] as const

/**
 * FewFactory exposes `getWrappedToken(originalToken) → fwToken`. Pools live
 * on the FewFactory's pairs (between fwTokens), so paths passed to the router
 * must be Few-wrapped addresses, not raw underlying ones.
 */
export const FEW_FACTORY_ABI = [
  'function getWrappedToken(address originalToken) view returns (address)',
] as const

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
] as const

export interface BaseToken {
  address: string
  symbol: string
  decimals: number
}

/**
 * Common intermediate tokens used to enumerate multi-hop paths on each chain.
 * Order matters — earlier entries are tried first when ranking paths of equal length.
 */
export const COMMON_BASES: Record<number, BaseToken[]> = {
  1: [
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      decimals: 6,
    },
  ],
  56: [
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      decimals: 18,
    },
    {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      decimals: 18,
    },
  ],
  999: [],
}

export function getCommonBases(chainId: number): BaseToken[] {
  return COMMON_BASES[chainId] ?? []
}

export const NATIVE_PSEUDO_ADDRESS = 'NATIVE'

export const NATIVE_LABELS: Record<number, { symbol: string }> = {
  1: { symbol: 'ETH' },
  10: { symbol: 'ETH' },
  56: { symbol: 'BNB' },
  137: { symbol: 'POL' },
  8453: { symbol: 'ETH' },
  42161: { symbol: 'ETH' },
  43114: { symbol: 'AVAX' },
  59144: { symbol: 'ETH' },
  999: { symbol: 'HYPE' },
}

export function getNativeSymbol(chainId: number): string {
  return NATIVE_LABELS[chainId]?.symbol ?? 'ETH'
}
