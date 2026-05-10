import React from 'react'
import type { CardAccount } from '../../types'
import CardStatusBadge from './CardStatusBadge'
import CurrencyAmount from '../shared/CurrencyAmount'
import '../Card.css'

interface Props {
  card: CardAccount
  onTopUp: () => void
  onSettings: () => void
}

const CardOverview: React.FC<Props> = ({ card, onTopUp, onSettings }) => {
  const isFrozen = card.status === 'frozen'

  return (
    <div className="card-overview">
      <div className={`card-overview__visual ${isFrozen ? 'card-overview__visual--frozen' : ''}`}>
        <div className="card-overview__card-face">
          <div className="card-overview__card-header">
            <span className="card-overview__card-provider">Immersve</span>
            <CardStatusBadge status={card.status} />
          </div>

          <div className="card-overview__card-number">
            &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.last4}
          </div>

          <div className="card-overview__card-footer">
            <div className="card-overview__card-holder">
              <span className="card-overview__card-holder-label">Cardholder</span>
              <span className="card-overview__card-holder-name">
                {card.cardholderName}
              </span>
            </div>
            <div className="card-overview__card-balance">
              <span className="card-overview__card-balance-label">Balance</span>
              <CurrencyAmount
                amount={card.balance}
                currency={card.currency}
                className="card-overview__card-balance-value"
              />
            </div>
          </div>
        </div>

        {isFrozen && (
          <div className="card-overview__frozen-overlay">
            <span className="card-overview__frozen-label">Frozen</span>
          </div>
        )}
      </div>

      <div className="card-overview__actions">
        <button
          type="button"
          className="card-overview__topup-btn"
          onClick={onTopUp}
          disabled={isFrozen}
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Top Up</span>
        </button>

        <button
          type="button"
          className="card-overview__settings-btn"
          onClick={onSettings}
          aria-label="Card Settings"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default CardOverview
