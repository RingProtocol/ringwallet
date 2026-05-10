import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import type { SwapSigner } from '@ring-protocol/ring-swap-sdk'
import {
  ERC20_ABI,
  NATIVE_PSEUDO_ADDRESS,
  getCommonBases,
  getNativeSymbol,
} from './ringV2Constants'
import { useKyberTokenList } from './useKyberTokenList'
import { useRingV2TokenList } from './useRingV2TokenList'
import { useRingV2Tokens, type SwapTokenOption } from './useRingV2Tokens'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../i18n'
import SwapField, { keyOfToken } from './SwapField'
import TokenPickerModal from './TokenPickerModal'
import InfoRow from './InfoRow'
import type { SwapEngine } from './engines/types'

const DEFAULT_SLIPPAGE_PCT = 0.5
const DEFAULT_DEADLINE_MIN = 20
const BPS_DENOM = 10_000n

interface Props {
  engine: SwapEngine
  signer: SwapSigner
  chainId: number
  rpcUrl: string
}

/**
 * Shared swap UI. All state (token selection, amount, settings, picker,
 * approve/swap flow) lives here; the `engine` prop supplies the backend-
 * specific quote source + calldata builder + optional info rows.
 */
const SwapPanel: React.FC<Props> = ({ engine, signer, chainId, rpcUrl }) => {
  const { t } = useI18n()
  const { activeChain } = useAuth()
  const router = engine.getRouter(chainId)

  const provider = useMemo(() => new ethers.JsonRpcProvider(rpcUrl), [rpcUrl])

  const { tokens: walletTokens } = useRingV2Tokens(activeChain)
  const {
    tokens: kyberTokens,
    nativeLogo,
    logoIndex,
    loading: kyberLoading,
  } = useKyberTokenList(chainId)
  const { tokens: ringListTokens, loading: ringListLoading } =
    useRingV2TokenList(chainId)

  const nativeOption = useMemo<SwapTokenOption>(
    () => ({
      address: NATIVE_PSEUDO_ADDRESS,
      symbol: getNativeSymbol(chainId),
      decimals: 18,
      balance: 0n,
      isNative: true,
      logo: nativeLogo,
    }),
    [chainId, nativeLogo]
  )

  const enrichLogo = useCallback(
    (tok: SwapTokenOption): SwapTokenOption => {
      if (tok.logo) return tok
      if (tok.isNative) return nativeLogo ? { ...tok, logo: nativeLogo } : tok
      const hit = logoIndex.get(tok.address.toLowerCase())
      return hit ? { ...tok, logo: hit } : tok
    },
    [logoIndex, nativeLogo]
  )

  const [customExtras, setCustomExtras] = useState<SwapTokenOption[]>([])
  const [pickerSide, setPickerSide] = useState<'from' | 'to' | null>(null)

  const allOptions = useMemo<SwapTokenOption[]>(() => {
    const out: SwapTokenOption[] = []
    const seen = new Set<string>()
    const push = (tok: SwapTokenOption) => {
      const key = tok.isNative
        ? NATIVE_PSEUDO_ADDRESS
        : tok.address.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      out.push(enrichLogo(tok))
    }

    const nativeFromWallet = walletTokens.find((tok) => tok.isNative)
    if (nativeFromWallet) push(nativeFromWallet)
    else push(nativeOption)

    for (const tok of walletTokens) {
      if (tok.isNative) continue
      push(tok)
    }
    for (const base of getCommonBases(chainId)) {
      push({
        address: base.address,
        symbol: base.symbol,
        decimals: base.decimals,
        balance: 0n,
        isNative: false,
        logo: null,
      })
    }
    if (engine.includeRingTokenList) {
      for (const tok of ringListTokens) push(tok)
    }
    if (engine.includeKyberTokenList) {
      for (const tok of kyberTokens) push(tok)
    }
    for (const c of customExtras) push(c)
    return out
  }, [
    walletTokens,
    kyberTokens,
    ringListTokens,
    customExtras,
    chainId,
    nativeOption,
    engine.includeRingTokenList,
    engine.includeKyberTokenList,
    enrichLogo,
  ])

  const [fromKey, setFromKey] = useState<string>(NATIVE_PSEUDO_ADDRESS)
  const [toKey, setToKey] = useState<string>('')
  const [amountIn, setAmountIn] = useState('')
  const [allowance, setAllowance] = useState<bigint>(0n)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [slippagePct, setSlippagePct] = useState<string>(
    String(DEFAULT_SLIPPAGE_PCT)
  )
  const [deadlineMin, setDeadlineMin] = useState<string>(
    String(DEFAULT_DEADLINE_MIN)
  )

  // Settle the token selection once the option list shows up (or when
  // switching chains wipes the previous choice).
  useEffect(() => {
    if (allOptions.length === 0) return
    if (!allOptions.some((o) => keyOfToken(o) === fromKey)) {
      setFromKey(keyOfToken(allOptions[0]))
    }
    if (!toKey || !allOptions.some((o) => keyOfToken(o) === toKey)) {
      const fallback = allOptions.find((o) => keyOfToken(o) !== fromKey)
      if (fallback) setToKey(keyOfToken(fallback))
    }
  }, [allOptions, fromKey, toKey])

  const fromToken = useMemo(
    () => allOptions.find((o) => keyOfToken(o) === fromKey) ?? null,
    [allOptions, fromKey]
  )
  const toToken = useMemo(
    () => allOptions.find((o) => keyOfToken(o) === toKey) ?? null,
    [allOptions, toKey]
  )

  const requiredAmount = useMemo(() => {
    if (!fromToken || !amountIn) return 0n
    try {
      return ethers.parseUnits(amountIn, fromToken.decimals)
    } catch {
      return 0n
    }
  }, [amountIn, fromToken])

  const {
    quote,
    loading: quoteLoading,
    stale: quoteStale,
    error: quoteError,
  } = engine.useQuote({
    chainId,
    tokenIn: fromToken,
    tokenOut: toToken,
    amountInRaw: requiredAmount,
    rpcUrl,
    signerAddress: signer.address,
  })

  // Fetch allowance for the engine's router whenever fromToken changes. No
  // approval needed for native sends.
  useEffect(() => {
    if (!router || !fromToken || fromToken.isNative || !signer.address) {
      setAllowance(0n)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const c = new ethers.Contract(fromToken.address, ERC20_ABI, provider)
        const a = (await c.allowance(signer.address, router)) as bigint
        if (!cancelled) setAllowance(a)
      } catch {
        if (!cancelled) setAllowance(0n)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fromToken, provider, router, signer.address])

  const slippageBps = useMemo(() => {
    const v = Number.parseFloat(slippagePct)
    if (!Number.isFinite(v) || v < 0) return 50
    if (v > 50) return 5000
    return Math.round(v * 100)
  }, [slippagePct])

  const deadlineSecs = useMemo(() => {
    const v = Number.parseFloat(deadlineMin)
    if (!Number.isFinite(v) || v <= 0) return 1200
    if (v > 180) return 180 * 60
    return Math.round(v * 60)
  }, [deadlineMin])

  const minOut = useMemo(() => {
    if (!quote) return 0n
    return (quote.amountOut * (BPS_DENOM - BigInt(slippageBps))) / BPS_DENOM
  }, [quote, slippageBps])

  const needsApproval =
    !!fromToken &&
    !fromToken.isNative &&
    requiredAmount > 0n &&
    allowance < requiredAmount

  const insufficientBalance =
    !!fromToken && requiredAmount > 0n && fromToken.balance > 0n
      ? requiredAmount > fromToken.balance
      : !!fromToken && requiredAmount > 0n && fromToken.balance === 0n

  const setMax = useCallback(() => {
    if (!fromToken || fromToken.balance <= 0n) return
    let usable = fromToken.balance
    if (fromToken.isNative) {
      const reserve = ethers.parseUnits('0.001', fromToken.decimals)
      usable = usable > reserve ? usable - reserve : 0n
    }
    if (usable <= 0n) return
    setAmountIn(ethers.formatUnits(usable, fromToken.decimals))
  }, [fromToken])

  const setPercent = useCallback(
    (pct: number) => {
      if (!fromToken || fromToken.balance <= 0n) return
      const portion = (fromToken.balance * BigInt(pct)) / 100n
      let usable = portion
      if (fromToken.isNative) {
        const reserve = ethers.parseUnits('0.001', fromToken.decimals)
        usable = usable > reserve ? usable - reserve : 0n
      }
      if (usable <= 0n) return
      setAmountIn(ethers.formatUnits(usable, fromToken.decimals))
    },
    [fromToken]
  )

  const flip = useCallback(() => {
    if (!fromToken || !toToken) return
    setFromKey(keyOfToken(toToken))
    setToKey(keyOfToken(fromToken))
    setAmountIn('')
  }, [fromToken, toToken])

  const handleApprove = useCallback(async () => {
    if (!router || !fromToken || fromToken.isNative) return
    setBusy(true)
    setStatus('Sending approve…')
    try {
      const iface = new ethers.Interface(ERC20_ABI)
      const data = iface.encodeFunctionData('approve', [
        router,
        ethers.MaxUint256,
      ])
      const hash = await signer.sendTransaction({
        from: signer.address,
        to: fromToken.address,
        data,
        value: '0x0',
      })
      setStatus(`Approve sent: ${shortHash(hash)}`)
      setAllowance(ethers.MaxUint256)
    } catch (e) {
      setStatus(`Approve failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [fromToken, router, signer])

  const handleSwap = useCallback(async () => {
    if (!router || !fromToken || !toToken || !quote) return
    setBusy(true)
    setStatus('Building tx…')
    try {
      // Signer chain coherence: engines build calldata for a fixed chain;
      // if the wallet switched between quote and signature, refuse rather
      // than send tokens on the wrong chain.
      if (signer.chainId !== chainId) {
        throw new Error('Signer chain mismatch — refresh and try again')
      }
      const built = await engine.buildTx({
        chainId,
        quote,
        fromToken,
        toToken,
        amountIn: requiredAmount,
        sender: signer.address,
        recipient: signer.address,
        slippageBps,
        deadlineSecs,
        rpcUrl,
        signer,
      })
      // Defense in depth: the engine-reported minOut must not undercut the
      // panel's user-facing minOut. If it does, the engine's slippage math
      // disagrees with ours — refuse to sign.
      if (built.amountOut < minOut) {
        throw new Error(
          'Build amountOut below acceptable slippage — refusing transaction'
        )
      }
      const hash = await signer.sendTransaction({
        from: signer.address,
        to: built.to,
        data: built.data,
        value: built.value,
      })
      setStatus(`Swap submitted: ${shortHash(hash)}`)
      setAmountIn('')
    } catch (e) {
      setStatus(`Swap failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [
    chainId,
    deadlineSecs,
    engine,
    fromToken,
    minOut,
    quote,
    requiredAmount,
    router,
    rpcUrl,
    signer,
    slippageBps,
    toToken,
  ])

  const importAddress = useCallback(
    async (raw: string): Promise<SwapTokenOption | null> => {
      const trimmed = raw.trim()
      if (!ethers.isAddress(trimmed)) return null
      const c = new ethers.Contract(trimmed, ERC20_ABI, provider)
      const [sym, dec, bal] = await Promise.all([
        c.symbol() as Promise<string>,
        c.decimals() as Promise<number | bigint>,
        signer.address
          ? (c.balanceOf(signer.address) as Promise<bigint>)
          : Promise.resolve(0n),
      ])
      const checksum = ethers.getAddress(trimmed)
      const opt: SwapTokenOption = {
        address: checksum,
        symbol: sym,
        decimals: Number(dec),
        balance: bal,
        isNative: false,
        logo: logoIndex.get(checksum.toLowerCase()) ?? null,
      }
      setCustomExtras((prev) => {
        const filtered = prev.filter(
          (p) => p.address.toLowerCase() !== checksum.toLowerCase()
        )
        return [...filtered, opt]
      })
      return opt
    },
    [provider, signer.address, logoIndex]
  )

  // Early exit for unsupported chains — the dialog should already have
  // filtered these out, but a guard here keeps us honest.
  if (!router || !engine.supports(chainId)) {
    return (
      <div className="ring-v2-panel ring-v2-panel--unsupported">
        <p>{t('swapDisabledNonEvm')}</p>
      </div>
    )
  }

  const swapDisabled =
    busy ||
    !fromToken ||
    !toToken ||
    requiredAmount === 0n ||
    !quote ||
    needsApproval ||
    insufficientBalance

  const formattedQuote =
    quote && toToken
      ? trimDecimals(ethers.formatUnits(quote.amountOut, toToken.decimals))
      : ''
  const formattedMin =
    quote && toToken
      ? trimDecimals(ethers.formatUnits(minOut, toToken.decimals))
      : ''

  const rateText =
    quote && fromToken && toToken && requiredAmount > 0n
      ? (() => {
          const fromUnits = Number(
            ethers.formatUnits(quote.amountIn, fromToken.decimals)
          )
          const toUnits = Number(
            ethers.formatUnits(quote.amountOut, toToken.decimals)
          )
          if (!fromUnits || !toUnits) return null
          const rate = toUnits / fromUnits
          const rounded =
            rate >= 1
              ? rate.toLocaleString(undefined, { maximumFractionDigits: 4 })
              : rate.toPrecision(4)
          return `1 ${fromToken.symbol} ≈ ${rounded} ${toToken.symbol}`
        })()
      : null

  const usdInText = formatUsd(quote?.amountInUsd)
  const usdOutText = formatUsd(quote?.amountOutUsd)
  const gasUsdText = formatUsd(quote?.gasUsd, { maxDecimals: 4 })
  // Kyber's USD numbers are side-by-side market prices; the delta is the
  // user-facing "price impact". Negative means the trader gets *more* USD
  // than they sent (usually stable-stable rounding); positive means they
  // lose value — that's what we surface and colour-code.
  const priceImpactPct = (() => {
    const inUsd = quote?.amountInUsd ?? 0
    const outUsd = quote?.amountOutUsd ?? 0
    if (!inUsd || !outUsd) return null
    return ((inUsd - outUsd) / inUsd) * 100
  })()
  const priceImpactText =
    priceImpactPct == null
      ? null
      : `${priceImpactPct >= 0 ? '' : '+'}${Math.abs(priceImpactPct).toFixed(2)}%`
  const priceImpactSeverity: 'ok' | 'warn' | 'bad' =
    priceImpactPct == null
      ? 'ok'
      : priceImpactPct > 5
        ? 'bad'
        : priceImpactPct > 1.5
          ? 'warn'
          : 'ok'

  // First fetch = no prior quote + loading. For refreshes we keep the
  // previous quote on-screen so the layout doesn't flicker.
  const firstFetch = quoteLoading && !quote

  const engineExtraRows =
    quote && fromToken && toToken && engine.extraInfoRows
      ? engine.extraInfoRows({
          quote,
          fromToken,
          toToken,
          tokenOptions: allOptions,
        })
      : []

  const ctaLabel = busy
    ? t('swapStatusWorking')
    : insufficientBalance
      ? t('swapInsufficientBalance')
      : !fromToken || !toToken
        ? t('swapPickTokens')
        : requiredAmount === 0n
          ? t('swapEnterAmount')
          : firstFetch
            ? t('swapFetchingQuote')
            : !quote
              ? (quoteError ?? t('swapNoRoute'))
              : t('swapReview')

  return (
    <div className="ring-v2-panel">
      <div className="ring-v2-panel__topbar">
        <span className="ring-v2-panel__pill">{engine.badge}</span>
        <button
          type="button"
          className="ring-v2-panel__settings-toggle"
          onClick={() => setShowSettings((s) => !s)}
          aria-expanded={showSettings}
          aria-label={t('swapSettings')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="ring-v2-panel__settings">
          <div className="ring-v2-panel__settings-row">
            <span className="ring-v2-panel__setting-label">
              {t('swapSlippageLabel')}
            </span>
            <div className="ring-v2-panel__setting-presets">
              {['0.1', '0.5', '1.0'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`ring-v2-panel__preset ${slippagePct === p ? 'is-active' : ''}`}
                  onClick={() => setSlippagePct(p)}
                >
                  {p}%
                </button>
              ))}
              <input
                type="text"
                inputMode="decimal"
                value={slippagePct}
                onChange={(e) =>
                  setSlippagePct(e.target.value.replace(/[^0-9.]/g, ''))
                }
                className="ring-v2-panel__setting-input"
              />
            </div>
          </div>
          <div className="ring-v2-panel__settings-row">
            <span className="ring-v2-panel__setting-label">
              {t('swapDeadlineLabel')}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={deadlineMin}
              onChange={(e) =>
                setDeadlineMin(e.target.value.replace(/[^0-9.]/g, ''))
              }
              className="ring-v2-panel__setting-input ring-v2-panel__setting-input--inline"
            />
          </div>
        </div>
      )}

      <SwapField
        side={t('swapFrom')}
        token={fromToken}
        amount={amountIn}
        onAmount={(v) => setAmountIn(v.replace(/[^0-9.]/g, ''))}
        subtext={usdInText ? `≈ ${usdInText}` : undefined}
        showQuickPercents
        onPercent={setPercent}
        onMax={setMax}
        onPickToken={() => setPickerSide('from')}
      />

      <div className="ring-v2-panel__divider">
        <button
          type="button"
          className="ring-v2-panel__flip"
          onClick={flip}
          disabled={!toToken || busy}
          aria-label={t('swapFlip')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      <SwapField
        side={t('swapToEstimated')}
        token={toToken}
        amount={formattedQuote}
        skeleton={firstFetch}
        refreshing={quoteLoading && !!quote}
        subtext={usdOutText ? `≈ ${usdOutText}` : undefined}
        readOnly
        onPickToken={() => setPickerSide('to')}
      />

      <TokenPickerModal
        open={pickerSide !== null}
        onClose={() => setPickerSide(null)}
        options={allOptions}
        selectedKey={pickerSide === 'from' ? fromKey : toKey}
        onSelect={(key) => {
          if (pickerSide === 'from') setFromKey(key)
          else if (pickerSide === 'to') setToKey(key)
        }}
        loading={
          (kyberLoading && engine.includeKyberTokenList) ||
          (ringListLoading && engine.includeRingTokenList)
        }
        onImportAddress={importAddress}
      />

      {(quote || rateText) && !quoteError && (
        <div className="ring-v2-panel__info">
          {rateText && (
            <InfoRow
              label={t('swapRate')}
              value={
                <span className="ring-v2-info-value">
                  <span>{rateText}</span>
                  {quoteStale && quoteLoading && (
                    <span
                      className="ring-v2-info-refresh-dot"
                      aria-label={t('swapRefreshing')}
                      title={t('swapRefreshing')}
                    />
                  )}
                </span>
              }
              mono
            />
          )}
          {engineExtraRows.map((row) => (
            <InfoRow
              key={row.key}
              label={t(row.labelKey)}
              value={row.value}
              mono={row.mono}
            />
          ))}
          {priceImpactText && (
            <InfoRow
              label={t('swapPriceImpact')}
              value={
                <span
                  className={`ring-v2-info-impact ring-v2-info-impact--${priceImpactSeverity}`}
                >
                  {priceImpactText}
                </span>
              }
              mono
            />
          )}
          {gasUsdText && (
            <InfoRow label={t('swapNetworkFee')} value={gasUsdText} mono />
          )}
          <InfoRow
            label={t('swapSlippageLabel')}
            value={`${Number(slippagePct).toFixed(2)}%`}
          />
          {quote && toToken && (
            <InfoRow
              label={t('swapMinReceived')}
              value={`${formattedMin} ${toToken.symbol}`}
              mono
            />
          )}
          <InfoRow
            label={t('swapDeadlineLabel')}
            value={`${deadlineMin}m`}
            last
          />
        </div>
      )}

      {quoteError && <div className="ring-v2-panel__error">{quoteError}</div>}

      <div className="ring-v2-panel__actions">
        {needsApproval && (
          <button
            type="button"
            className="ring-v2-panel__btn ring-v2-panel__btn--secondary"
            onClick={handleApprove}
            disabled={busy}
          >
            {t('swapApprove').replace('{symbol}', fromToken?.symbol ?? '')}
          </button>
        )}
        <button
          type="button"
          className="ring-v2-panel__btn ring-v2-panel__btn--primary"
          onClick={handleSwap}
          disabled={swapDisabled}
        >
          {ctaLabel}
        </button>
      </div>

      {status && <div className="ring-v2-panel__status">{status}</div>}
    </div>
  )
}

const trimDecimals = (s: string): string => {
  if (!s.includes('.')) return s
  return s.replace(/\.?0+$/, '')
}

const shortHash = (h: string): string =>
  h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h

function formatUsd(
  raw: number | null | undefined,
  opts: { maxDecimals?: number } = {}
): string | null {
  if (raw == null) return null
  if (!Number.isFinite(raw) || raw <= 0) return null
  const maxDecimals = opts.maxDecimals ?? 2
  if (raw < 0.01) return '<$0.01'
  if (raw >= 1000) {
    return `$${raw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
  return `$${raw.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })}`
}

export default SwapPanel
