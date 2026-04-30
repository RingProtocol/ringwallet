import type { ReactNode } from 'react'
import type { SwapSigner } from '@ring-protocol/ring-swap-sdk'
import type { SwapTokenOption } from '../useRingV2Tokens'
import type { MessageKey } from '../../../i18n'

/**
 * Uniform quote shape that the shared SwapPanel consumes, regardless of which
 * backend produced it. The `raw` field holds engine-specific payload that
 * gets passed back to `buildTx` unchanged — engines stash whatever they need
 * (route summary, wrapped path, etc.) here.
 */
export interface NormalizedQuote {
  amountIn: bigint
  amountOut: bigint
  /** USD value of amountIn. `null` when the engine doesn't expose pricing. */
  amountInUsd: number | null
  amountOutUsd: number | null
  /** Network fee estimate in USD. `null` when unknown. */
  gasUsd: number | null
  /** Opaque engine payload, threaded back to buildTx verbatim. */
  raw: unknown
}

export interface QuoteArgs {
  chainId: number
  tokenIn: SwapTokenOption | null
  tokenOut: SwapTokenOption | null
  amountInRaw: bigint
  rpcUrl: string
  /** Who will ultimately sign — some engines want this for quote ownership. */
  signerAddress: string
}

export interface QuoteResult {
  quote: NormalizedQuote | null
  loading: boolean
  /** True when displayed data is cached and older than the freshness window. */
  stale: boolean
  error: string | null
}

export interface BuildCtx {
  chainId: number
  quote: NormalizedQuote
  fromToken: SwapTokenOption
  toToken: SwapTokenOption
  amountIn: bigint
  sender: string
  recipient: string
  /** Slippage tolerance in basis points. 50 = 0.5%. */
  slippageBps: number
  /** Seconds from now until the transaction expires. */
  deadlineSecs: number
  rpcUrl: string
  signer: SwapSigner
}

export interface BuiltTx {
  to: string
  data: string
  value: string
  /** The contract-level minOut the engine committed to, for defense-in-depth. */
  amountOut: bigint
}

export interface InfoRowSpec {
  key: string
  labelKey: MessageKey
  value: ReactNode
  mono?: boolean
}

/**
 * Pluggable swap backend. Each engine is a thin data adapter — all UI state
 * (token pickers, settings, approve flow, CTA button) lives in the shared
 * SwapPanel. Engines supply: quote source, calldata builder, and any engine-
 * specific info rows (e.g. Ring V2's "Route" path visualization).
 */
export interface SwapEngine {
  readonly id: string
  /** Label shown in the top-left corner pill of the panel. */
  readonly badge: string
  supports(chainId: number): boolean
  getRouter(chainId: number): string | null
  /**
   * When true, the full Kyber whitelisted token list is merged into the
   * picker options. Engines that can route any ERC-20 (Kyber, 1inch) set
   * this to true; engines with limited pool coverage (Ring V2) set it to
   * false so users don't see tokens with no route.
   */
  readonly includeKyberTokenList: boolean
  /**
   * When true, the Ring Protocol token list (per-chain static JSON) is
   * merged into the picker options. Engines backed by FewV2 pools set this
   * to true so the picker shows tokens with known liquidity.
   */
  readonly includeRingTokenList: boolean
  /** React hook producing a debounced/cached quote. Must tolerate null tokens. */
  useQuote(args: QuoteArgs): QuoteResult
  /** Build calldata. Called only with a non-null quote from useQuote. */
  buildTx(ctx: BuildCtx): Promise<BuiltTx>
  /** Optional engine-specific info rows (e.g. Ring V2 route path). */
  extraInfoRows?(args: {
    quote: NormalizedQuote
    fromToken: SwapTokenOption
    toToken: SwapTokenOption
    tokenOptions: SwapTokenOption[]
  }): InfoRowSpec[]
}
