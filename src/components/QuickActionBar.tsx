import React, { useState, useEffect } from 'react'
import DAppContainer from '@/features/dapps/components/DAppContainer'
import '@/features/dapps/components/DApps.css'
import type { DAppInfo } from '@/features/dapps/types/dapp'
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

/** Built-in Ring Exchange swap UI (in-app via DAppContainer + WalletBridge). */
export const RING_SWAP_DAPP: DAppInfo = {
  id: 900_001,
  name: 'Ring',
  description: 'Ring Exchange',
  url: 'https://dapp-test.new-interface-7vn.pages.dev/#/swap',
  icon: 'https://app.ring.exchange/favicon.png',
  chains: [],
  category: 'swap',
  top: 0,
}

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
  const [showSend, setShowSend] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [swapDappOpen, setSwapDappOpen] = useState(false)
  const [sendToken, setSendToken] = useState<SendTokenOption | undefined>(
    undefined
  )

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
  const isMoonPayEnabled = Boolean(moonPayApiKey && moonPayCurrencyCode)
  const moonPayButtonTitle = !moonPayApiKey
    ? 'Set VITE_MOONPAY_API_KEY to enable MoonPay'
    : 'Buy crypto with MoonPay'

  const canUseRingSwap = !isSolanaChain && !isBitcoinChain && !isDogecoinChain
  const swapButtonTitle = canUseRingSwap
    ? t('swapOpenTitle')
    : t('swapDisabledNonEvm')

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
    if (!moonPayApiKey || !moonPayCurrencyCode) return

    const moonPayUrl = new URL(moonPayBaseUrl)
    moonPayUrl.searchParams.set('apiKey', moonPayApiKey)
    moonPayUrl.searchParams.set('defaultCurrencyCode', moonPayCurrencyCode)
    moonPayUrl.searchParams.set('baseCurrencyCode', 'usd')
    moonPayUrl.searchParams.set('redirectURL', window.location.href)

    window.open(moonPayUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="transaction-actions-container">
      {swapDappOpen && (
        <DAppContainer
          dapp={RING_SWAP_DAPP}
          onBack={() => setSwapDappOpen(false)}
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
            disabled={!isMoonPayEnabled}
            title={moonPayButtonTitle}
            testId={TESTID.BUY_BUTTON}
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
    </div>
  )
}

export default QuickActionBar
