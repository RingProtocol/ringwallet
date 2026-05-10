import React from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../../../../components/common/TitleBar'
import { useI18n } from '../../../../i18n'
import type { CardAccount } from '../../types'
import { useCardTransactions } from '../../hooks/useCardTransactions'
import CardOverview from './CardOverview'
import TransactionList from './TransactionList'
import '../Card.css'

interface Props {
  card: CardAccount
  onTopUp: () => void
  onSettings: () => void
  /** Full-screen overlay vs scroll inside Card tab. */
  presentation?: 'fullscreen' | 'inline'
  /** Collapses fullscreen detail into the Card tab (only used when presentation is fullscreen). */
  onBack: () => void
}

const CardDashboardView: React.FC<Props> = ({
  card,
  onTopUp,
  onSettings,
  presentation = 'fullscreen',
  onBack,
}) => {
  const { t } = useI18n()
  const { transactions, loading, hasMore, loadMore } = useCardTransactions()

  const body = (
    <div className="card-dashboard">
      <CardOverview
        card={card}
        onTopUp={onTopUp}
        onSettings={onSettings}
      />

      <div className="card-dashboard__section">
        <h3 className="card-dashboard__section-title">
          {t('cardRecentTransactions')}
        </h3>
        <TransactionList
          transactions={transactions}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
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

  if (presentation === 'inline') {
    return (
      <div className="card-dashboard-page card-dashboard-page--inline">
        <div className="card-dashboard-page__content">{body}</div>
      </div>
    )
  }

  const content = (
    <div className="card-dashboard-page">
      <TitleBar onBack={onBack} backLabel={t('back')}>
        <span className="card-dashboard-page__title">{t('cardTab')}</span>
      </TitleBar>
      <div className="card-dashboard-page__content">{body}</div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default CardDashboardView
