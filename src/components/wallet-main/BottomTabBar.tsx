import React from 'react'
import { useI18n } from '../../i18n'
import { TESTID } from '../testids'

export type BottomTab = 'wallet' | 'activity' | 'card' | 'more'

export interface BottomTabBarProps {
  activeTab: BottomTab
  onSelectTab: (tab: BottomTab) => void
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { t } = useI18n()

  return (
    <div className="wallet-main-page__bottom-wrap">
      <div className="wallet-main-page__tab-bar-spacer" aria-hidden />
      <div className="wallet-main-page__bottom-dock">
        <nav className="wallet-bottom-nav">
          <button
            type="button"
            className={`wallet-bottom-nav__btn ${activeTab === 'wallet' ? 'wallet-bottom-nav__btn--active' : ''}`}
            onClick={() => onSelectTab('wallet')}
            data-testid={TESTID.TAB_WALLET}
            aria-label={t('wallet')}
          >
            <span className="wallet-bottom-nav__icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="3" />
                <path d="M16 12h.01" />
                <path d="M2 10h20" />
              </svg>
            </span>
            <span className="wallet-bottom-nav__label">{t('wallet')}</span>
          </button>
          <button
            type="button"
            className={`wallet-bottom-nav__btn ${activeTab === 'activity' ? 'wallet-bottom-nav__btn--active' : ''}`}
            onClick={() => onSelectTab('activity')}
            data-testid={TESTID.TAB_ACTIVITY}
            aria-label={t('activityTab')}
          >
            <span className="wallet-bottom-nav__icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            <span className="wallet-bottom-nav__label">{t('activityTab')}</span>
          </button>
          <button
            type="button"
            className={`wallet-bottom-nav__btn ${activeTab === 'card' ? 'wallet-bottom-nav__btn--active' : ''}`}
            onClick={() => onSelectTab('card')}
            data-testid={TESTID.TAB_CARD}
            aria-label={t('cardTab')}
          >
            <span className="wallet-bottom-nav__icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="3" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </span>
            <span className="wallet-bottom-nav__label">{t('cardTab')}</span>
          </button>
          <button
            type="button"
            className={`wallet-bottom-nav__btn ${activeTab === 'more' ? 'wallet-bottom-nav__btn--active' : ''}`}
            onClick={() => onSelectTab('more')}
            data-testid={TESTID.TAB_MORE}
            aria-label={t('moreTab')}
          >
            <span className="wallet-bottom-nav__icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </span>
            <span className="wallet-bottom-nav__label">{t('moreTab')}</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

export default BottomTabBar
