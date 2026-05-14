import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createConfig, getQuote, getTokens } from '@lifi/sdk'
import type { LiFiStep, Token } from '@lifi/types'
import { ethers } from 'ethers'
import { useAuth } from '../../contexts/AuthContext'
import {
  ChainFamily,
  getPrimaryRpcUrl,
  type Chain,
} from '../../models/ChainType'
import { useI18n } from '../../i18n'
import { ERC20_ABI, NATIVE_PSEUDO_ADDRESS } from '../swap/ringV2Constants'
import type { SwapTokenOption } from '../swap/useRingV2Tokens'
import TokenPickerModal from '../swap/TokenPickerModal'
import SwapField, { keyOfToken } from '../swap/SwapField'
import InfoRow from '../swap/InfoRow'
import '../swap/SwapDialog.css'

const LIFI_NATIVE_ADDRESS = ethers.ZeroAddress
const DEFAULT_SLIPPAGE = '0.5'
const LIFI_INTEGRATOR = 'ringwallet'

let lifiConfigured = false

function ensureLifiConfig(): void {
  if (lifiConfigured) return
  createConfig({ integrator: LIFI_INTEGRATOR })
  lifiConfigured = true
}

interface Props {
  onClose: () => void
}

interface LifiTokenOption extends SwapTokenOption {
  chainId: number
  name: string
  priceUSD?: string
}

const LifiBridgePage: React.FC<Props> = ({ onClose }) => {
  const { t } = useI18n()
  const { activeWallet, activeChainId, CHAINS } = useAuth()

  const evmChains = useMemo(
    () =>
      CHAINS.filter(
        (chain): chain is Chain & { id: number } =>
          typeof chain.id === 'number' &&
          (chain.family == null ||
            chain.family === ChainFamily.EVM ||
            chain.family === ChainFamily.Prisma) &&
          getPrimaryRpcUrl(chain).length > 0
      ),
    [CHAINS]
  )

  const initialFromChainId =
    typeof activeChainId === 'number' ? activeChainId : Number(activeChainId)
  const [fromChainId, setFromChainId] = useState<number>(
    evmChains.some((c) => c.id === initialFromChainId)
      ? initialFromChainId
      : (evmChains[0]?.id ?? 1)
  )
  const [toChainId, setToChainId] = useState<number>(() => {
    const firstDifferent = evmChains.find((c) => c.id !== fromChainId)
    return firstDifferent?.id ?? fromChainId
  })
  const [fromTokens, setFromTokens] = useState<LifiTokenOption[]>([])
  const [toTokens, setToTokens] = useState<LifiTokenOption[]>([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [fromKey, setFromKey] = useState<string>(NATIVE_PSEUDO_ADDRESS)
  const [toKey, setToKey] = useState<string>(NATIVE_PSEUDO_ADDRESS)
  const [amountIn, setAmountIn] = useState('')
  const [pickerSide, setPickerSide] = useState<'from' | 'to' | null>(null)
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [quote, setQuote] = useState<LiFiStep | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const fromChain = evmChains.find((c) => c.id === fromChainId)
  const toChain = evmChains.find((c) => c.id === toChainId)
  const rpcUrl = fromChain ? getPrimaryRpcUrl(fromChain) : ''

  useEffect(() => {
    ensureLifiConfig()
  }, [])

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
    if (fromChainId !== toChainId) return
    const fallback = evmChains.find((c) => c.id !== fromChainId)
    if (fallback) setToChainId(fallback.id)
  }, [evmChains, fromChainId, toChainId])

  useEffect(() => {
    let cancelled = false
    setTokensLoading(true)
    setTokenError(null)
    setQuote(null)
    ;(async () => {
      try {
        const [fromResp, toResp] = await Promise.all([
          getTokens({
            chains: [fromChainId],
            limit: 200,
            orderBy: 'marketCapUSD',
          }),
          getTokens({
            chains: [toChainId],
            limit: 200,
            orderBy: 'marketCapUSD',
          }),
        ])
        if (cancelled) return
        setFromTokens(
          projectTokens(fromResp.tokens[fromChainId] ?? [], fromChainId)
        )
        setToTokens(projectTokens(toResp.tokens[toChainId] ?? [], toChainId))
      } catch (e) {
        if (!cancelled) setTokenError((e as Error).message)
      } finally {
        if (!cancelled) setTokensLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fromChainId, toChainId])

  const fromToken = useMemo(
    () => fromTokens.find((token) => keyOfToken(token) === fromKey) ?? null,
    [fromKey, fromTokens]
  )
  const toToken = useMemo(
    () => toTokens.find((token) => keyOfToken(token) === toKey) ?? null,
    [toKey, toTokens]
  )
  const fromTokenAddress = fromToken?.address ?? ''
  const fromTokenIsNative = fromToken?.isNative ?? false
  const fromLifiAddress = fromToken ? toLifiAddress(fromToken) : ''
  const toLifiAddressValue = toToken ? toLifiAddress(toToken) : ''

  useEffect(() => {
    if (fromTokens.length && !fromToken) setFromKey(keyOfToken(fromTokens[0]))
  }, [fromToken, fromTokens])

  useEffect(() => {
    if (toTokens.length && !toToken) setToKey(keyOfToken(toTokens[0]))
  }, [toToken, toTokens])

  const requiredAmount = useMemo(() => {
    if (!fromToken || !amountIn) return 0n
    try {
      return ethers.parseUnits(amountIn, fromToken.decimals)
    } catch {
      return 0n
    }
  }, [amountIn, fromToken?.decimals])

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
        const next = await getQuote(
          {
            fromChain: fromChainId,
            toChain: toChainId,
            fromToken: fromLifiAddress,
            toToken: toLifiAddressValue,
            fromAddress: activeWallet.address,
            toAddress: activeWallet.address,
            fromAmount: requiredAmount.toString(),
            slippage: Number(slippage) / 100,
            integrator: LIFI_INTEGRATOR,
          },
          { signal: controller.signal }
        )
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
    fromChainId,
    fromLifiAddress,
    requiredAmount,
    slippage,
    t,
    toChainId,
    toLifiAddressValue,
  ])

  const refreshBalance = useCallback(async () => {
    if (!activeWallet?.address || !fromTokenAddress || !rpcUrl) return
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const balance = fromTokenIsNative
      ? await provider.getBalance(activeWallet.address)
      : ((await new ethers.Contract(
          fromTokenAddress,
          ERC20_ABI,
          provider
        ).balanceOf(activeWallet.address)) as bigint)
    setFromTokens((prev) => {
      let changed = false
      const next = prev.map((token) => {
        if (keyOfToken(token) !== fromKey) return token
        if (token.balance === balance) return token
        changed = true
        return { ...token, balance }
      })
      return changed ? next : prev
    })
  }, [
    activeWallet?.address,
    fromKey,
    fromTokenAddress,
    fromTokenIsNative,
    rpcUrl,
  ])

  useEffect(() => {
    refreshBalance().catch(() => undefined)
  }, [refreshBalance])

  const setMax = useCallback(() => {
    if (!fromToken || fromToken.balance <= 0n) return
    let usable = fromToken.balance
    if (fromToken.isNative) {
      const reserve = ethers.parseUnits('0.001', fromToken.decimals)
      usable = usable > reserve ? usable - reserve : 0n
    }
    if (usable > 0n) setAmountIn(ethers.formatUnits(usable, fromToken.decimals))
  }, [fromToken])

  const handleSubmit = useCallback(async () => {
    if (
      !activeWallet?.privateKey ||
      !activeWallet.address ||
      !quote ||
      !rpcUrl
    ) {
      return
    }
    const tx = quote.transactionRequest
    if (!tx?.to) {
      setStatus(t('lifiMissingTransaction'))
      return
    }
    setBusy(true)
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const wallet = new ethers.Wallet(activeWallet.privateKey, provider)
      if (fromToken && !fromToken.isNative && quote.estimate.approvalAddress) {
        const tokenContract = new ethers.Contract(
          fromToken.address,
          ERC20_ABI,
          wallet
        )
        const allowance = (await tokenContract.allowance(
          activeWallet.address,
          quote.estimate.approvalAddress
        )) as bigint
        if (allowance < requiredAmount) {
          setStatus(t('lifiApproving', { symbol: fromToken.symbol }))
          const approval = await tokenContract.approve(
            quote.estimate.approvalAddress,
            ethers.MaxUint256
          )
          await approval.wait()
        }
      }
      setStatus(t('lifiSubmitting'))
      const sent = await wallet.sendTransaction(toEthersTx(tx))
      setStatus(t('lifiSubmitted', { hash: shortHash(sent.hash) }))
      setAmountIn('')
      await refreshBalance()
    } catch (e) {
      setStatus(t('lifiFailed', { error: (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }, [
    activeWallet?.address,
    activeWallet?.privateKey,
    fromToken,
    quote,
    refreshBalance,
    requiredAmount,
    rpcUrl,
    t,
  ])

  const formattedQuote =
    quote && toToken
      ? trimDecimals(
          ethers.formatUnits(quote.estimate.toAmount, toToken.decimals)
        )
      : ''
  const gasUsd = formatUsd(sumGasUsd(quote))
  const minReceived =
    quote && toToken
      ? `${trimDecimals(
          ethers.formatUnits(quote.estimate.toAmountMin, toToken.decimals)
        )} ${toToken.symbol}`
      : null
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
    busy || !quote || requiredAmount <= 0n || !activeWallet?.privateKey

  return (
    <div
      className="swap-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="LI.FI"
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
          <h2 className="swap-dialog__title">{t('lifiBridgeTitle')}</h2>
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
                <span className="ring-v2-panel__pill">LI.FI</span>
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

              <div className="ring-v2-panel__divider">
                <span className="lifi-bridge-panel__arrow">↓</span>
              </div>

              <SwapField
                side={t('swapToEstimated')}
                token={toToken}
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
                    value={quote.toolDetails.name}
                  />
                  {gasUsd && (
                    <InfoRow label={t('swapNetworkFee')} value={gasUsd} mono />
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

              {(quoteError || tokenError) && (
                <div className="ring-v2-panel__error">
                  {quoteError ?? tokenError}
                </div>
              )}

              <div className="ring-v2-panel__actions">
                <button
                  type="button"
                  className="ring-v2-panel__btn ring-v2-panel__btn--primary"
                  onClick={handleSubmit}
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
              {status && <div className="ring-v2-panel__status">{status}</div>}
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
    </div>
  )
}

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
}) => (
  <label className="lifi-chain-select">
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {chains.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  </label>
)

function projectTokens(tokens: Token[], chainId: number): LifiTokenOption[] {
  const out: LifiTokenOption[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    const isNative = token.address.toLowerCase() === LIFI_NATIVE_ADDRESS
    const address = isNative ? NATIVE_PSEUDO_ADDRESS : token.address
    const key = isNative ? NATIVE_PSEUDO_ADDRESS : token.address.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      address,
      symbol: token.symbol,
      decimals: token.decimals,
      balance: 0n,
      isNative,
      logo: token.logoURI,
      chainId,
      name: token.name,
      priceUSD: token.priceUSD,
    })
  }
  return out
}

function toLifiAddress(token: SwapTokenOption): string {
  return token.isNative ? LIFI_NATIVE_ADDRESS : token.address
}

function toEthersTx(tx: NonNullable<LiFiStep['transactionRequest']>) {
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value ? BigInt(tx.value) : 0n,
    gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
    gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
    maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigInt(tx.maxPriorityFeePerGas)
      : undefined,
    chainId: tx.chainId,
  }
}

function sumGasUsd(quote: LiFiStep | null): number | null {
  if (!quote?.estimate.gasCosts) return null
  const total = quote.estimate.gasCosts.reduce(
    (sum, cost) => sum + (Number(cost.amountUSD) || 0),
    0
  )
  return total > 0 ? total : null
}

function trimDecimals(s: string): string {
  if (!s.includes('.')) return s
  return s.replace(/\.?0+$/, '')
}

function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash
}

function formatUsd(raw: number | null | undefined): string | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null
  if (raw < 0.01) return '<$0.01'
  return `$${raw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default LifiBridgePage
