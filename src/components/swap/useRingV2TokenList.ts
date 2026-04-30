import { useEffect, useMemo, useState } from 'react'
import type { SwapTokenOption } from './useRingV2Tokens'

interface RingTokenEntry {
  chainId: number
  name: string
  address: string
  symbol: string
  decimals: number
  logoURI?: string
}

const RING_TOKEN_LIST_URLS: Record<number, string> = {
  1: 'https://raw.githubusercontent.com/Uniswap/default-token-list/main/src/tokens/mainnet.json',
  56: 'https://raw.githubusercontent.com/RingProtocol/token-list/master/bnb.tokenlist.json',
  999: 'https://raw.githubusercontent.com/RingProtocol/token-list/master/hyper.tokenlist.json',
}

const CACHE_TTL_MS = 4 * 60 * 60 * 1000
const STORAGE_PREFIX = 'ringwallet:ring-tokens:'
const STORAGE_VERSION = 1

interface StoredCache {
  v: number
  ts: number
  tokens: Omit<SwapTokenOption, 'balance'>[]
}

const memoryCache = new Map<number, SwapTokenOption[]>()

function readPersistedCache(chainId: number): SwapTokenOption[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${chainId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredCache
    if (parsed.v !== STORAGE_VERSION) return null
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.tokens)) return null
    return parsed.tokens.map((t) => ({ ...t, balance: 0n }))
  } catch {
    return null
  }
}

function writePersistedCache(chainId: number, tokens: SwapTokenOption[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    const payload: StoredCache = {
      v: STORAGE_VERSION,
      ts: Date.now(),
      tokens: tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
        isNative: t.isNative,
        logo: t.logo,
      })),
    }
    localStorage.setItem(`${STORAGE_PREFIX}${chainId}`, JSON.stringify(payload))
  } catch {
    // Storage full / private mode — memory cache still works.
  }
}

export function hasRingTokenList(chainId: number): boolean {
  return chainId in RING_TOKEN_LIST_URLS
}

/**
 * Fetch the Ring Protocol token list for a given chain from the static
 * GitHub-hosted JSON. Results are cached in memory + localStorage (4h TTL).
 */
export function useRingV2TokenList(chainId: number): {
  tokens: SwapTokenOption[]
  loading: boolean
} {
  const url = RING_TOKEN_LIST_URLS[chainId]

  const seed = useMemo<SwapTokenOption[]>(() => {
    return memoryCache.get(chainId) ?? readPersistedCache(chainId) ?? []
  }, [chainId])

  const [list, setList] = useState<SwapTokenOption[]>(seed)
  const [loading, setLoading] = useState<boolean>(seed.length === 0 && !!url)

  useEffect(() => {
    const seeded = memoryCache.get(chainId) ?? readPersistedCache(chainId)
    if (seeded) {
      setList(seeded)
      memoryCache.set(chainId, seeded)
    } else {
      setList([])
    }

    if (!url) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          console.warn(
            `[ring] token list fetch failed for chain ${chainId}: HTTP ${res.status}`
          )
          return
        }
        const json = (await res.json()) as RingTokenEntry[]
        if (cancelled || !Array.isArray(json)) return

        const tokens: SwapTokenOption[] = []
        const seen = new Set<string>()
        for (const entry of json) {
          if (entry.chainId !== chainId) continue
          if (!entry.address || !entry.symbol || entry.decimals == null)
            continue
          const key = entry.address.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          tokens.push({
            address: entry.address,
            symbol: entry.symbol,
            decimals: entry.decimals,
            balance: 0n,
            isNative: false,
            logo: entry.logoURI ?? null,
          })
        }

        if (cancelled) return
        memoryCache.set(chainId, tokens)
        writePersistedCache(chainId, tokens)
        setList(tokens)
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        console.warn(`[ring] token list fetch failed for chain ${chainId}`, e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [chainId, url])

  return useMemo(() => ({ tokens: list, loading }), [list, loading])
}
