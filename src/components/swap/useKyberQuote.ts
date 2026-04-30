import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KYBER_API_BASE,
  KYBER_CLIENT_ID,
  KYBER_NATIVE_ADDR,
  getKyberChainName,
  getKyberRouter,
} from './kyberConstants'

export interface KyberRouteSummary {
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  amountInUsd?: string
  amountOutUsd?: string
  gas?: string
  gasUsd?: string
  route?: unknown
  // Opaque additional fields are passed through to /route/build untouched.
  [k: string]: unknown
}

export interface KyberQuote {
  routeSummary: KyberRouteSummary
  routerAddress: string
}

export class KyberQuoteError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'KyberQuoteError'
  }
}

const norm = (a: string) => a.toLowerCase()
const apiTokenAddr = (addr: string, isNative: boolean) =>
  isNative ? KYBER_NATIVE_ADDR : addr

interface UseKyberQuoteParams {
  chainId: number
  tokenInAddr: string
  tokenInIsNative: boolean
  tokenOutAddr: string
  tokenOutIsNative: boolean
  amountInRaw: bigint
  /** Debounce window before firing the network request. */
  debounceMs?: number
  /**
   * Re-fetch interval for an already-resolved quote. Matches the Kyber widget's
   * behaviour of keeping prices live (default ~20s). Pass 0 to disable.
   */
  refreshMs?: number
}

/** Cache entry keyed by the exact quote-request signature. */
interface CacheEntry {
  quote: KyberQuote | null
  error: string | null
  /** Epoch ms when this entry was written. */
  ts: number
  /** In-flight promise, so concurrent callers dedupe on the same fetch. */
  inflight?: Promise<void>
}

/**
 * Module-scope cache. Keyed by "chainId|tokenIn|tokenOut|amountIn".
 *
 * Design: stale-while-revalidate. We expose an existing entry immediately
 * (even if expired), then kick off a background refresh that updates the
 * cache and notifies subscribers. This mirrors what the KyberSwap widget
 * does via TanStack Query — it's what makes flipping directions or
 * re-typing the same amount feel instant.
 */
const quoteCache = new Map<string, CacheEntry>()
const subscribers = new Map<string, Set<() => void>>()
/** 10s freshness window. Within this, we don't re-fire the network call. */
const FRESH_TTL_MS = 10_000
/** 2-minute cap for stale cache reuse. */
const MAX_STALE_MS = 120_000

function cacheKey(
  chainId: number,
  tokenIn: string,
  tokenOut: string,
  amount: string
): string {
  return `${chainId}|${norm(tokenIn)}|${norm(tokenOut)}|${amount}`
}

function notify(key: string): void {
  const subs = subscribers.get(key)
  if (!subs) return
  for (const fn of subs) fn()
}

function subscribe(key: string, fn: () => void): () => void {
  let subs = subscribers.get(key)
  if (!subs) {
    subs = new Set()
    subscribers.set(key, subs)
  }
  subs.add(fn)
  return () => {
    subs!.delete(fn)
    if (subs!.size === 0) subscribers.delete(key)
  }
}

interface FetchArgs {
  chainId: number
  chainName: string
  expectedRouter: string
  tokenInAddr: string
  tokenInIsNative: boolean
  tokenOutAddr: string
  tokenOutIsNative: boolean
  amountInRaw: bigint
}

async function doFetch(args: FetchArgs): Promise<CacheEntry> {
  const {
    chainName,
    expectedRouter,
    tokenInAddr,
    tokenInIsNative,
    tokenOutAddr,
    tokenOutIsNative,
    amountInRaw,
  } = args
  const amountKey = amountInRaw.toString()
  try {
    const url =
      `${KYBER_API_BASE}/${chainName}/api/v1/routes` +
      `?tokenIn=${apiTokenAddr(tokenInAddr, tokenInIsNative)}` +
      `&tokenOut=${apiTokenAddr(tokenOutAddr, tokenOutIsNative)}` +
      `&amountIn=${amountKey}` +
      `&saveGas=0&gasInclude=1`
    const res = await fetch(url, {
      headers: { 'x-client-id': KYBER_CLIENT_ID },
    })
    if (!res.ok) throw new Error(`Kyber API ${res.status}`)
    const json = (await res.json()) as {
      code?: number
      message?: string
      data?: { routeSummary: KyberRouteSummary; routerAddress: string }
    }
    if (json.code !== 0 || !json.data) {
      throw new Error(json.message ?? 'No route')
    }
    const { routeSummary, routerAddress } = json.data

    // ── Defense-in-depth response validation ──
    if (norm(routerAddress) !== norm(expectedRouter)) {
      throw new KyberQuoteError('Router address mismatch — refusing quote')
    }
    const requestedIn = apiTokenAddr(tokenInAddr, tokenInIsNative)
    const requestedOut = apiTokenAddr(tokenOutAddr, tokenOutIsNative)
    if (norm(routeSummary.tokenIn) !== norm(requestedIn)) {
      throw new KyberQuoteError('Quote tokenIn mismatch')
    }
    if (norm(routeSummary.tokenOut) !== norm(requestedOut)) {
      throw new KyberQuoteError('Quote tokenOut mismatch')
    }
    if (routeSummary.amountIn !== amountKey) {
      throw new KyberQuoteError('Quote amountIn mismatch')
    }
    if (!routeSummary.amountOut || routeSummary.amountOut === '0') {
      throw new KyberQuoteError('Quote amountOut is zero')
    }

    return {
      quote: { routeSummary, routerAddress },
      error: null,
      ts: Date.now(),
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      // Caller cancelled — leave cache untouched.
      return { quote: null, error: null, ts: Date.now() }
    }
    return {
      quote: null,
      error: (e as Error).message ?? 'Quote failed',
      ts: Date.now(),
    }
  }
}

/**
 * Quote a swap via KyberSwap aggregator with SWR caching.
 *
 * Perf playbook (matches what @kyberswap/widgets does internally):
 *   1. Hit the module cache first. If fresh (≤10s) serve and skip network.
 *      If stale but within MAX_STALE_MS, serve stale AND revalidate.
 *   2. Debounce new signatures so rapid typing doesn't thrash the API.
 *   3. Keep the previous resolved quote visible while the next one loads —
 *      callers see a `loading` flag but the `quote` object doesn't flicker
 *      to null. Looks identical to the widget's "refreshing" affordance.
 *   4. Auto-refresh every `refreshMs` to keep prices live without user input.
 */
export function useKyberQuote(params: UseKyberQuoteParams): {
  quote: KyberQuote | null
  loading: boolean
  /** True when the displayed quote is from cache and older than FRESH_TTL_MS. */
  stale: boolean
  error: string | null
} {
  const {
    chainId,
    tokenInAddr,
    tokenInIsNative,
    tokenOutAddr,
    tokenOutIsNative,
    amountInRaw,
    debounceMs = 200,
    refreshMs = 20_000,
  } = params

  const chainName = useMemo(() => getKyberChainName(chainId), [chainId])
  const expectedRouter = useMemo(() => getKyberRouter(chainId), [chainId])

  const tokenInKey = tokenInIsNative ? KYBER_NATIVE_ADDR : tokenInAddr
  const tokenOutKey = tokenOutIsNative ? KYBER_NATIVE_ADDR : tokenOutAddr
  const amountKey = amountInRaw.toString()

  const keyValid =
    !!chainName &&
    !!expectedRouter &&
    !!tokenInKey &&
    !!tokenOutKey &&
    amountInRaw > 0n &&
    norm(tokenInKey) !== norm(tokenOutKey)

  const cKey = keyValid
    ? cacheKey(chainId, tokenInKey, tokenOutKey, amountKey)
    : null

  const [, forceRender] = useState(0)
  const [loading, setLoading] = useState(false)
  // Keep a handle to the most recently displayed quote so the previous quote
  // stays on-screen while a new signature is being fetched. This is what
  // makes direction-flip and "change amount by 1" feel instant: UI never
  // flashes to empty between an old quote and a new one.
  const lastShownRef = useRef<KyberQuote | null>(null)
  const lastShownKeyRef = useRef<string | null>(null)

  // Subscribe to cache updates for the current key.
  useEffect(() => {
    if (!cKey) return
    return subscribe(cKey, () => forceRender((n) => n + 1))
  }, [cKey])

  // Debounced fetch scheduler.
  useEffect(() => {
    if (!cKey || !chainName || !expectedRouter) {
      setLoading(false)
      return
    }

    const entry = quoteCache.get(cKey)
    const now = Date.now()
    const fresh = entry && now - entry.ts < FRESH_TTL_MS
    if (fresh) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      if (cancelled) return
      void (async () => {
        const existing = quoteCache.get(cKey)
        if (existing?.inflight) {
          try {
            await existing.inflight
          } catch {
            // swallowed; caller notified via cache entry
          }
          if (!cancelled) setLoading(false)
          return
        }
        const p = (async () => {
          const result = await doFetch({
            chainId,
            chainName,
            expectedRouter,
            tokenInAddr,
            tokenInIsNative,
            tokenOutAddr,
            tokenOutIsNative,
            amountInRaw,
          })
          // Preserve the inflight reference so concurrent hooks can await it,
          // then clear once written.
          quoteCache.set(cKey, result)
          notify(cKey)
        })()
        quoteCache.set(cKey, { ...(existing ?? emptyEntry()), inflight: p })
        try {
          await p
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, debounceMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // `amountKey` is the string form of `amountInRaw` used as cache key, so
    // it's the correct dep — `amountInRaw` itself (bigint) is omitted to
    // avoid duplicate invalidations when only its formatted representation
    // changed.
  }, [
    cKey,
    chainName,
    expectedRouter,
    tokenInAddr,
    tokenInIsNative,
    tokenOutAddr,
    tokenOutIsNative,
    amountKey,
    debounceMs,
  ])

  // Periodic refresh to keep the quote live (Kyber does this via TanStack
  // Query's `refetchInterval`). Skipped while there's no active signature.
  useEffect(() => {
    if (!cKey || !chainName || !expectedRouter || refreshMs <= 0) return
    const id = window.setInterval(() => {
      const entry = quoteCache.get(cKey)
      if (!entry || entry.inflight) return
      if (Date.now() - entry.ts < FRESH_TTL_MS) return
      void (async () => {
        const p = (async () => {
          const result = await doFetch({
            chainId,
            chainName,
            expectedRouter,
            tokenInAddr,
            tokenInIsNative,
            tokenOutAddr,
            tokenOutIsNative,
            amountInRaw,
          })
          quoteCache.set(cKey, result)
          notify(cKey)
        })()
        quoteCache.set(cKey, { ...entry, inflight: p })
      })()
    }, refreshMs)
    return () => window.clearInterval(id)
    // Same dep-array shape as the debounced fetch above: `amountKey` stands
    // in for `amountInRaw`.
  }, [
    cKey,
    chainName,
    expectedRouter,
    tokenInAddr,
    tokenInIsNative,
    tokenOutAddr,
    tokenOutIsNative,
    amountKey,
    refreshMs,
  ])

  // Derive what to show. If the cache has a hit, surface it. If the cache
  // misses but we have a last-displayed quote from a sibling signature
  // (e.g. user typed "1" then "1.5"), keep showing it so the panel doesn't
  // flash empty.
  const entry = cKey ? quoteCache.get(cKey) : null
  let displayQuote: KyberQuote | null = null
  let displayError: string | null = null
  let stale = false
  if (entry) {
    if (entry.quote && Date.now() - entry.ts < MAX_STALE_MS) {
      displayQuote = entry.quote
      stale = Date.now() - entry.ts >= FRESH_TTL_MS
    } else if (entry.error) {
      displayError = entry.error
    }
  }
  if (!displayQuote && lastShownRef.current && lastShownKeyRef.current) {
    displayQuote = lastShownRef.current
    stale = true
  }
  if (displayQuote) {
    lastShownRef.current = displayQuote
    lastShownKeyRef.current = cKey
  }
  if (!keyValid) {
    lastShownRef.current = null
    lastShownKeyRef.current = null
    displayQuote = null
    displayError = null
  }

  return {
    quote: displayQuote,
    loading,
    stale,
    error: displayError,
  }
}

function emptyEntry(): CacheEntry {
  return { quote: null, error: null, ts: 0 }
}

interface BuildArgs {
  chainId: number
  routeSummary: KyberRouteSummary
  sender: string
  recipient: string
  /** Slippage tolerance in basis points. 50 = 0.5%, 5000 = 50%. */
  slippageBps: number
  /** Seconds from now until the quote expires. */
  deadlineSecs: number
}

export interface KyberBuildResult {
  routerAddress: string
  data: string
  amountIn: string
  amountOut: string
  gas?: string
}

/**
 * Ask Kyber to build calldata for the picked route. The response is validated
 * against the hardcoded router and the original quote — any mismatch throws
 * before we hand bytes to the signer.
 */
export async function buildKyberSwap(
  args: BuildArgs
): Promise<KyberBuildResult> {
  const chainName = getKyberChainName(args.chainId)
  const expectedRouter = getKyberRouter(args.chainId)
  if (!chainName || !expectedRouter) {
    throw new KyberQuoteError('Kyber not supported on this chain')
  }
  const url = `${KYBER_API_BASE}/${chainName}/api/v1/route/build`
  const body = {
    routeSummary: args.routeSummary,
    sender: args.sender,
    recipient: args.recipient,
    slippageTolerance: args.slippageBps,
    deadline: Math.floor(Date.now() / 1000) + args.deadlineSecs,
    source: KYBER_CLIENT_ID,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-client-id': KYBER_CLIENT_ID,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new KyberQuoteError(`Build failed: ${res.status}`)
  const json = (await res.json()) as {
    code?: number
    message?: string
    data?: KyberBuildResult
  }
  if (json.code !== 0 || !json.data) {
    throw new KyberQuoteError(json.message ?? 'Build failed')
  }
  if (norm(json.data.routerAddress) !== norm(expectedRouter)) {
    throw new KyberQuoteError('Build router mismatch — refusing transaction')
  }
  if (json.data.amountIn !== args.routeSummary.amountIn) {
    throw new KyberQuoteError('Build amountIn mismatch')
  }
  if (!json.data.data || !json.data.data.startsWith('0x')) {
    throw new KyberQuoteError('Build returned no calldata')
  }
  // ── Calldata sanity check ──
  // The KyberSwap router encodes the recipient (dstReceiver) inside the
  // calldata. We can't fully decode the SwapDescriptionV2 struct here, but we
  // can require that the sender's address appears as a substring of the
  // calldata bytes. With sender === recipient (our normal case) the address
  // is encoded at least twice; we require ≥1 to keep the check robust against
  // future router layouts. If neither sender nor recipient appear in the
  // calldata, the API has almost certainly returned bytes that would route
  // tokens away from the user — refuse to sign.
  const senderHex = args.sender.toLowerCase().replace(/^0x/, '')
  const recipientHex = args.recipient.toLowerCase().replace(/^0x/, '')
  const dataLower = json.data.data.toLowerCase()
  if (!dataLower.includes(senderHex) && !dataLower.includes(recipientHex)) {
    throw new KyberQuoteError(
      'Build calldata does not reference signer — refusing transaction'
    )
  }
  return json.data
}
