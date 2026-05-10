import React from 'react'
import type { CardAccount } from '../../types'
import CardFreezeToggle from './CardFreezeToggle'
import '../Card.css'

interface Props {
  card: CardAccount
  onBack: () => void
}

const CardSettingsView: React.FC<Props> = ({ card, onBack }) => {
  const handleFreezeToggle = () => {
    // TODO: call hook to toggle freeze
  }

  const handleSpendingLimit = () => {
    // TODO: navigate to spending limit settings
  }

  const handleRevealDetails = () => {
    // TODO: navigate to card details reveal
  }

  const handleCloseCard = () => {
    // TODO: confirm and close card
  }

  return (
    <div className="card-settings">
      <div className="card-settings__header">
        <button
          type="button"
          className="card-settings__back"
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
        <h2 className="card-settings__title">Card Settings</h2>
      </div>

      <div className="card-settings__sections">
        <div className="card-settings__section">
          <h3 className="card-settings__section-title">Security</h3>
          <div className="card-settings__item">
            <div className="card-settings__item-info">
              <span className="card-settings__item-label">Freeze Card</span>
              <span className="card-settings__item-desc">
                Temporarily disable all transactions
              </span>
            </div>
            <CardFreezeToggle
              frozen={card.status === 'frozen'}
              onToggle={handleFreezeToggle}
            />
          </div>
        </div>

        <div className="card-settings__section">
          <h3 className="card-settings__section-title">Limits</h3>
          <button
            type="button"
            className="card-settings__item card-settings__item--clickable"
            onClick={handleSpendingLimit}
          >
            <div className="card-settings__item-info">
              <span className="card-settings__item-label">Spending Limits</span>
              <span className="card-settings__item-desc">
                Set daily, monthly, and per-transaction limits
              </span>
            </div>
            <span className="card-settings__item-arrow" aria-hidden="true">
              &rsaquo;
            </span>
          </button>
        </div>

        <div className="card-settings__section">
          <h3 className="card-settings__section-title">Card Info</h3>
          <button
            type="button"
            className="card-settings__item card-settings__item--clickable"
            onClick={handleRevealDetails}
          >
            <div className="card-settings__item-info">
              <span className="card-settings__item-label">View Card Details</span>
              <span className="card-settings__item-desc">
                Card number, CVC, and expiry date
              </span>
            </div>
            <span className="card-settings__item-arrow" aria-hidden="true">
              &rsaquo;
            </span>
          </button>
        </div>

        <div className="card-settings__section card-settings__section--danger">
          <h3 className="card-settings__section-title">Danger Zone</h3>
          <button
            type="button"
            className="card-settings__item card-settings__item--danger"
            onClick={handleCloseCard}
          >
            <div className="card-settings__item-info">
              <span className="card-settings__item-label">Close Card</span>
              <span className="card-settings__item-desc">
                Permanently close this card. This cannot be undone.
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardSettingsView
