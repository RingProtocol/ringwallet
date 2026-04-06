import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import {
  EOASendForm,
  SmartAccountSendForm,
  SolanaSendForm,
  BitcoinSendForm,
  ReceiveDialog,
} from './transaction'
import './TransactionActions.css'

const DEFAULT_MOONPAY_BASE_URL = 'https://buy.moonpay.com'

function getMoonPayCurrencyCode(
  isBitcoinChain: boolean,
  isSolanaChain: boolean,
  chainName?: string
): string | null {
  if (isBitcoinChain) return 'btc'
  if (isSolanaChain) return 'sol'

  const normalizedChainName = chainName?.toLowerCase() ?? ''

  if (normalizedChainName.includes('polygon')) return 'matic'
  if (normalizedChainName.includes('ethereum')) return 'eth'
  if (normalizedChainName.includes('arbitrum')) return 'eth_arbitrum'
  if (normalizedChainName.includes('optimism')) return 'eth_optimism'
  if (normalizedChainName.includes('base')) return 'eth_base'

  return 'eth'
}

const TransactionActions: React.FC = () => {
  const {
    isLoggedIn,
    activeWallet,
    activeAccount,
    activeChain,
    isSolanaChain,
    isBitcoinChain,
  } = useAuth()
  const [showSend, setShowSend] = useState(false)
  const [showReceive, setShowReceive] = useState(false)

  if (!isLoggedIn) return null
  if (!activeAccount) return null

  const isSmartAccount =
    !isSolanaChain &&
    !isBitcoinChain &&
    activeWallet?.type === WalletType.SmartContract
  const receiveAddress = activeAccount.address
  const moonPayApiKey = import.meta.env.VITE_MOONPAY_API_KEY?.trim()
  const moonPayBaseUrl =
    import.meta.env.VITE_MOONPAY_BASE_URL?.trim() || DEFAULT_MOONPAY_BASE_URL
  const moonPayCurrencyCode = getMoonPayCurrencyCode(
    isBitcoinChain,
    isSolanaChain,
    activeChain?.name
  )
  const showMoonPayEntry = import.meta.env.VITE_ENABLE_MOONPAY_ENTRY === 'true'
  const isMoonPayEnabled = Boolean(moonPayApiKey && moonPayCurrencyCode)
  const moonPayButtonTitle = !moonPayApiKey
    ? 'Set VITE_MOONPAY_API_KEY to enable MoonPay'
    : 'Buy crypto with MoonPay'

  const renderSendForm = () => {
    if (isBitcoinChain)
      return <BitcoinSendForm onClose={() => setShowSend(false)} />
    if (isSolanaChain)
      return <SolanaSendForm onClose={() => setShowSend(false)} />
    if (isSmartAccount)
      return <SmartAccountSendForm onClose={() => setShowSend(false)} />
    return <EOASendForm onClose={() => setShowSend(false)} />
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
      <div className="action-buttons">
        <button
          className="action-btn send-btn"
          onClick={() => setShowSend(true)}
        >
          📤 Send
        </button>
        <button
          className="action-btn receive-btn"
          onClick={() => setShowReceive(true)}
        >
          📥 Receive
        </button>
        {showMoonPayEntry && (
          <button
            className="action-btn buy-btn"
            onClick={handleMoonPayClick}
            disabled={!isMoonPayEnabled}
            title={moonPayButtonTitle}
          >
            💳 Buy
          </button>
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

export default TransactionActions
