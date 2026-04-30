import { ethers } from 'ethers'
import { FEW_FACTORY_ABI, FEW_ROUTER_ABI } from './ringV2Constants'

/**
 * Few V2 pools sit between Few-wrapped tokens, so any path we hand to the
 * router (or to `getAmountsOut`) must be in fwToken addresses. This resolver
 * reads the router's `fewFactory()` and caches `getWrappedToken(underlying)`
 * lookups in memory keyed by `chainId:underlying`.
 */

const factoryByChain = new Map<number, string>()
const wrappedCache = new Map<string, string>()

const factoryKey = (chainId: number) => chainId
const wrappedKey = (chainId: number, underlying: string): string =>
  `${chainId}:${underlying.toLowerCase()}`

export async function getFewFactory(
  provider: ethers.JsonRpcProvider,
  chainId: number,
  router: string
): Promise<string> {
  const cached = factoryByChain.get(factoryKey(chainId))
  if (cached) return cached
  const c = new ethers.Contract(router, FEW_ROUTER_ABI, provider)
  const factory = (await c.fewFactory()) as string
  factoryByChain.set(factoryKey(chainId), factory)
  return factory
}

export async function getFwWETH(
  provider: ethers.JsonRpcProvider,
  router: string
): Promise<string> {
  const c = new ethers.Contract(router, FEW_ROUTER_ABI, provider)
  return (await c.fwWETH()) as string
}

export async function resolveFewWrapped(
  provider: ethers.JsonRpcProvider,
  chainId: number,
  factory: string,
  underlying: string
): Promise<string | null> {
  const key = wrappedKey(chainId, underlying)
  const cached = wrappedCache.get(key)
  if (cached) return cached
  try {
    const c = new ethers.Contract(factory, FEW_FACTORY_ABI, provider)
    const wrapped = (await c.getWrappedToken(underlying)) as string
    if (wrapped && wrapped !== ethers.ZeroAddress) {
      wrappedCache.set(key, wrapped)
      return wrapped
    }
    return null
  } catch {
    return null
  }
}

/**
 * Convert an array of underlying token addresses to their Few-wrapped
 * counterparts. Returns null if any token has no wrapped version.
 */
export async function resolveFewWrappedPath(
  provider: ethers.JsonRpcProvider,
  chainId: number,
  factory: string,
  underlyingPath: string[]
): Promise<string[] | null> {
  const wrappedPath = await Promise.all(
    underlyingPath.map((u) => resolveFewWrapped(provider, chainId, factory, u))
  )
  if (wrappedPath.some((w) => w == null)) return null
  return wrappedPath as string[]
}
