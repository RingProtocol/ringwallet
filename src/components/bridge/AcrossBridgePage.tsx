import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../../contexts/AuthContext'
import { FEATURED_CHAIN_IDS } from '../../config/chains'
import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../models/ChainType'
import { useI18n } from '../../i18n'
import { ERC20_ABI, NATIVE_PSEUDO_ADDRESS } from '../swap/ringV2Constants'
import type { SwapTokenOption } from '../swap/useRingV2Tokens'
import { signAndBroadcastEvm } from '../../utils/evmSignAndBroadcast'
import TokenPickerModal from '../swap/TokenPickerModal'
import SwapField, { keyOfToken } from '../swap/SwapField'
import InfoRow from '../swap/InfoRow'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import '../swap/SwapDialog.css'

const ACROSS_API_BASE = 'https://app.across.to/api'
const ETHEREUM_MAINNET_CHAIN_ID = 1
const BASE_MAINNET_CHAIN_ID = 8453
const ACROSS_NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const DEFAULT_SLIPPAGE = '1'
const ALCHEMY_RPC_RE = /\.g\.alchemy\.com\/v2\//i
const WALLET_SUPPORTED_ACROSS_CHAIN_IDS = new Set(
  FEATURED_CHAIN_IDS.filter((id): id is number => typeof id === 'number')
)

interface Props {
  onClose: () => void
}

interface AcrossChain {
  chainId: number
  name: string
  publicRpcUrl?: string
  explorerUrl?: string
  logoUrl?: string
}

interface AcrossToken {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoUrl?: string
  priceUsd?: string
}

interface AcrossTokenOption extends SwapTokenOption {
  chainId: number
  name: string
  apiAddress: string
  priceUsd?: string
}

interface AcrossTxn {
  chainId?: number
  to: string
  data?: string
  value?: string
  gas?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

interface AcrossQuote {
  crossSwapType?: string
  amountType?: string
  approvalTxns?: AcrossTxn[]
  swapTx?: AcrossTxn
  expectedFillTime?: number
  quoteExpiryTimestamp?: number
  expectedOutputAmount?: string
  minOutputAmount?: string
  inputAmount?: string
  fees?: {
    total?: string
    totalMax?: string
    originGas?: string
    totalRelay?: string
  }
  steps?: {
    bridge?: {
      outputAmount?: string
      minOutputAmount?: string
      fees?: {
        total?: string
        totalRelay?: string
      }
      tokenIn?: QuoteTokenDetails
      tokenOut?: QuoteTokenDetails
    }
  }
}

interface QuoteTokenDetails {
  address?: string
  symbol?: string
  decimals?: number
  name?: string
  chainId?: number
}

const AcrossBridgePage: React.FC<Props> = ({ onClose }) => {
  const { t } = useI18n()
  const { activeWallet, CHAINS } = useAuth()
  const acrossApiKey = import.meta.env.VITE_ACROSS_API_KEY?.trim()
  const acrossIntegratorId =
    import.meta.env.VITE_ACROSS_INTEGRATOR_ID?.trim() || '0xdead'
  const [supportedChains, setSupportedChains] = useState<AcrossChain[]>([])
  const [allTokens, setAllTokens] = useState<AcrossToken[]>([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const evmChains = useMemo(
    () =>
      CHAINS.filter(
        (chain): chain is Chain & { id: number } =>
          typeof chain.id === 'number' &&
          WALLET_SUPPORTED_ACROSS_CHAIN_IDS.has(chain.id) &&
          (chain.family == null ||
            chain.family === ChainFamily.EVM ||
            chain.family === ChainFamily.Prisma) &&
          getPrimaryRpcUrl(chain).length > 0 &&
          supportedChains.some(
            (acrossChain) => acrossChain.chainId === chain.id
          )
      ),
    [CHAINS, supportedChains]
  )

  const [fromChainId, setFromChainId] = useState<number>(
    ETHEREUM_MAINNET_CHAIN_ID
  )
  const [toChainId, setToChainId] = useState<number>(BASE_MAINNET_CHAIN_ID)
  const [fromKey, setFromKey] = useState<string>('')
  const [toKey, setToKey] = useState<string>('')
  const [amountIn, setAmountIn] = useState('')
  const [pickerSide, setPickerSide] = useState<'from' | 'to' | null>(null)
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [quote, setQuote] = useState<AcrossQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [sourceBalances, setSourceBalances] = useState<Record<string, bigint>>(
    {}
  )
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<'neutral' | 'error'>('neutral')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewQuote, setReviewQuote] = useState<AcrossQuote | null>(null)
  const submittingRef = useRef(false)

  const fromChain = evmChains.find((c) => c.id === fromChainId)
  const toChain = evmChains.find((c) => c.id === toChainId)
  const rpcUrls = useMemo(() => getClientSafeRpcUrls(fromChain), [fromChain])
  const fromTokens = useMemo(
    () => projectTokens(allTokens, fromChainId, fromChain, sourceBalances),
    [allTokens, fromChain, fromChainId, sourceBalances]
  )
  const toTokens = useMemo(
    () => projectTokens(allTokens, toChainId, toChain),
    [allTokens, toChain, toChainId]
  )
  const fromToken = useMemo(
    () => fromTokens.find((token) => keyOfToken(token) === fromKey) ?? null,
    [fromKey, fromTokens]
  )
  const toToken = useMemo(
    () => toTokens.find((token) => keyOfToken(token) === toKey) ?? null,
    [toKey, toTokens]
  )
  const requiredAmount = useMemo(() => {
    if (!fromToken || !amountIn) return 0n
    try {
      return ethers.parseUnits(amountIn, fromToken.decimals)
    } catch {
      return 0n
    }
  }, [amountIn, fromToken?.decimals])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setTokensLoading(true)
    setTokenError(null)
    ;(async () => {
      try {
        const [chains, tokens] = await Promise.all([
          acrossFetch<AcrossChain[]>(
            withIntegrator('/swap/chains', acrossIntegratorId),
            acrossApiKey
          ),
          acrossFetch<AcrossToken[]>(
            withIntegrator('/swap/tokens', acrossIntegratorId),
            acrossApiKey
          ),
        ])
        if (cancelled) return
        setSupportedChains(chains)
        setAllTokens(tokens)
      } catch (e) {
        if (!cancelled) setTokenError((e as Error).message)
      } finally {
        if (!cancelled) setTokensLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [acrossApiKey, acrossIntegratorId])

  useEffect(() => {
    if (evmChains.length === 0) return
    if (!evmChains.some((c) => c.id === fromChainId)) {
      setFromChainId(evmChains[0].id)
      return
    }
    if (
      fromChainId === toChainId ||
      !evmChains.some((c) => c.id === toChainId)
    ) {
      const preferredBase = evmChains.find(
        (c) => c.id === BASE_MAINNET_CHAIN_ID && c.id !== fromChainId
      )
      const fallback = evmChains.find((c) => c.id !== fromChainId)
      if (preferredBase ?? fallback) {
        setToChainId((preferredBase ?? fallback)?.id ?? fromChainId)
      }
    }
  }, [evmChains, fromChainId, toChainId])

  useEffect(() => {
    if (fromTokens.length && !fromToken) setFromKey(keyOfToken(fromTokens[0]))
  }, [fromToken, fromTokens])

  useEffect(() => {
    if (toTokens.length && !toToken) setToKey(keyOfToken(toTokens[0]))
  }, [toToken, toTokens])

  const refreshBalance = useCallback(async () => {
    if (!activeWallet?.address || !fromToken || rpcUrls.length === 0) return
    const balance = await withJsonRpcProvider(rpcUrls, async (provider) =>
      fromToken.isNative
        ? provider.getBalance(activeWallet.address)
        : ((await new ethers.Contract(
            fromToken.address,
            ERC20_ABI,
            provider
          ).balanceOf(activeWallet.address)) as bigint)
    )
    const balanceKey = getBalanceKey(fromChainId, fromToken)
    setSourceBalances((prev) =>
      prev[balanceKey] === balance ? prev : { ...prev, [balanceKey]: balance }
    )
  }, [activeWallet?.address, fromChainId, fromToken, rpcUrls])

  useEffect(() => {
    refreshBalance().catch(() => undefined)
  }, [refreshBalance])

  useEffect(() => {
    if (
      !activeWallet?.address ||
      !fromToken ||
      !toToken ||
      requiredAmount <= 0n
    ) {
      setQuote(null)
      setQuoteError(null)
      setQuoteLoading(false)
      return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setQuoteLoading(true)
      setQuoteError(null)
      try {
        const search = new URLSearchParams({
          tradeType: 'exactInput',
          amount: requiredAmount.toString(),
          inputToken: fromToken.apiAddress,
          outputToken: toToken.apiAddress,
          originChainId: String(fromChainId),
          destinationChainId: String(toChainId),
          depositor: activeWallet.address,
          recipient: activeWallet.address,
          integratorId: acrossIntegratorId,
          slippage: String(Number(slippage || DEFAULT_SLIPPAGE)),
        })
        const next = await acrossFetch<AcrossQuote>(
          `/swap/approval?${search.toString()}`,
          acrossApiKey,
          controller.signal
        )
        if (!next.swapTx) {
          throw new Error(t('lifiMissingTransaction'))
        }
        setQuote(next)
      } catch (e) {
        if (!controller.signal.aborted) {
          setQuote(null)
          setQuoteError((e as Error).message || t('swapNoRoute'))
        }
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false)
      }
    }, 350)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [
    activeWallet?.address,
    acrossApiKey,
    acrossIntegratorId,
    fromChainId,
    fromToken,
    requiredAmount,
    slippage,
    t,
    toChainId,
    toToken,
  ])

  const setMax = useCallback(() => {
    if (!fromToken || fromToken.balance <= 0n) return
    let usable = fromToken.balance
    if (fromToken.isNative) {
      const reserve = ethers.parseUnits('0.001', fromToken.decimals)
      usable = usable > reserve ? usable - reserve : 0n
    }
    if (usable > 0n) setAmountIn(ethers.formatUnits(usable, fromToken.decimals))
  }, [fromToken])

  const handleOpenReview = useCallback(() => {
    if (!quote) return
    setReviewQuote(quote)
    setReviewOpen(true)
  }, [quote])

  const handleCloseReview = useCallback(() => {
    if (busy) return
    setReviewOpen(false)
    setReviewQuote(null)
  }, [busy])

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || !reviewOpen || !reviewQuote) return
    if (!activeWallet?.address || !reviewQuote.swapTx || rpcUrls.length === 0) {
      return
    }
    submittingRef.current = true
    const swapTx = reviewQuote.swapTx
    const senderAddress = activeWallet.address
    const walletIndex = activeWallet.index
    setReviewOpen(false)
    setReviewQuote(null)
    setBusy(true)
    try {
      const sentHash = await withJsonRpcProvider(rpcUrls, async (provider) => {
        for (const approval of reviewQuote.approvalTxns ?? []) {
          setStatusTone('neutral')
          setStatus(t('lifiApproving', { symbol: fromToken?.symbol ?? '' }))
          const ethersTx = toEthersTx(approval)
          const txHash = await signAndBroadcastEvm(
            walletIndex,
            Number(fromChain?.id ?? 1),
            rpcUrls[0],
            ethersTx
          )
          await provider.waitForTransaction(txHash)
        }
        await assertSufficientNativeBalance({
          provider,
          tx: swapTx,
          senderAddress,
          nativeSymbol: fromChain?.symbol ?? 'ETH',
        })
        setStatusTone('neutral')
        setStatus(t('lifiSubmitting'))
        const ethersTx = toEthersTx(swapTx)
        const txHash = await signAndBroadcastEvm(
          walletIndex,
          Number(fromChain?.id ?? 1),
          rpcUrls[0],
          ethersTx
        )
        return txHash
      })
      setStatusTone('neutral')
      setStatus(t('lifiSubmitted', { hash: shortHash(sentHash) }))
      setAmountIn('')
      await refreshBalance()
    } catch (e) {
      setStatusTone('error')
      setStatus(t('lifiFailed', { error: (e as Error).message }))
    } finally {
      setBusy(false)
      submittingRef.current = false
    }
  }, [
    activeWallet?.address,
    activeWallet?.index,
    fromChain?.symbol,
    fromToken?.symbol,
    refreshBalance,
    reviewOpen,
    reviewQuote,
    rpcUrls,
    t,
  ])

  const formattedQuote =
    quote && toToken
      ? trimDecimals(
          ethers.formatUnits(
            quote.expectedOutputAmount ??
              quote.steps?.bridge?.outputAmount ??
              '0',
            getQuoteOutputToken(quote, toToken).decimals
          )
        )
      : ''
  const quoteOutputToken =
    quote && toToken ? getQuoteOutputToken(quote, toToken) : null
  const displayToToken =
    quoteOutputToken && toToken
      ? withQuoteTokenDetails(toToken, quoteOutputToken)
      : toToken
  const receiveAssetChanged =
    Boolean(quoteOutputToken && toToken) &&
    quoteOutputToken?.symbol !== toToken?.symbol
  const minReceived =
    quote && toToken
      ? `${trimDecimals(
          ethers.formatUnits(
            quote.minOutputAmount ??
              quote.steps?.bridge?.minOutputAmount ??
              quote.steps?.bridge?.outputAmount ??
              '0',
            getQuoteOutputToken(quote, toToken).decimals
          )
        )} ${getQuoteOutputToken(quote, toToken).symbol}`
      : null
  const fillTime = quote?.expectedFillTime
    ? formatDuration(quote.expectedFillTime)
    : null
  const totalFee = formatTokenFee(
    quote?.fees?.total ?? quote?.steps?.bridge?.fees?.totalRelay,
    quote && fromToken ? getQuoteInputToken(quote, fromToken) : fromToken
  )
  const reviewedOutputToken =
    reviewQuote && toToken ? getQuoteOutputToken(reviewQuote, toToken) : null
  const reviewedInputToken =
    reviewQuote && fromToken ? getQuoteInputToken(reviewQuote, fromToken) : null
  const reviewedOutput =
    reviewQuote && toToken
      ? trimDecimals(
          ethers.formatUnits(
            reviewQuote.expectedOutputAmount ??
              reviewQuote.steps?.bridge?.outputAmount ??
              '0',
            getQuoteOutputToken(reviewQuote, toToken).decimals
          )
        )
      : formattedQuote
  const reviewedMinReceived =
    reviewQuote && toToken
      ? `${trimDecimals(
          ethers.formatUnits(
            reviewQuote.minOutputAmount ??
              reviewQuote.steps?.bridge?.minOutputAmount ??
              reviewQuote.steps?.bridge?.outputAmount ??
              '0',
            getQuoteOutputToken(reviewQuote, toToken).decimals
          )
        )} ${getQuoteOutputToken(reviewQuote, toToken).symbol}`
      : minReceived
  const reviewedFillTime = reviewQuote?.expectedFillTime
    ? formatDuration(reviewQuote.expectedFillTime)
    : fillTime
  const reviewedTotalFee = formatTokenFee(
    reviewQuote?.fees?.total ?? reviewQuote?.steps?.bridge?.fees?.totalRelay,
    reviewedInputToken ?? fromToken
  )
  const reviewedTransactionCount = reviewQuote
    ? (reviewQuote.approvalTxns?.length ?? 0) + (reviewQuote.swapTx ? 1 : 0)
    : 0
  const ctaLabel = busy
    ? t('swapStatusWorking')
    : !fromToken || !toToken
      ? t('swapPickTokens')
      : requiredAmount <= 0n
        ? t('swapEnterAmount')
        : quoteLoading && !quote
          ? t('swapFetchingQuote')
          : !quote
            ? (quoteError ?? t('swapNoRoute'))
            : t('lifiReviewBridge')
  const disabled =
    busy || !quote || requiredAmount <= 0n || !activeWallet?.address

  return (
    <div
      className="swap-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Across"
    >
      <div
        className="swap-dialog__backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div className="swap-dialog__panel">
        <header className="swap-dialog__header">
          <button
            type="button"
            className="swap-dialog__nav swap-dialog__nav--back"
            onClick={onClose}
            aria-label={t('back')}
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="swap-dialog__title">{t('acrossBridgeTitle')}</h2>
          <button
            type="button"
            className="swap-dialog__nav swap-dialog__nav--close"
            onClick={onClose}
            aria-label={t('close')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="swap-dialog__body">
          <div className="swap-dialog__ring">
            <div className="ring-v2-panel lifi-bridge-panel">
              <div className="ring-v2-panel__topbar">
                <span className="ring-v2-panel__pill">Across</span>
                <span className="lifi-bridge-panel__route">
                  {fromChain?.name ?? fromChainId} →{' '}
                  {toChain?.name ?? toChainId}
                </span>
              </div>

              <div className="lifi-bridge-panel__chains">
                <ChainSelect
                  label={t('lifiFromChain')}
                  value={fromChainId}
                  chains={evmChains}
                  onChange={setFromChainId}
                />
                <ChainSelect
                  label={t('lifiToChain')}
                  value={toChainId}
                  chains={evmChains}
                  onChange={setToChainId}
                />
              </div>

              <SwapField
                side={t('swapFrom')}
                token={fromToken}
                amount={amountIn}
                onAmount={(v) => setAmountIn(v.replace(/[^0-9.]/g, ''))}
                showQuickPercents={false}
                onMax={setMax}
                onPickToken={() => setPickerSide('from')}
              />

              <SwapField
                side={t('swapToEstimated')}
                token={displayToToken}
                amount={formattedQuote}
                skeleton={quoteLoading && !quote}
                readOnly
                onPickToken={() => setPickerSide('to')}
              />

              <div className="ring-v2-panel__settings">
                <div className="ring-v2-panel__settings-row">
                  <span className="ring-v2-panel__setting-label">
                    {t('swapSlippageLabel')}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={slippage}
                    onChange={(e) =>
                      setSlippage(e.target.value.replace(/[^0-9.]/g, ''))
                    }
                    className="ring-v2-panel__setting-input ring-v2-panel__setting-input--inline"
                  />
                </div>
              </div>

              {quote && (
                <div className="ring-v2-panel__info">
                  <InfoRow
                    label={t('swapRoute')}
                    value={quote.crossSwapType ?? 'Across'}
                  />
                  {fillTime && (
                    <InfoRow
                      label={t('acrossExpectedFillTime')}
                      value={fillTime}
                    />
                  )}
                  {quoteOutputToken && (
                    <InfoRow
                      label={t('acrossReceiveAsset')}
                      value={`${quoteOutputToken.symbol} on ${
                        toChain?.name ?? toChainId
                      }`}
                    />
                  )}
                  {totalFee && (
                    <InfoRow
                      label={t('swapNetworkFee')}
                      value={totalFee}
                      mono
                    />
                  )}
                  {minReceived && (
                    <InfoRow
                      label={t('swapMinReceived')}
                      value={minReceived}
                      mono
                      last
                    />
                  )}
                </div>
              )}

              {receiveAssetChanged && quoteOutputToken && (
                <div className="ring-v2-panel__status">
                  {t('acrossReceiveAssetNotice', {
                    symbol: quoteOutputToken.symbol,
                    chain: toChain?.name ?? toChainId,
                  })}
                </div>
              )}

              {(quoteError || tokenError) && (
                <div className="ring-v2-panel__error">
                  {quoteError ?? tokenError}
                </div>
              )}

              {status && (
                <div
                  className={`ring-v2-panel__status ${
                    statusTone === 'error' ? 'ring-v2-panel__status--error' : ''
                  }`}
                >
                  {status}
                </div>
              )}

              <div className="ring-v2-panel__actions">
                <button
                  type="button"
                  className="ring-v2-panel__btn ring-v2-panel__btn--primary"
                  onClick={handleOpenReview}
                  disabled={disabled}
                >
                  {ctaLabel}
                </button>
              </div>

              {tokensLoading && (
                <div className="ring-v2-panel__status">
                  {t('tokenPickerLoading')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TokenPickerModal
        open={pickerSide !== null}
        onClose={() => setPickerSide(null)}
        options={pickerSide === 'from' ? fromTokens : toTokens}
        selectedKey={pickerSide === 'from' ? fromKey : toKey}
        onSelect={(key) => {
          if (pickerSide === 'from') setFromKey(key)
          else setToKey(key)
        }}
        loading={tokensLoading}
      />

      {reviewOpen && reviewQuote && fromToken && toToken && (
        <BridgeReviewDialog
          title={t('lifiReviewTitle')}
          fromChain={fromChain?.name ?? String(fromChainId)}
          toChain={toChain?.name ?? String(toChainId)}
          fromAmount={`${amountIn} ${fromToken.symbol}`}
          toAmount={`${reviewedOutput || '-'} ${
            reviewedOutputToken?.symbol ?? toToken.symbol
          }`}
          signerAddress={activeWallet?.address ?? '-'}
          route={reviewQuote.crossSwapType ?? 'Across'}
          transactionCount={String(reviewedTransactionCount)}
          expectedFillTime={reviewedFillTime ?? '-'}
          networkFee={reviewedTotalFee ?? '-'}
          minReceived={reviewedMinReceived ?? '-'}
          to={reviewQuote.swapTx?.to ?? '-'}
          busy={busy}
          confirmLabel={t('lifiSignAndSubmit')}
          cancelLabel={t('cancel')}
          labels={{
            route: t('lifiReviewRoute'),
            send: t('lifiReviewSend'),
            receive: t('lifiReviewReceive'),
            signer: t('lifiReviewSigner'),
            provider: t('lifiReviewProvider'),
            transactions: t('acrossReviewTransactions'),
            fillTime: t('acrossExpectedFillTime'),
            networkFee: t('swapNetworkFee'),
            minReceived: t('swapMinReceived'),
            contract: t('lifiReviewContract'),
          }}
          onConfirm={handleSubmit}
          onCancel={handleCloseReview}
        />
      )}
    </div>
  )
}

interface BridgeReviewDialogProps {
  title: string
  fromChain: string
  toChain: string
  fromAmount: string
  toAmount: string
  signerAddress: string
  route: string
  transactionCount: string
  expectedFillTime: string
  networkFee: string
  minReceived: string
  to: string
  busy: boolean
  confirmLabel: string
  cancelLabel: string
  labels: {
    route: string
    send: string
    receive: string
    signer: string
    provider: string
    transactions: string
    fillTime: string
    networkFee: string
    minReceived: string
    contract: string
  }
  onConfirm: () => void
  onCancel: () => void
}

const BridgeReviewDialog: React.FC<BridgeReviewDialogProps> = ({
  title,
  fromChain,
  toChain,
  fromAmount,
  toAmount,
  signerAddress,
  route,
  transactionCount,
  expectedFillTime,
  networkFee,
  minReceived,
  to,
  busy,
  confirmLabel,
  cancelLabel,
  labels,
  onConfirm,
  onCancel,
}) => (
  <div
    className="lifi-review"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div
      className="lifi-review__backdrop"
      onClick={onCancel}
      role="presentation"
    />
    <div className="lifi-review__panel">
      <header className="lifi-review__header">
        <h3>{title}</h3>
        <button type="button" onClick={onCancel} aria-label={cancelLabel}>
          ×
        </button>
      </header>
      <div className="lifi-review__rows">
        <ReviewRow label={labels.route} value={`${fromChain} → ${toChain}`} />
        <ReviewRow label={labels.send} value={fromAmount} mono />
        <ReviewRow label={labels.receive} value={toAmount} mono />
        <ReviewRow
          label={labels.signer}
          value={shortAddr(signerAddress)}
          mono
        />
        <ReviewRow label={labels.provider} value={route} />
        <ReviewRow label={labels.transactions} value={transactionCount} mono />
        <ReviewRow label={labels.fillTime} value={expectedFillTime} />
        <ReviewRow label={labels.networkFee} value={networkFee} mono />
        <ReviewRow label={labels.minReceived} value={minReceived} mono />
        <ReviewRow label={labels.contract} value={shortAddr(to)} mono />
      </div>
      <div className="lifi-review__actions">
        <button
          type="button"
          className="ring-v2-panel__btn ring-v2-panel__btn--secondary"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="ring-v2-panel__btn ring-v2-panel__btn--primary"
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
)

const ReviewRow: React.FC<{
  label: string
  value: string
  mono?: boolean
}> = ({ label, value, mono }) => (
  <div className="lifi-review__row">
    <span>{label}</span>
    <strong className={mono ? 'lifi-review__mono' : undefined}>{value}</strong>
  </div>
)

interface ChainSelectProps {
  label: string
  value: number
  chains: (Chain & { id: number })[]
  onChange: (chainId: number) => void
}

const ChainSelect: React.FC<ChainSelectProps> = ({
  label,
  value,
  chains,
  onChange,
}) => {
  const selected = chains.find((chain) => chain.id === value)
  return (
    <div className="lifi-chain-select">
      <span>{label}</span>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger className="lifi-chain-select__trigger">
          <SelectValue
            placeholder={selected ? selected.name : label}
            aria-label={selected ? selected.name : label}
          />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          className="lifi-chain-select__content"
        >
          {chains.map((chain) => (
            <SelectItem
              key={chain.id}
              value={String(chain.id)}
              className="lifi-chain-select__item"
            >
              <ChainOption chain={chain} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const ChainOption: React.FC<{ chain: Chain & { id: number } }> = ({
  chain,
}) => (
  <span className="lifi-chain-select__option">
    {chain.icon && <img src={chain.icon} alt="" loading="lazy" />}
    <span>{chain.name}</span>
  </span>
)

function projectTokens(
  tokens: AcrossToken[],
  chainId: number,
  chain?: Pick<Chain, 'icon'> | null,
  balances: Record<string, bigint> = {}
): AcrossTokenOption[] {
  const out: AcrossTokenOption[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    if (token.chainId !== chainId) continue
    const normalized = token.address.toLowerCase()
    const isNative =
      normalized === ethers.ZeroAddress || normalized === ACROSS_NATIVE_ADDRESS
    const address = isNative ? NATIVE_PSEUDO_ADDRESS : token.address
    const key = isNative ? NATIVE_PSEUDO_ADDRESS : normalized
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      address,
      symbol: token.symbol,
      decimals: token.decimals,
      balance: balances[getBalanceKey(chainId, key)] ?? 0n,
      isNative,
      logo: normalizeLogoUri(token.logoUrl) ?? (isNative ? chain?.icon : null),
      chainId,
      name: token.name,
      apiAddress: token.address,
      priceUsd: token.priceUsd,
    })
  }
  return out.sort((a, b) => Number(b.isNative) - Number(a.isNative))
}

function getQuoteInputToken(
  quote: AcrossQuote,
  fallback: AcrossTokenOption
): AcrossTokenOption {
  return withQuoteTokenDetails(fallback, quote.steps?.bridge?.tokenIn)
}

function getQuoteOutputToken(
  quote: AcrossQuote,
  fallback: AcrossTokenOption
): AcrossTokenOption {
  return withQuoteTokenDetails(fallback, quote.steps?.bridge?.tokenOut)
}

function withQuoteTokenDetails(
  fallback: AcrossTokenOption,
  details?: QuoteTokenDetails | null
): AcrossTokenOption {
  if (!details) return fallback
  const symbol = details.symbol ?? fallback.symbol
  const decimals = details.decimals ?? fallback.decimals
  const address = details.address ?? fallback.apiAddress
  const normalized = address.toLowerCase()
  const isNative =
    normalized === ethers.ZeroAddress || normalized === ACROSS_NATIVE_ADDRESS
  return {
    ...fallback,
    address: isNative ? NATIVE_PSEUDO_ADDRESS : address,
    apiAddress: address,
    symbol,
    decimals,
    isNative,
    name: details.name ?? fallback.name,
  }
}

function getBalanceKey(
  chainId: number,
  token: AcrossTokenOption | string
): string {
  const tokenKey = typeof token === 'string' ? token : keyOfToken(token)
  return `${chainId}:${tokenKey}`
}

async function acrossFetch<TResult>(
  path: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<TResult> {
  const headers: HeadersInit = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  const res = await fetch(`${ACROSS_API_BASE}${path}`, { headers, signal })
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      payload?.message || payload?.error || `Across API failed (${res.status})`
    )
  }
  return payload as TResult
}

function withIntegrator(path: string, integratorId: string): string {
  const [pathname, rawSearch] = path.split('?')
  const search = new URLSearchParams(rawSearch)
  search.set('integratorId', integratorId)
  return `${pathname}?${search.toString()}`
}

function normalizeLogoUri(uri?: string | null): string | null {
  if (!uri) return null
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`
  }
  if (uri.startsWith('//')) return `https:${uri}`
  return uri
}

function getClientSafeRpcUrls(chain?: Pick<Chain, 'rpcUrl'> | null): string[] {
  const rpcUrls = chain?.rpcUrl?.filter(Boolean) ?? []
  return [...rpcUrls].sort((a, b) => {
    const aAlchemy = ALCHEMY_RPC_RE.test(a)
    const bAlchemy = ALCHEMY_RPC_RE.test(b)
    if (aAlchemy === bAlchemy) return 0
    return aAlchemy ? 1 : -1
  })
}

async function withJsonRpcProvider<TResult>(
  rpcUrls: string[],
  runner: (provider: ethers.JsonRpcProvider) => Promise<TResult>
): Promise<TResult> {
  let lastError: unknown = null
  for (const rpcUrl of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      return await runner(provider)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('All RPC endpoints failed')
}

async function assertSufficientNativeBalance(args: {
  provider: ethers.JsonRpcProvider
  tx: AcrossTxn
  senderAddress: string
  nativeSymbol: string
}): Promise<void> {
  const { provider, tx, senderAddress, nativeSymbol } = args
  const [balance, feeData] = await Promise.all([
    provider.getBalance(senderAddress),
    provider.getFeeData(),
  ])
  const value = tx.value ? BigInt(tx.value) : 0n
  const gasLimit =
    tx.gasLimit != null
      ? BigInt(tx.gasLimit)
      : tx.gas != null
        ? BigInt(tx.gas)
        : await provider.estimateGas({
            ...toEthersTx(tx),
            from: senderAddress,
          })
  const gasPrice =
    tx.maxFeePerGas != null
      ? BigInt(tx.maxFeePerGas)
      : tx.gasPrice != null
        ? BigInt(tx.gasPrice)
        : (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n)
  const required = value + gasLimit * gasPrice
  if (balance < required) {
    throw new Error(
      `Insufficient ${nativeSymbol} on source chain: have ${formatTokenAmount(
        balance
      )}, need about ${formatTokenAmount(required)}`
    )
  }
}

function toEthersTx(tx: AcrossTxn) {
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value ? BigInt(tx.value) : 0n,
    gasLimit: tx.gasLimit
      ? BigInt(tx.gasLimit)
      : tx.gas
        ? BigInt(tx.gas)
        : undefined,
    gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
    maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigInt(tx.maxPriorityFeePerGas)
      : undefined,
    chainId: tx.chainId,
  }
}

function trimDecimals(s: string): string {
  if (!s.includes('.')) return s
  return s.replace(/\.?0+$/, '')
}

function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash
}

function shortAddr(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr
}

function formatTokenAmount(value: bigint): string {
  return trimDecimals(ethers.formatEther(value))
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes}m`
}

function formatTokenFee(
  amount: string | undefined,
  token: AcrossTokenOption | null
): string | null {
  if (!amount || !token) return null
  try {
    return `${trimDecimals(ethers.formatUnits(amount, token.decimals))} ${
      token.symbol
    }`
  } catch {
    return null
  }
}

export default AcrossBridgePage
