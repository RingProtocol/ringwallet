import React, { useState, useEffect } from 'react'
import { RingSwapFrame, kyberWidgetEngine } from '@ring-protocol/ring-swap-sdk'
import '@ring-protocol/ring-swap-sdk/styles'
import { useSwapSigner } from './swap/useSwapSigner'
import { useAuth } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import type { SendTokenOption } from './transaction/types'
import {
  EOASendForm,
  SmartAccountSendForm,
  SolanaSendForm,
  BitcoinSendForm,
  DogecoinSendForm,
  ReceiveDialog,
} from './transaction'
import { useI18n } from '../i18n'
import { TESTID } from './testids'
import Toast from './Toast'
import EarnDialog from './earn/EarnDialog'
import { useIsEarnSupported } from './earn/useEarnSdk'
import './QuickActionBar.css'

/* ── ActionCircleEntry (single action button) ── */

export interface ActionCircleEntryProps {
  icon: React.ReactNode
  label: string
  variantClass: string
  onClick: () => void
  disabled?: boolean
  title?: string
  testId?: string
}

export const ActionCircleEntry: React.FC<ActionCircleEntryProps> = ({
  icon,
  label,
  variantClass,
  onClick,
  disabled,
  title,
  testId,
}) => (
  <button
    type="button"
    className={`action-circle-entry ${variantClass}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    data-testid={testId}
  >
    <span className="action-circle-entry__disc" aria-hidden>
      {icon}
    </span>
    <span className="action-circle-entry__label">{label}</span>
  </button>
)

/* ── Constants ── */

const DEFAULT_MOONPAY_BASE_URL = 'https://buy.moonpay.com'

function getMoonPayCurrencyCode(
  isBitcoinChain: boolean,
  isDogecoinChain: boolean,
  isSolanaChain: boolean,
  chainName?: string
): string | null {
  if (isBitcoinChain) return 'btc'
  if (isDogecoinChain) return 'doge'
  if (isSolanaChain) return 'sol'

  const normalizedChainName = chainName?.toLowerCase() ?? ''

  if (normalizedChainName.includes('polygon')) return 'matic'
  if (normalizedChainName.includes('ethereum')) return 'eth'
  if (normalizedChainName.includes('arbitrum')) return 'eth_arbitrum'
  if (normalizedChainName.includes('optimism')) return 'eth_optimism'
  if (normalizedChainName.includes('base')) return 'eth_base'

  return 'eth'
}

/* ── QuickActionBar ── */

interface QuickActionBarProps {
  initialToken?: SendTokenOption
  onSendFormClosed?: () => void
}

const QuickActionBar: React.FC<QuickActionBarProps> = ({
  initialToken,
  onSendFormClosed,
}) => {
  const {
    isLoggedIn,
    activeWallet,
    activeAccount,
    activeChain,
    isSolanaChain,
    isBitcoinChain,
    isDogecoinChain,
  } = useAuth()
  const { t } = useI18n()
  const {
    signer: swapSigner,
    chainId: swapChainId,
    rpcUrl: swapRpcUrl,
  } = useSwapSigner()
  const [showSend, setShowSend] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [swapDappOpen, setSwapDappOpen] = useState(false)
  const [showEarn, setShowEarn] = useState(false)
  const [sendToken, setSendToken] = useState<SendTokenOption | undefined>(
    undefined
  )
  const [toastVisible, setToastVisible] = useState(false)
  const [devMode, setDevMode] = useState(
    () => localStorage.getItem('ring:devMode') === '1'
  )

  useEffect(() => {
    const handler = () =>
      setDevMode(localStorage.getItem('ring:devMode') === '1')
    window.addEventListener('ring:dev-mode-changed', handler)
    return () => window.removeEventListener('ring:dev-mode-changed', handler)
  }, [])

  useEffect(() => {
    if (initialToken) {
      setSendToken(initialToken)
      setShowSend(true)
    }
  }, [initialToken])

  if (!isLoggedIn) return null
  if (!activeAccount) return null

  const isSmartAccount =
    !isSolanaChain &&
    !isBitcoinChain &&
    !isDogecoinChain &&
    activeWallet?.type === WalletType.SmartContract
  const receiveAddress = activeAccount.address
  const moonPayApiKey = import.meta.env.VITE_MOONPAY_API_KEY?.trim()
  const moonPayBaseUrl =
    import.meta.env.VITE_MOONPAY_BASE_URL?.trim() || DEFAULT_MOONPAY_BASE_URL
  const moonPayCurrencyCode = getMoonPayCurrencyCode(
    isBitcoinChain,
    isDogecoinChain,
    isSolanaChain,
    activeChain?.name
  )
  const showMoonPayEntry = import.meta.env.VITE_ENABLE_MOONPAY_ENTRY === 'true'
  const moonPayButtonTitle = !moonPayApiKey
    ? 'Set VITE_MOONPAY_API_KEY to enable MoonPay'
    : 'Buy crypto with MoonPay'

  const canUseRingSwap = kyberWidgetEngine
    .supportedChainIds()
    .includes(swapChainId)
  const swapButtonTitle = canUseRingSwap
    ? t('swapOpenTitle')
    : t('swapDisabledNonEvm')

  const canUseEarn = useIsEarnSupported()
  const earnButtonTitle = canUseEarn
    ? t('earnTitle')
    : t('earnDisabledNonEthereum')

  const handleCloseSend = () => {
    setShowSend(false)
    setSendToken(undefined)
    onSendFormClosed?.()
  }

  const renderSendForm = () => {
    if (isBitcoinChain) return <BitcoinSendForm onClose={handleCloseSend} />
    if (isDogecoinChain) return <DogecoinSendForm onClose={handleCloseSend} />
    if (isSolanaChain) return <SolanaSendForm onClose={handleCloseSend} />
    if (isSmartAccount)
      return (
        <SmartAccountSendForm
          onClose={handleCloseSend}
          initialToken={sendToken}
        />
      )
    return <EOASendForm onClose={handleCloseSend} initialToken={sendToken} />
  }

  const handleSwapClick = () => {
    if (!canUseRingSwap) return
    setSwapDappOpen(true)
  }

  const handleMoonPayClick = () => {
    if (!moonPayApiKey || !moonPayCurrencyCode) {
      setToastVisible(true)
      return
    }

    const moonPayUrl = new URL(moonPayBaseUrl)
    moonPayUrl.searchParams.set('apiKey', moonPayApiKey)
    moonPayUrl.searchParams.set('defaultCurrencyCode', moonPayCurrencyCode)
    moonPayUrl.searchParams.set('baseCurrencyCode', 'usd')
    moonPayUrl.searchParams.set('redirectURL', window.location.href)

    window.open(moonPayUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="transaction-actions-container">
      {swapDappOpen && swapSigner && (
        <RingSwapFrame
          signer={swapSigner}
          chainId={swapChainId}
          rpcUrl={swapRpcUrl}
          onClose={() => setSwapDappOpen(false)}
        />
      )}
      <div className="action-buttons" role="toolbar" aria-label={t('wallet')}>
        <ActionCircleEntry
          variantClass="action-circle-entry--send"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          }
          label={t('send')}
          onClick={() => setShowSend(true)}
          testId={TESTID.SEND_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--receive"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="8 17 12 21 16 17" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
            </svg>
          }
          label={t('receive')}
          onClick={() => setShowReceive(true)}
          testId={TESTID.RECEIVE_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--swap"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          }
          label={t('walletActionRingSwap')}
          onClick={handleSwapClick}
          disabled={!canUseRingSwap}
          title={swapButtonTitle}
          testId={TESTID.SWAP_BUTTON}
        />
        {showMoonPayEntry && (
          <ActionCircleEntry
            variantClass="action-circle-entry--buy"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            label={t('walletActionBuy')}
            onClick={handleMoonPayClick}
            title={moonPayButtonTitle}
            testId={TESTID.BUY_BUTTON}
          />
        )}
        {devMode && (
          <ActionCircleEntry
            variantClass="action-circle-entry--earn"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M2 12h20" />
                <circle cx="12" cy="12" r="10" opacity="0.2" />
              </svg>
            }
            label={t('walletActionEarn')}
            onClick={() => setShowEarn(true)}
            disabled={!canUseEarn}
            title={earnButtonTitle}
            testId={TESTID.EARN_BUTTON}
          />
        )}
        {devMode && (
          <ActionCircleEntry
            variantClass="action-circle-entry--predict"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </svg>
            }
            label={t('walletActionPredict')}
            onClick={() => {}}
            disabled
            title={t('comingSoon')}
            testId={TESTID.PREDICT_BUTTON}
          />
        )}
        {devMode && (
          <ActionCircleEntry
            variantClass="action-circle-entry--dapp"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            }
            label={t('walletActionDapp')}
            onClick={() => {}}
            disabled
            title={t('comingSoon')}
            testId={TESTID.DAPP_BUTTON}
          />
        )}
        {devMode && (
          <ActionCircleEntry
            variantClass="action-circle-entry--bridge"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
                <path d="M6 15l6-6 6 6" />
              </svg>
            }
            label={t('walletActionBridge')}
            onClick={() => {}}
            disabled
            title={t('comingSoon')}
            testId={TESTID.BRIDGE_BUTTON}
          />
        )}
      </div>

      {showSend && renderSendForm()}

      {showReceive && (
        <ReceiveDialog
          address={receiveAddress}
          onClose={() => setShowReceive(false)}
        />
      )}

      {showEarn && <EarnDialog onClose={() => setShowEarn(false)} />}

      <Toast
        message={t('serviceNotAvailable')}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        duration={2000}
      />
    </div>
  )
}

export default QuickActionBar
