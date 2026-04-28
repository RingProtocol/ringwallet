import React from 'react'
import { NATIVE_COIN_ICON } from '../../config/chains'
import { useAuth } from '../../contexts/AuthContext'
import ChainIcon from '../ChainIcon'
import TransactionSheet from './TransactionSheet'
import type { SendTokenOption } from './types'

interface SendFormLayoutProps {
  title: string
  walletHint: string
  error?: string
  onBack?: () => void
  selectedToken?: SendTokenOption
  children: React.ReactNode
}

const SendFormLayout: React.FC<SendFormLayoutProps> = ({
  title,
  walletHint,
  error,
  onBack,
  selectedToken,
  children,
}) => {
  const { activeChain } = useAuth()
  const symbol =
    selectedToken?.type === 'native'
      ? selectedToken.symbol
      : (selectedToken?.token.symbol ?? '')
  const logoUrl =
    selectedToken?.type === 'erc20' ? selectedToken.token.logo?.trim() : ''
  const symbolIcon = symbol ? NATIVE_COIN_ICON[symbol] : undefined

  return (
    <TransactionSheet variant="fullscreen">
      <div className="send-form__header">
        {onBack ? (
          <button
            type="button"
            className="send-form__back"
            onClick={onBack}
            aria-label="Back"
          >
            ‹
          </button>
        ) : (
          <span />
        )}
        <h3>{title}</h3>
        <span />
      </div>
      {selectedToken && (
        <div className="send-form__token-hero">
          <div className="send-form__token-icon">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={symbol}
                className="send-form__token-logo"
              />
            ) : symbolIcon ? (
              <img
                src={symbolIcon}
                alt={symbol}
                className="send-form__token-logo"
              />
            ) : selectedToken.type === 'native' ? (
              <ChainIcon icon={activeChain?.icon} symbol={symbol} size={68} />
            ) : (
              <span className="send-form__token-fallback">
                {symbol.charAt(0)}
              </span>
            )}
          </div>
          <div className="send-form__token-symbol">{symbol}</div>
        </div>
      )}
      <div className="current-wallet-hint">{walletHint}</div>
      <div className="send-form__body">
        {children}
        {error && <div className="error-text">{error}</div>}
      </div>
    </TransactionSheet>
  )
}

export default SendFormLayout
