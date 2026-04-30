import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import {
  FEW_ROUTER_ABI,
  getRingV2Router,
  isRingV2Supported,
} from '../ringV2Constants'
import {
  discoverFewV2Paths,
  quoteOnPaths,
  type CandidatePath,
  type QuoteResult as FewQuoteResult,
} from '../ringV2Quote'
import { getFewFactory } from '../fewWrappedResolver'
import type { SwapTokenOption } from '../useRingV2Tokens'
import type {
  BuildCtx,
  BuiltTx,
  InfoRowSpec,
  NormalizedQuote,
  QuoteArgs,
  QuoteResult,
  SwapEngine,
} from './types'

const QUOTE_DEBOUNCE_MS = 250

interface RingV2Raw {
  result: FewQuoteResult
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

const short = (a: string): string =>
  a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a

const pathToLabels = (
  path: string[],
  options: SwapTokenOption[],
  fromToken: SwapTokenOption,
  toToken: SwapTokenOption
): string => {
  const lookup = new Map<string, string>()
  for (const o of options) {
    if (!o.isNative) lookup.set(o.address.toLowerCase(), o.symbol)
  }
  return path
    .map((addr, idx) => {
      if (idx === 0) return fromToken.symbol
      if (idx === path.length - 1) return toToken.symbol
      return lookup.get(addr.toLowerCase()) ?? short(addr)
    })
    .join(' → ')
}

/**
 * Ring V2 on-chain swap engine.
 *
 * The 3-phase lifecycle (chain prefetch → path discovery → debounced quote)
 * lives entirely inside `useQuote`. Callers just get a `{ quote, loading,
 * error }` tuple indistinguishable from the Kyber engine.
 *
 * Unlike Kyber, there's no centralized pricing API feeding us USD values —
 * all `*Usd` fields in the NormalizedQuote are null, which the shared panel
 * handles by skipping those rows.
 */
export const ringV2Engine: SwapEngine = {
  id: 'ringv2',
  badge: 'FewV2',
  // Ring V2 only routes through FewV2 pools. Showing the full Kyber
  // whitelist would surface tokens with no FewV2 coverage — most picks
  // would 404 into "No route". Keep the picker to wallet + common bases.
  includeKyberTokenList: false,
  includeRingTokenList: true,

  supports(chainId) {
    return isRingV2Supported(chainId)
  },

  getRouter(chainId) {
    return getRingV2Router(chainId)
  },

  useQuote(args: QuoteArgs): QuoteResult {
    const { chainId, tokenIn, tokenOut, amountInRaw, rpcUrl, signerAddress } =
      args
    const router = getRingV2Router(chainId)

    const provider = useMemo(
      () =>
        new ethers.JsonRpcProvider(rpcUrl, chainId, {
          staticNetwork: ethers.Network.from(chainId),
        }),
      [rpcUrl, chainId]
    )

    const [weth, setWeth] = useState<string | null>(null)
    const [fewFactory, setFewFactory] = useState<string | null>(null)
    const [paths, setPaths] = useState<CandidatePath[] | null>(null)
    const [pathsError, setPathsError] = useState<string | null>(null)
    const [result, setResult] = useState<FewQuoteResult | null>(null)
    const [matchedAmountIn, setMatchedAmountIn] = useState<bigint>(0n)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Effect A — chain prefetch. Warm up WETH + fewFactory once per chain so
    // the first quote doesn't pay for both round-trips.
    useEffect(() => {
      setWeth(null)
      setFewFactory(null)
      if (!router) return
      let cancelled = false
      ;(async () => {
        try {
          const c = new ethers.Contract(router, FEW_ROUTER_ABI, provider)
          const [w, f] = await Promise.all([
            c.WETH() as Promise<string>,
            getFewFactory(provider, chainId, router),
          ])
          if (cancelled) return
          setWeth(w)
          setFewFactory(f)
        } catch {
          // Swallow — effect B will surface the error via pathsError.
        }
      })()
      return () => {
        cancelled = true
      }
    }, [chainId, provider, router])

    // Effect B — path discovery. Only re-runs when the token pair changes.
    // Wrapped-token lookups are the slowest part on a cold cache, so
    // isolating them from amount changes keeps typing snappy.
    const fromKey = tokenIn
      ? tokenIn.isNative
        ? 'NATIVE'
        : tokenIn.address.toLowerCase()
      : ''
    const toKey = tokenOut
      ? tokenOut.isNative
        ? 'NATIVE'
        : tokenOut.address.toLowerCase()
      : ''
    useEffect(() => {
      setPaths(null)
      setPathsError(null)
      if (!router || !tokenIn || !tokenOut || !weth || !fewFactory) return
      const tokenInRaw = tokenIn.isNative ? weth : tokenIn.address
      const tokenOutRaw = tokenOut.isNative ? weth : tokenOut.address
      if (tokenInRaw.toLowerCase() === tokenOutRaw.toLowerCase()) {
        setPaths([])
        return
      }
      let cancelled = false
      ;(async () => {
        try {
          const p = await discoverFewV2Paths({
            provider,
            fewFactory,
            chainId,
            tokenIn: tokenInRaw,
            tokenOut: tokenOutRaw,
            weth,
          })
          if (!cancelled) setPaths(p)
        } catch (e) {
          if (!cancelled) {
            setPaths([])
            setPathsError((e as Error).message || 'Path discovery failed')
          }
        }
      })()
      return () => {
        cancelled = true
      }
      // fromKey/toKey are the stable identity signature for a token pair —
      // using them instead of the token objects themselves avoids re-running
      // discovery when only the `balance` field flipped (which happens on
      // every wallet sync and would cause useless thrash). tokenIn/tokenOut
      // are intentionally omitted from the dep array for the same reason.
    }, [chainId, fewFactory, fromKey, toKey, provider, router, weth])

    // Effect C — debounced quote. Only `getAmountsOut` runs on amount
    // changes, and it's debounced so typing "1.5" doesn't fire three
    // network round-trips.
    const debouncedAmount = useDebouncedValue(amountInRaw, QUOTE_DEBOUNCE_MS)
    useEffect(() => {
      if (!router || !paths || debouncedAmount <= 0n || !signerAddress) {
        setResult(null)
        setError(null)
        setLoading(false)
        return
      }
      if (paths.length === 0) {
        setResult(null)
        setError(pathsError ?? 'No FewV2 route found')
        setLoading(false)
        return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      ;(async () => {
        try {
          const r = await quoteOnPaths({
            provider,
            router,
            paths,
            amountIn: debouncedAmount,
          })
          if (cancelled) return
          if (!r) {
            setResult(null)
            setError('No FewV2 route found')
          } else {
            setResult(r)
            setMatchedAmountIn(debouncedAmount)
          }
        } catch (e) {
          if (!cancelled) {
            setResult(null)
            const raw = (e as Error).message ?? ''
            setError(
              /missing revert data|CALL_EXCEPTION/.test(raw)
                ? 'Ring V2 not deployed on this chain'
                : raw || 'Quote failed'
            )
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [paths, pathsError, debouncedAmount, provider, router, signerAddress])

    // A fresh `amountInRaw` that hasn't flowed through the debounce window
    // yet is effectively "loading" — we don't want the user seeing the old
    // quote's Review button when their input has already changed.
    const pendingDebounce = amountInRaw > 0n && amountInRaw !== debouncedAmount
    const showLoading = loading || pendingDebounce
    const resultMatches =
      !!result && matchedAmountIn === amountInRaw && amountInRaw > 0n

    const quote: NormalizedQuote | null = resultMatches
      ? {
          amountIn: amountInRaw,
          amountOut: result!.amountOut,
          amountInUsd: null,
          amountOutUsd: null,
          gasUsd: null,
          raw: { result: result! } satisfies RingV2Raw,
        }
      : null

    return {
      quote,
      loading: showLoading,
      // Ring V2 has no SWR-style cache, so no "stale" state to surface.
      stale: false,
      error,
    }
  },

  async buildTx(ctx: BuildCtx): Promise<BuiltTx> {
    const {
      quote,
      fromToken,
      toToken,
      amountIn,
      sender,
      slippageBps,
      deadlineSecs,
      chainId,
    } = ctx
    const router = getRingV2Router(chainId)
    if (!router) throw new Error('Ring V2 not supported on this chain')
    const raw = quote.raw as RingV2Raw

    // Stale-quote guard: if the quote's input no longer matches the
    // currently-selected amount the caller passed, refuse rather than sign
    // with stale slippage protection.
    if (quote.amountIn !== amountIn) {
      throw new Error('Quote is stale — wait for refresh')
    }

    const BPS_DENOM = 10_000n
    const minOut =
      (raw.result.amountOut * (BPS_DENOM - BigInt(slippageBps))) / BPS_DENOM
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSecs)
    const iface = new ethers.Interface(FEW_ROUTER_ABI)

    let data: string
    let value = '0x0'
    if (fromToken.isNative) {
      data = iface.encodeFunctionData('swapExactETHForTokens', [
        minOut,
        raw.result.wrappedPath,
        sender,
        deadline,
      ])
      value = '0x' + amountIn.toString(16)
    } else if (toToken.isNative) {
      data = iface.encodeFunctionData('swapExactTokensForETH', [
        amountIn,
        minOut,
        raw.result.wrappedPath,
        sender,
        deadline,
      ])
    } else {
      data = iface.encodeFunctionData('swapExactTokensForTokens', [
        amountIn,
        minOut,
        raw.result.wrappedPath,
        sender,
        deadline,
      ])
    }
    return { to: router, data, value, amountOut: minOut }
  },

  extraInfoRows({ quote, fromToken, toToken, tokenOptions }): InfoRowSpec[] {
    const raw = quote.raw as RingV2Raw
    const routeText = pathToLabels(
      raw.result.underlyingPath,
      tokenOptions,
      fromToken,
      toToken
    )
    if (!routeText) return []
    return [
      {
        key: 'ringv2-route',
        labelKey: 'swapRoute',
        value: routeText,
        mono: true,
      },
    ]
  },
}
