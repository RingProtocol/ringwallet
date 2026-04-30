import { useEffect, useMemo, useState } from 'react'
import {
  KYBER_NATIVE_ADDR,
  KYBER_TOKEN_API_BASE,
  isKyberAggregatorSupported,
} from './kyberConstants'
import type { SwapTokenOption } from './useRingV2Tokens'

interface KyberToken {
  address: string
  symbol: string
  decimals: number
  name?: string
  logoURI?: string
}

interface KyberTokensResponse {
  data?: {
    tokens?: KyberToken[]
    pagination?: { totalItems?: number }
  }
}

/**
 * The Kyber token-list API caps `pageSize` at 100. Requests above this
 * silently return an empty array, which is how the old single-page fetch
 * appeared to "only know 3 tokens" — it was really returning 100 but every
 * chain has 200–400 whitelisted assets, and we never pulled pages 2+.
 */
const MAX_PAGE_SIZE = 100
/** Hard safety cap so a misbehaving chainId can't spin up hundreds of pages. */
const MAX_TOKENS = 2000
const CACHE_TTL_MS = 60 * 60 * 1000
const STORAGE_PREFIX = 'ringwallet:kyber-tokens:'
const STORAGE_VERSION = 2

interface StoredCache {
  v: number
  ts: number
  tokens: Omit<SwapTokenOption, 'balance'>[]
  nativeLogo?: string | null
}

interface MemoryEntry {
  tokens: SwapTokenOption[]
  nativeLogo: string | null
}

const memoryCache = new Map<number, MemoryEntry>()

function readPersistedCache(chainId: number): MemoryEntry | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${chainId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredCache
    if (parsed.v !== STORAGE_VERSION) return null
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.tokens)) return null
    return {
      tokens: parsed.tokens.map((t) => ({ ...t, balance: 0n })),
      nativeLogo: parsed.nativeLogo ?? null,
    }
  } catch {
    return null
  }
}

function writePersistedCache(chainId: number, entry: MemoryEntry): void {
  if (typeof localStorage === 'undefined') return
  try {
    // Balances are always 0n at this layer (per-wallet balances merge later
    // in the panel), so we strip them for a compact, JSON-safe payload.
    const payload: StoredCache = {
      v: STORAGE_VERSION,
      ts: Date.now(),
      tokens: entry.tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
        isNative: t.isNative,
        logo: t.logo,
      })),
      nativeLogo: entry.nativeLogo,
    }
    localStorage.setItem(`${STORAGE_PREFIX}${chainId}`, JSON.stringify(payload))
  } catch {
    // Storage full / private mode — silently skip. Memory cache still works.
  }
}

function projectToken(raw: KyberToken): SwapTokenOption | null {
  if (!raw.address || !raw.symbol || raw.decimals == null) return null
  return {
    address: raw.address,
    symbol: raw.symbol,
    decimals: raw.decimals,
    balance: 0n,
    isNative: false,
    logo: raw.logoURI ?? null,
  }
}

async function fetchPage(
  chainId: number,
  page: number,
  signal: AbortSignal
): Promise<KyberTokensResponse | null> {
  const url =
    `${KYBER_TOKEN_API_BASE}/api/v1/tokens` +
    `?chainIds=${chainId}&page=${page}&pageSize=${MAX_PAGE_SIZE}&isWhitelisted=true`
  const res = await fetch(url, { signal })
  if (!res.ok) {
    console.warn(
      `[kyber] token list page ${page} failed for chain ${chainId}: HTTP ${res.status}`
    )
    return null
  }
  return (await res.json()) as KyberTokensResponse
}

/**
 * Pull Kyber's whitelisted token list for a chain.
 *
 * Strategy:
 *   1. Seed synchronously from memory / localStorage (so tab-switches don't
 *      flash an empty picker while we revalidate).
 *   2. Fetch page 1 and surface it right away.
 *   3. Issue pages 2..N in parallel based on `pagination.totalItems`,
 *      deduplicate by lower-case address, then persist.
 *
 * Errors are logged (not thrown). Callers get an empty list + whatever they
 * merge on top (wallet tokens, common bases, custom-by-address) so the UI
 * never breaks just because ks-setting.kyberswap.com is unreachable.
 */
export function useKyberTokenList(chainId: number): {
  tokens: SwapTokenOption[]
  /** Logo URI for the chain's native asset, pulled from the Kyber list. */
  nativeLogo: string | null
  /** Map of lower-case ERC-20 address → logoURI for cheap lookups. */
  logoIndex: Map<string, string>
  loading: boolean
} {
  const seed = useMemo<MemoryEntry>(() => {
    return (
      memoryCache.get(chainId) ??
      readPersistedCache(chainId) ?? { tokens: [], nativeLogo: null }
    )
  }, [chainId])

  const [list, setList] = useState<SwapTokenOption[]>(seed.tokens)
  const [nativeLogo, setNativeLogo] = useState<string | null>(seed.nativeLogo)
  const [loading, setLoading] = useState<boolean>(seed.tokens.length === 0)

  useEffect(() => {
    const seeded = memoryCache.get(chainId) ?? readPersistedCache(chainId)
    if (seeded) {
      setList(seeded.tokens)
      setNativeLogo(seeded.nativeLogo)
      memoryCache.set(chainId, seeded)
    } else {
      setList([])
      setNativeLogo(null)
    }

    if (!isKyberAggregatorSupported(chainId)) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const first = await fetchPage(chainId, 1, controller.signal)
        if (cancelled || !first) {
          if (!cancelled) setLoading(false)
          return
        }
        const rawTokens = first.data?.tokens ?? []
        const total = first.data?.pagination?.totalItems ?? rawTokens.length

        const merged: SwapTokenOption[] = []
        const seen = new Set<string>()
        let discoveredNativeLogo: string | null = null
        const nativeSentinel = KYBER_NATIVE_ADDR.toLowerCase()
        const add = (raw: KyberToken) => {
          // Kyber emits the chain's native asset at 0xeeee…eeee. We build the
          // native option ourselves in each panel (with isNative: true), so
          // we extract just the logo and drop the entry from the ERC-20
          // list — otherwise the picker shows a duplicate "ETH".
          if (raw.address?.toLowerCase() === nativeSentinel) {
            if (!discoveredNativeLogo && raw.logoURI) {
              discoveredNativeLogo = raw.logoURI
            }
            return
          }
          const p = projectToken(raw)
          if (!p) return
          const key = p.address.toLowerCase()
          if (seen.has(key)) return
          seen.add(key)
          merged.push(p)
        }
        for (const raw of rawTokens) add(raw)

        if (!cancelled) {
          if (merged.length > 0) setList([...merged])
          if (discoveredNativeLogo) setNativeLogo(discoveredNativeLogo)
        }

        const cap = Math.min(total, MAX_TOKENS)
        const totalPages = Math.max(1, Math.ceil(cap / MAX_PAGE_SIZE))
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              fetchPage(chainId, i + 2, controller.signal)
            )
          )
          if (cancelled) return
          for (const r of rest) {
            if (!r) continue
            for (const raw of r.data?.tokens ?? []) add(raw)
          }
        }

        if (cancelled) return
        const entry: MemoryEntry = {
          tokens: merged,
          nativeLogo: discoveredNativeLogo,
        }
        memoryCache.set(chainId, entry)
        writePersistedCache(chainId, entry)
        setList(merged)
        if (discoveredNativeLogo) setNativeLogo(discoveredNativeLogo)
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        console.warn(`[kyber] token list fetch failed for chain ${chainId}`, e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [chainId])

  const logoIndex = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of list) {
      if (t.logo) m.set(t.address.toLowerCase(), t.logo)
    }
    return m
  }, [list])

  return useMemo(
    () => ({ tokens: list, nativeLogo, logoIndex, loading }),
    [list, nativeLogo, logoIndex, loading]
  )
}
