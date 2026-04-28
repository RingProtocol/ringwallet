import React from 'react'
import type { SendTokenOption } from './types'

interface SendConfirmPreviewProps {
  selectedToken: SendTokenOption
  amount: string
  chainName: string
  fromAddress: string
  toAddress: string
  onCancel: () => void
  onConfirm: () => void
  isConfirming?: boolean
}

function shortenAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 7)}…${address.slice(-5)}`
}

const SendConfirmPreview: React.FC<SendConfirmPreviewProps> = ({
  selectedToken,
  amount,
  chainName,
  fromAddress,
  toAddress,
  onCancel,
  onConfirm,
  isConfirming = false,
}) => {
  const symbol =
    selectedToken.type === 'native'
      ? selectedToken.symbol
      : selectedToken.token.symbol

  return (
    <div className="send-preview">
      <h3 className="send-preview__title">
        Confirm <span className="send-preview__title-accent">Send</span>
      </h3>

      <div className="send-preview__amount">
        -{amount || '0'} {symbol}
      </div>

      <div className="send-preview__rows">
        <div className="send-preview__row">
          <span>Network</span>
          <span>{chainName}</span>
        </div>
        <div className="send-preview__row">
          <span>From</span>
          <span title={fromAddress}>{shortenAddress(fromAddress)}</span>
        </div>
        <div className="send-preview__row">
          <span>To</span>
          <span title={toAddress}>{shortenAddress(toAddress)}</span>
        </div>
      </div>

      <div className="send-preview__actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? 'Signing...' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

export default SendConfirmPreview
