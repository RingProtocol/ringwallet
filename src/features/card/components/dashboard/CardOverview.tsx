import React from 'react'
import { CARD_PROVIDERS } from '../../../../config/cardProviders'
import type { CardAccount } from '../../types'
import CardStatusBadge from './CardStatusBadge'
import CurrencyAmount from '../shared/CurrencyAmount'
import '../Card.css'

interface Props {
  card: CardAccount
  onTopUp: () => void
}

const CardOverview: React.FC<Props> = ({ card, onTopUp }) => {
  const isFrozen = card.status === 'frozen'
  const providerMeta = CARD_PROVIDERS.find((p) => p.id === card.provider)
  const providerLabel = providerMeta?.name ?? card.provider
  const holderDisplay =
    card.cardholderName.trim().length > 0 ? card.cardholderName : '—'

  return (
    <div className="card-overview">
      <div
        className={`card-overview__visual ${isFrozen ? 'card-overview__visual--frozen' : ''}`}
      >
        <div className="card-overview__card-face">
          <div className="card-overview__card-header">
            <span className="card-overview__card-provider">
              {providerLabel}
            </span>
            <CardStatusBadge status={card.status} />
          </div>

          <div className="card-overview__card-number">
            &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;
            &bull;&bull;&bull;&bull; {card.last4}
          </div>

          <div className="card-overview__card-footer">
            <div className="card-overview__card-holder">
              <span className="card-overview__card-holder-label">
                Cardholder
              </span>
              <span className="card-overview__card-holder-name">
                {holderDisplay}
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
      </div>
    </div>
  )
}

export default CardOverview
