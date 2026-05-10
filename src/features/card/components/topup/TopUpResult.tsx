import React from 'react'
import type { TopUpResult } from '../../types'
import CurrencyAmount from '../shared/CurrencyAmount'
import '../Card.css'

interface Props {
  result: TopUpResult
  onDone: () => void
}

const TopUpResult: React.FC<Props> = ({ result, onDone }) => {
  const isSuccess = result.status === 'confirmed'
  const isPending = result.status === 'pending'

  return (
    <div className="topup-result">
      <div className={`topup-result__icon ${isSuccess ? 'topup-result__icon--success' : isPending ? 'topup-result__icon--pending' : 'topup-result__icon--failed'}`}>
        {isSuccess && (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
        {isPending && (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
        {!isSuccess && !isPending && (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
      </div>

      <h3 className="topup-result__title">
        {isSuccess
          ? 'Top Up Successful'
          : isPending
            ? 'Top Up Processing'
            : 'Top Up Failed'}
      </h3>

      {isSuccess && (
        <p className="topup-result__description">
          Your card has been topped up. Funds will be available shortly.
        </p>
      )}
      {isPending && (
        <p className="topup-result__description">
          Your top-up is being processed. This may take a few minutes.
        </p>
      )}
      {!isSuccess && !isPending && (
        <p className="topup-result__description">
          The top-up transaction failed. Please try again or contact support.
        </p>
      )}

      <div className="topup-result__details">
        <div className="topup-result__detail-row">
          <span className="topup-result__detail-label">Order ID</span>
          <span className="topup-result__detail-value topup-result__detail-value--mono">
            {result.orderId}
          </span>
        </div>
        {result.txHash && (
          <div className="topup-result__detail-row">
            <span className="topup-result__detail-label">Tx Hash</span>
            <span className="topup-result__detail-value topup-result__detail-value--mono">
              {result.txHash.slice(0, 10)}...{result.txHash.slice(-6)}
            </span>
          </div>
        )}
        <div className="topup-result__detail-row">
          <span className="topup-result__detail-label">Status</span>
          <span className="topup-result__detail-value">{result.status}</span>
        </div>
      </div>

      <button
        type="button"
        className="topup-result__done-btn"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  )
}

export default TopUpResult
