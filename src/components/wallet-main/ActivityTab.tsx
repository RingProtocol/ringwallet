import React from 'react'
import TransactionHistory from '../TransactionHistory'
import { useI18n } from '../../i18n'

export const ActivityTabHeader: React.FC = () => {
  const { t } = useI18n()

  return (
    <header className="wallet-main-page__top-bar wallet-main-page__top-bar--collapsed">
      <h1 className="wallet-main-page__tab-title">{t('activityTab')}</h1>
      <div className="wallet-main-page__activity-actions">
        <button
          type="button"
          className="wallet-main-page__icon-btn"
          aria-label={t('search')}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button
          type="button"
          className="wallet-main-page__icon-btn"
          aria-label={t('refresh')}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export const ActivityTabBody: React.FC = () => {
  return (
    <div className="wallet-main-page__activity">
      <TransactionHistory />
    </div>
  )
}

const ActivityTab: React.FC = () => {
  return (
    <>
      <ActivityTabHeader />
      <ActivityTabBody />
    </>
  )
}

export default ActivityTab
