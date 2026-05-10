import React from 'react'
import type { CardAccount } from '../../types'
import CardOverview from './CardOverview'
import TransactionList from './TransactionList'
import '../Card.css'

interface Props {
  card: CardAccount
  onTopUp: () => void
  onSettings: () => void
}

const MOCK_TRANSACTIONS = [
  {
    id: 'tx-1',
    cardId: 'card-1',
    type: 'purchase' as const,
    amount: '-25.50',
    currency: 'USD',
    merchant: 'Starbucks',
    status: 'completed' as const,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'tx-2',
    cardId: 'card-1',
    type: 'topup' as const,
    amount: '100.00',
    currency: 'USD',
    merchant: 'Crypto Top Up',
    status: 'completed' as const,
    timestamp: Date.now() - 86400000,
  },
  {
    id: 'tx-3',
    cardId: 'card-1',
    type: 'purchase' as const,
    amount: '-9.99',
    currency: 'USD',
    merchant: 'Netflix',
    status: 'completed' as const,
    timestamp: Date.now() - 172800000,
  },
]

const CardDashboardView: React.FC<Props> = ({ card, onTopUp, onSettings }) => {
  return (
    <div className="card-dashboard">
      <CardOverview
        card={card}
        onTopUp={onTopUp}
        onSettings={onSettings}
      />

      <div className="card-dashboard__section">
        <h3 className="card-dashboard__section-title">Recent Transactions</h3>
        <TransactionList
          transactions={MOCK_TRANSACTIONS}
          loading={false}
          hasMore={false}
        />
      </div>

      <div className="card-dashboard__footer">
        <button
          type="button"
          className="card-dashboard__settings-link"
          onClick={onSettings}
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Card Settings</span>
        </button>
      </div>
    </div>
  )
}

export default CardDashboardView
