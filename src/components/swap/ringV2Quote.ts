import { ethers } from 'ethers'
import { FEW_ROUTER_ABI, getCommonBases } from './ringV2Constants'
import { resolveFewWrappedPath } from './fewWrappedResolver'

export interface DiscoverInput {
  provider: ethers.JsonRpcProvider
  fewFactory: string
  chainId: number
  /** Underlying ERC-20 address for tokenIn (use WETH for native ETH). */
  tokenIn: string
  /** Underlying ERC-20 address for tokenOut (use WETH for native ETH). */
  tokenOut: string
  /** Resolved canonical WETH address. */
  weth: string
}

export interface CandidatePath {
  /** Underlying token addresses, including in/out. */
  underlying: string[]
  /** Few-wrapped token addresses (what the router actually consumes). */
  wrapped: string[]
}

/**
 * Enumerate candidate paths and resolve their Few-wrapped equivalents.
 *
 * This is the token-pair-sensitive half of the old `quoteRingV2`. Once these
 * paths are known, re-quoting on a different `amountIn` only requires calling
 * `getAmountsOut` again — the wrapped lookups (which are the costly per-token
 * `getWrappedToken` round trips on a cold cache) don't need to repeat.
 *
 * Returns paths where every token has a registered fwToken. Paths that the
 * router can't route (no pool) will simply fail in `quoteOnPaths` later.
 */
export async function discoverFewV2Paths(
  input: DiscoverInput
): Promise<CandidatePath[]> {
  const { provider, fewFactory, chainId, tokenIn, tokenOut, weth } = input

  const sameAddress = (a: string, b: string) =>
    a.toLowerCase() === b.toLowerCase()

  const underlyingCandidates: string[][] = []
  underlyingCandidates.push([tokenIn, tokenOut])

  if (!sameAddress(tokenIn, weth) && !sameAddress(tokenOut, weth)) {
    underlyingCandidates.push([tokenIn, weth, tokenOut])
  }

  for (const base of getCommonBases(chainId)) {
    if (
      sameAddress(base.address, tokenIn) ||
      sameAddress(base.address, tokenOut) ||
      sameAddress(base.address, weth)
    ) {
      continue
    }
    underlyingCandidates.push([tokenIn, base.address, tokenOut])
  }

  const wrappedCandidates = await Promise.all(
    underlyingCandidates.map((p) =>
      resolveFewWrappedPath(provider, chainId, fewFactory, p)
    )
  )

  const out: CandidatePath[] = []
  for (let i = 0; i < wrappedCandidates.length; i++) {
    const w = wrappedCandidates[i]
    if (!w) continue
    out.push({ underlying: underlyingCandidates[i], wrapped: w })
  }
  return out
}

export interface QuoteResult {
  amountOut: bigint
  /** Underlying token addresses for the chosen route, including in/out. */
  underlyingPath: string[]
  /** Few-wrapped token addresses (what the router actually consumes). */
  wrappedPath: string[]
}

export interface QuoteOnPathsInput {
  provider: ethers.JsonRpcProvider
  router: string
  paths: CandidatePath[]
  amountIn: bigint
}

/**
 * Run `getAmountsOut` against a pre-resolved list of candidate paths and
 * return the best. Separated from path discovery so amount-only changes
 * (user typing) don't redo the wrapped lookups.
 *
 * Ethers v6's JsonRpcProvider batches concurrent `eth_call` requests by
 * default (10ms stall window), so a `Promise.all` of `getAmountsOut` across
 * N paths collapses into one HTTP round-trip on most RPCs.
 */
export async function quoteOnPaths(
  input: QuoteOnPathsInput
): Promise<QuoteResult | null> {
  const { provider, router, paths, amountIn } = input
  if (amountIn <= 0n || paths.length === 0) return null

  const c = new ethers.Contract(router, FEW_ROUTER_ABI, provider)

  const results = await Promise.all(
    paths.map(async (p) => {
      try {
        const amounts = (await c.getAmountsOut(amountIn, p.wrapped)) as bigint[]
        return {
          underlyingPath: p.underlying,
          wrappedPath: p.wrapped,
          amountOut: amounts[amounts.length - 1],
        }
      } catch {
        return null
      }
    })
  )

  let best: QuoteResult | null = null
  for (const r of results) {
    if (!r) continue
    if (!best || r.amountOut > best.amountOut) {
      best = {
        amountOut: r.amountOut,
        underlyingPath: r.underlyingPath,
        wrappedPath: r.wrappedPath,
      }
    }
  }
  return best
}
