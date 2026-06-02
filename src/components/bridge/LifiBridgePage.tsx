import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createConfig, getChains, getQuote, getTokens } from '@lifi/sdk'
import { ChainType as LifiChainType } from '@lifi/types'
import type { LiFiStep, Token } from '@lifi/types'
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
import { signAndBroadcastEvm } from '../../utils/evmSignAndBroadcast'
import PasskeyService from '../../services/account/passkeyService'
import type { SwapTokenOption } from '../swap/useRingV2Tokens'
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

const ETHEREUM_MAINNET_CHAIN_ID = 1
const BASE_MAINNET_CHAIN_ID = 8453
const LIFI_NATIVE_ADDRESS = ethers.ZeroAddress
const LIFI_ALT_NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const DEFAULT_SLIPPAGE = '0.5'
const LIFI_INTEGRATOR = 'ringwallet'
const ALCHEMY_RPC_RE = /\.g\.alchemy\.com\/v2\//i
const WALLET_SUPPORTED_LIFI_CHAIN_IDS = new Set(
  FEATURED_CHAIN_IDS.filter((id): id is number => typeof id === 'number')
)

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
  const { activeWallet, CHAINS, user } = useAuth()
  const [lifiSupportedChainIds, setLifiSupportedChainIds] = useState<
    Set<number>
  >(() => new Set([ETHEREUM_MAINNET_CHAIN_ID, BASE_MAINNET_CHAIN_ID]))

  const evmChains = useMemo(
    () =>
      CHAINS.filter(
        (chain): chain is Chain & { id: number } =>
          typeof chain.id === 'number' &&
          WALLET_SUPPORTED_LIFI_CHAIN_IDS.has(chain.id) &&
          (chain.family == null ||
            chain.family === ChainFamily.EVM ||
            chain.family === ChainFamily.Prisma) &&
          getPrimaryRpcUrl(chain).length > 0 &&
          lifiSupportedChainIds.has(chain.id)
      ),
    [CHAINS, lifiSupportedChainIds]
  )

  const [fromChainId, setFromChainId] = useState<number>(
    ETHEREUM_MAINNET_CHAIN_ID
  )
  const [toChainId, setToChainId] = useState<number>(BASE_MAINNET_CHAIN_ID)
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
  const [statusTone, setStatusTone] = useState<'neutral' | 'error'>('neutral')
  const [reviewOpen, setReviewOpen] = useState(false)

  const fromChain = evmChains.find((c) => c.id === fromChainId)
  const toChain = evmChains.find((c) => c.id === toChainId)
  const rpcUrls = useMemo(() => getClientSafeRpcUrls(fromChain), [fromChain])

  useEffect(() => {
    ensureLifiConfig()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const chains = await getChains({ chainTypes: [LifiChainType.EVM] })
        if (cancelled) return
        setLifiSupportedChainIds(
          new Set(
            chains.filter((chain) => chain.mainnet).map((chain) => chain.id)
          )
        )
      } catch (e) {
        if (!cancelled) setTokenError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
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
          projectTokens(
            fromResp.tokens[fromChainId] ?? [],
            fromChainId,
            fromChain
          )
        )
        setToTokens(
          projectTokens(toResp.tokens[toChainId] ?? [], toChainId, toChain)
        )
      } catch (e) {
        if (!cancelled) setTokenError((e as Error).message)
      } finally {
        if (!cancelled) setTokensLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fromChain, fromChainId, toChain, toChainId])

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
    if (!activeWallet?.address || !fromTokenAddress || rpcUrls.length === 0) {
      return
    }
    const balance = await withJsonRpcProvider(rpcUrls, async (provider) =>
      fromTokenIsNative
        ? provider.getBalance(activeWallet.address)
        : ((await new ethers.Contract(
            fromTokenAddress,
            ERC20_ABI,
            provider
          ).balanceOf(activeWallet.address)) as bigint)
    )
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
    rpcUrls,
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
    if (!activeWallet?.address || !quote || rpcUrls.length === 0) {
      return
    }
    const tx = quote.transactionRequest
    if (!tx?.to) {
      setStatus(t('lifiMissingTransaction'))
      return
    }
    if (user?.id) {
      const verified = await PasskeyService.verifyIdentity(user.id)
      if (!verified) {
        setStatusTone('error')
        setStatus(t('txCanceledBiometricFailed'))
        return
      }
    }
    const senderAddress = activeWallet.address
    const walletIndex = activeWallet.index
    setReviewOpen(false)
    setBusy(true)
    try {
      const sentHash = await withJsonRpcProvider(rpcUrls, async (provider) => {
        await assertSufficientNativeBalance({
          provider,
          tx,
          senderAddress,
          nativeSymbol: fromChain?.symbol ?? 'ETH',
        })
        if (
          fromToken &&
          !fromToken.isNative &&
          quote.estimate.approvalAddress
        ) {
          const tokenContract = new ethers.Contract(
            fromToken.address,
            ERC20_ABI,
            provider
          )
          const allowance = (await tokenContract.allowance(
            senderAddress,
            quote.estimate.approvalAddress
          )) as bigint
          if (allowance < requiredAmount) {
            setStatusTone('neutral')
            setStatus(t('lifiApproving', { symbol: fromToken.symbol }))
            const iface = new ethers.Interface(ERC20_ABI)
            const approvalHash = await signAndBroadcastEvm(
              walletIndex,
              Number(fromChain?.id ?? 1),
              rpcUrls[0],
              {
                to: fromToken.address,
                data: iface.encodeFunctionData('approve', [
                  quote.estimate.approvalAddress,
                  ethers.MaxUint256,
                ]),
              },
              user?.masterSeed ? new Uint8Array(user.masterSeed) : undefined
            )
            await provider.waitForTransaction(approvalHash)
          }
        }
        setStatusTone('neutral')
        setStatus(t('lifiSubmitting'))
        const txHash = await signAndBroadcastEvm(
          walletIndex,
          Number(fromChain?.id ?? 1),
          rpcUrls[0],
          toEthersTx(tx),
          user?.masterSeed ? new Uint8Array(user.masterSeed) : undefined
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
    }
  }, [
    activeWallet?.address,
    activeWallet?.index,
    fromChain?.symbol,
    fromToken,
    quote,
    refreshBalance,
    requiredAmount,
    rpcUrls,
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
    busy || !quote || requiredAmount <= 0n || !activeWallet?.address

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
                  onClick={() => setReviewOpen(true)}
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

      {reviewOpen && quote && fromToken && toToken && (
        <BridgeReviewDialog
          title={t('lifiReviewTitle')}
          fromChain={fromChain?.name ?? String(fromChainId)}
          toChain={toChain?.name ?? String(toChainId)}
          fromAmount={`${amountIn} ${fromToken.symbol}`}
          toAmount={`${formattedQuote || '—'} ${toToken.symbol}`}
          signerAddress={activeWallet?.address ?? '—'}
          route={quote.toolDetails.name}
          networkFee={gasUsd ?? '—'}
          minReceived={minReceived ?? '—'}
          to={quote.transactionRequest?.to ?? '—'}
          busy={busy}
          confirmLabel={t('lifiSignAndSubmit')}
          cancelLabel={t('cancel')}
          labels={{
            route: t('lifiReviewRoute'),
            send: t('lifiReviewSend'),
            receive: t('lifiReviewReceive'),
            signer: t('lifiReviewSigner'),
            provider: t('lifiReviewProvider'),
            networkFee: t('swapNetworkFee'),
            minReceived: t('swapMinReceived'),
            contract: t('lifiReviewContract'),
          }}
          onConfirm={handleSubmit}
          onCancel={() => setReviewOpen(false)}
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
  tokens: Token[],
  chainId: number,
  chain?: Pick<Chain, 'icon'> | null
): LifiTokenOption[] {
  const out: LifiTokenOption[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    const tokenAddress = token.address.toLowerCase()
    const isNative =
      tokenAddress === LIFI_NATIVE_ADDRESS ||
      tokenAddress === LIFI_ALT_NATIVE_ADDRESS
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
      logo: normalizeLogoUri(token.logoURI) ?? (isNative ? chain?.icon : null),
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
  tx: NonNullable<LiFiStep['transactionRequest']>
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

function shortAddr(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr
}

function formatTokenAmount(value: bigint): string {
  return trimDecimals(ethers.formatEther(value))
}

function formatUsd(raw: number | null | undefined): string | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null
  if (raw < 0.01) return '<$0.01'
  return `$${raw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default LifiBridgePage
