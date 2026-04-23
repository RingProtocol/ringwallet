import React, { useCallback, useState } from 'react'
import ChainSwitcher from './fullscreencomps/ChainSwitcher'
import NativeBalance from './NativeBalance'
import QuickActionBar from './QuickActionBar'
import AccountDrawerPanel from './AccountDrawerPanel'
import TokenBalance from './TokenBalance'
import TokenDetailPage from './TokenDetailPage'
import TransactionHistory from './TransactionHistory'
import type { ChainToken } from '../models/ChainTokens'
import { useAuth } from '../contexts/AuthContext'
import { useBalanceManager } from '../hooks/useBalanceManager'
import type { SendTokenOption } from './transaction/types'
import { useI18n } from '../i18n'

import BottomTabs from './tabs/BottomTabs'
import type { BottomTab } from './tabs/BottomTabs'
import './WalletMainPage.css'

export interface WalletMainPageProps {
  /** Shown at the bottom of the More tab only (not on Wallet / Activity). */
  appVersion?: string
  /** When set, shows a close control and overlay layout (e.g. DApp fullscreen peek). */
  onClose?: () => void
  /** Narrow panel over DApp: same tabs, compact layout. */
  peekOverDapp?: boolean
  className?: string
}

const TAB_QUERY_KEYS: BottomTab[] = ['wallet', 'activity', 'more']

function getInitialBottomTab(): BottomTab {
  if (typeof window === 'undefined') return 'wallet'
  const p = new URLSearchParams(window.location.search)
  const t = p.get('tab')
  if (t === 'tokens') return 'wallet'
  if (t === 'dapps') return 'wallet'
  if (t && TAB_QUERY_KEYS.includes(t as BottomTab)) return t as BottomTab
  return 'wallet'
}

const WalletMainPage: React.FC<WalletMainPageProps> = ({
  appVersion,
  onClose,
  peekOverDapp = true,
  className,
}) => {
  const { t } = useI18n()
  const { activeChain, activeAccount } = useAuth()
  const [bottomTab, setBottomTab] = useState<BottomTab>(getInitialBottomTab)
  const [moreExpandWalletListOnOpen, setMoreExpandWalletListOnOpen] =
    useState(false)
  const [moreWalletListPulse, setMoreWalletListPulse] = useState(0)
  const [pendingSendToken, setPendingSendToken] = useState<
    SendTokenOption | undefined
  >(undefined)
  const [tokenDetail, setTokenDetail] = useState<ChainToken | null>(null)

  const { totalAssetUsd, tokens, supportsTokens } = useBalanceManager()

  const goToMore = useCallback((expandWalletList: boolean) => {
    setMoreExpandWalletListOnOpen(expandWalletList)
    if (expandWalletList) {
      setMoreWalletListPulse((n) => n + 1)
    }
    setBottomTab('more')
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'more')
      window.history.replaceState(null, '', url.toString())
    }
  }, [])

  const openMoreFromAddress = useCallback(() => {
    goToMore(true)
  }, [goToMore])

  const selectTab = useCallback((tab: BottomTab) => {
    setBottomTab(tab)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }, [])

  const openTokenDetail = useCallback((token: ChainToken) => {
    setTokenDetail(token)
  }, [])

  const closeTokenDetail = useCallback(() => {
    setTokenDetail(null)
  }, [])

  return (
    <div
      className={[
        'wallet-main-page',
        onClose ? 'wallet-main-page--overlay' : '',
        peekOverDapp ? 'wallet-main-page--peek' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {onClose && (
        <button
          type="button"
          className="wallet-main-page__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {bottomTab === 'wallet' ? (
        <div className="wallet-main-page__hero">
          <div className="wallet-main-page__hero-gradient" aria-hidden />
          <header className="wallet-main-page__top-bar">
            <button
              type="button"
              className="wallet-main-page__wallet-pill"
              onClick={openMoreFromAddress}
            >
              <span className="wallet-main-page__wallet-pill-dot">◉</span>
              <span className="wallet-main-page__wallet-pill-label">
                {activeAccount
                  ? `${t('wallet')} #${activeAccount.index + 1}`
                  : t('wallet')}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.7 }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="wallet-main-page__top-bar-right">
              <ChainSwitcher />
              {/* <button type="button" className="wallet-main-page__gallery-btn" aria-label="Gallery">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="9" r="1.4" fill="currentColor"/>
                  <path d="M20 17l-4-4-7 7"/>
                </svg>
              </button> */}
            </div>
          </header>
          <div className="wallet-main-page__hero-body">
            <NativeBalance
              allChainsUsd={totalAssetUsd}
              onAddressClick={openMoreFromAddress}
            />
            <QuickActionBar
              initialToken={pendingSendToken}
              onSendFormClosed={() => setPendingSendToken(undefined)}
            />
          </div>
        </div>
      ) : (
        <header className="wallet-main-page__top-bar wallet-main-page__top-bar--collapsed">
          <h1 className="wallet-main-page__tab-title">
            {bottomTab === 'activity' ? t('activityTab') : t('moreTab')}
          </h1>
          {bottomTab === 'activity' && (
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
          )}
        </header>
      )}

      <div className="wallet-main-page__scroll">
        {bottomTab === 'wallet' && (
          <div className="wallet-main-page__assets">
            <TokenBalance
              tokens={tokens}
              supportsTokens={supportsTokens}
              onTokenSelect={openTokenDetail}
            />
          </div>
        )}
        {bottomTab === 'activity' && (
          <div className="wallet-main-page__activity">
            <TransactionHistory />
          </div>
        )}
        {bottomTab === 'more' && (
          <div className="wallet-main-page__more-outer">
            <div className="wallet-main-page__more">
              <AccountDrawerPanel
                active={bottomTab === 'more'}
                expandWalletListOnOpen={moreExpandWalletListOnOpen}
                pulseExpandWalletList={moreWalletListPulse}
              />
              {appVersion != null && appVersion !== '' && (
                <footer className="wallet-main-page__more-version app-version">
                  version:{appVersion}
                </footer>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomTabs activeTab={bottomTab} onSelectTab={selectTab} />

      {tokenDetail && activeChain && (
        <TokenDetailPage
          token={tokenDetail}
          chain={activeChain}
          onBack={closeTokenDetail}
        />
      )}
    </div>
  )
}

export default WalletMainPage
