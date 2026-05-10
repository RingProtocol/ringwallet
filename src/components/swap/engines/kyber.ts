import {
  useKyberQuote,
  buildKyberSwap,
  type KyberRouteSummary,
} from '../useKyberQuote'
import {
  KYBER_NATIVE_ADDR,
  getKyberRouter,
  isKyberAggregatorSupported,
} from '../kyberConstants'
import type {
  BuildCtx,
  BuiltTx,
  QuoteArgs,
  QuoteResult,
  SwapEngine,
} from './types'

interface KyberRaw {
  routeSummary: KyberRouteSummary
  routerAddress: string
}

const toNum = (s?: string): number | null => {
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export const kyberEngine: SwapEngine = {
  id: 'kyber',
  badge: 'Aggregator',
  includeKyberTokenList: true,
  includeRingTokenList: false,

  supports(chainId) {
    return isKyberAggregatorSupported(chainId)
  },

  getRouter(chainId) {
    return getKyberRouter(chainId)
  },

  useQuote(args: QuoteArgs): QuoteResult {
    const { quote, loading, stale, error } = useKyberQuote({
      chainId: args.chainId,
      tokenInAddr: args.tokenIn?.address ?? '',
      tokenInIsNative: args.tokenIn?.isNative ?? false,
      tokenOutAddr: args.tokenOut?.address ?? '',
      tokenOutIsNative: args.tokenOut?.isNative ?? false,
      amountInRaw: args.amountInRaw,
    })
    if (!quote) return { quote: null, loading, stale, error }
    const rs = quote.routeSummary
    return {
      quote: {
        amountIn: BigInt(rs.amountIn),
        amountOut: BigInt(rs.amountOut),
        amountInUsd: toNum(rs.amountInUsd),
        amountOutUsd: toNum(rs.amountOutUsd),
        gasUsd: toNum(rs.gasUsd),
        raw: {
          routeSummary: rs,
          routerAddress: quote.routerAddress,
        } satisfies KyberRaw,
      },
      loading,
      stale,
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
      recipient,
      slippageBps,
      deadlineSecs,
      chainId,
    } = ctx
    const raw = quote.raw as KyberRaw

    // ── Defense-in-depth: refuse to build when the cached quote no longer
    // matches the currently-selected inputs. The cache may still be serving
    // a quote from before the user flipped direction or edited the amount. ──
    if (raw.routeSummary.amountIn !== amountIn.toString()) {
      throw new Error('Quote is stale — re-fetch before swapping')
    }
    const expectedIn = fromToken.isNative
      ? KYBER_NATIVE_ADDR
      : fromToken.address.toLowerCase()
    const expectedOut = toToken.isNative
      ? KYBER_NATIVE_ADDR
      : toToken.address.toLowerCase()
    if (raw.routeSummary.tokenIn.toLowerCase() !== expectedIn) {
      throw new Error('Quote tokenIn no longer matches selection')
    }
    if (raw.routeSummary.tokenOut.toLowerCase() !== expectedOut) {
      throw new Error('Quote tokenOut no longer matches selection')
    }

    const built = await buildKyberSwap({
      chainId,
      routeSummary: raw.routeSummary,
      sender,
      recipient,
      slippageBps,
      deadlineSecs,
    })
    return {
      to: built.routerAddress,
      data: built.data,
      value: fromToken.isNative ? '0x' + amountIn.toString(16) : '0x0',
      amountOut: BigInt(built.amountOut),
    }
  },
}
