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
import { ActionCircleEntry } from './ActionCircleEntry'
import './TransactionActions.css'
import { TESTID } from './testids'

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

interface TransactionActionsProps {
  initialToken?: SendTokenOption
  onSendFormClosed?: () => void
}

const TransactionActions: React.FC<TransactionActionsProps> = ({
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
          icon="📤"
          label={t('send')}
          onClick={() => setShowSend(true)}
          testId={TESTID.SEND_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--receive"
          icon="📥"
          label={t('receive')}
          onClick={() => setShowReceive(true)}
          testId={TESTID.RECEIVE_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--swap"
          icon="⇄"
          label={t('walletActionRingSwap')}
          onClick={handleSwapClick}
          disabled={!canUseRingSwap}
          title={swapButtonTitle}
          testId={TESTID.SWAP_BUTTON}
        />
        {showMoonPayEntry && (
          <ActionCircleEntry
            variantClass="action-circle-entry--buy"
            icon="💳"
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

export { ActionCircleEntry } from './ActionCircleEntry'
export type { ActionCircleEntryProps } from './ActionCircleEntry'
export default TransactionActions
