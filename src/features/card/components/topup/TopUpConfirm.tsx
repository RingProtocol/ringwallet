import React from 'react'
import type { TopUpOrder } from '../../types'
import CurrencyAmount from '../shared/CurrencyAmount'
import '../Card.css'

interface Props {
  order: TopUpOrder
  onConfirm: () => void
  onBack: () => void
}

const TopUpConfirm: React.FC<Props> = ({ order, onConfirm, onBack }) => {
  const truncatedFrom = `${order.fromAddress.slice(0, 6)}...${order.fromAddress.slice(-4)}`
  const truncatedTo = `${order.toAddress.slice(0, 6)}...${order.toAddress.slice(-4)}`

  return (
    <div className="topup-confirm">
      <div className="topup-confirm__header">
        <button
          type="button"
          className="topup-confirm__back"
          onClick={onBack}
          aria-label="Back"
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
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h3 className="topup-confirm__title">Confirm Top Up</h3>
      </div>

      <div className="topup-confirm__summary">
        <div className="topup-confirm__amount-section">
          <span className="topup-confirm__amount-label">You are topping up</span>
          <CurrencyAmount
            amount={order.amount}
            className="topup-confirm__amount-value"
          />
        </div>
      </div>

      <div className="topup-confirm__details">
        <div className="topup-confirm__detail-row">
          <span className="topup-confirm__detail-label">Asset</span>
          <span className="topup-confirm__detail-value">
            {order.asset} ({order.chain})
          </span>
        </div>
        <div className="topup-confirm__detail-row">
          <span className="topup-confirm__detail-label">From</span>
          <span className="topup-confirm__detail-value topup-confirm__detail-value--mono">
            {truncatedFrom}
          </span>
        </div>
        <div className="topup-confirm__detail-row">
          <span className="topup-confirm__detail-label">To</span>
          <span className="topup-confirm__detail-value topup-confirm__detail-value--mono">
            {truncatedTo}
          </span>
        </div>
        {order.gasEstimate && (
          <div className="topup-confirm__detail-row">
            <span className="topup-confirm__detail-label">Est. Gas</span>
            <span className="topup-confirm__detail-value">
              {order.gasEstimate}
            </span>
          </div>
        )}
        <div className="topup-confirm__detail-row">
          <span className="topup-confirm__detail-label">Expires</span>
          <span className="topup-confirm__detail-value">
            {new Date(order.expiresAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="topup-confirm__warning">
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>Please review the details carefully. This action cannot be undone.</span>
      </div>

      <button
        type="button"
        className="topup-confirm__confirm-btn"
        onClick={onConfirm}
      >
        Confirm &amp; Pay
      </button>
    </div>
  )
}

export default TopUpConfirm
