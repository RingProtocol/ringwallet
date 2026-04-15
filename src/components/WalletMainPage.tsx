import React, { useCallback, useState } from 'react'
import ChainSwitcher from './fullscreencomps/ChainSwitcher'
import NativeBalance from './NativeBalance'
import TransactionActions from './TransactionActions'
import AccountDrawerPanel from './AccountDrawerPanel'
import TokenBalance from './TokenBalance'
import TransactionHistory from './TransactionHistory'
import {
  chainTokenDisplayName,
  chainTokenDisplaySymbol,
} from '../features/balance/balanceManager'
import type { ChainToken } from '../models/ChainTokens'
import { useAuth } from '../contexts/AuthContext'
import { useBalanceManager } from '../hooks/useBalanceManager'
import type { SendTokenOption } from './transaction/types'
import { useI18n } from '../i18n'
import { TESTID } from './testids'
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

type BottomTab = 'wallet' | 'activity' | 'more'

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
  const { activeChain } = useAuth()
  const [bottomTab, setBottomTab] = useState<BottomTab>(getInitialBottomTab)
  const [moreExpandWalletListOnOpen, setMoreExpandWalletListOnOpen] =
    useState(false)
  const [moreWalletListPulse, setMoreWalletListPulse] = useState(0)
  const [pendingSendToken, setPendingSendToken] = useState<
    SendTokenOption | undefined
  >(undefined)

  const { totalAssetUsd, currentChainUsd, tokens, supportsTokens } =
    useBalanceManager()

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

  const handleTokenSend = useCallback(
    (token: ChainToken) => {
      if (!activeChain) return
      if (token.tokenAddress) {
        setPendingSendToken({
          type: 'erc20',
          token: {
            address: token.tokenAddress,
            symbol: chainTokenDisplaySymbol(token, activeChain),
            name: chainTokenDisplayName(token, activeChain),
            decimals: token.tokenMetadata.decimals ?? 18,
          },
        })
      } else {
        setPendingSendToken({
          type: 'native',
          symbol: chainTokenDisplaySymbol(token, activeChain),
        })
      }
    },
    [activeChain]
  )

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
          ✕
        </button>
      )}

      {bottomTab === 'wallet' ? (
        <div className="wallet-main-page__hero">
          <div className="wallet-main-page__hero-gradient" aria-hidden />
          <header className="wallet-main-page__top-dock">
            <ChainSwitcher />
          </header>
          <div className="wallet-main-page__hero-body">
            <NativeBalance
              allChainsUsd={totalAssetUsd}
              currentChainUsd={currentChainUsd}
              onAddressClick={openMoreFromAddress}
            />
            <TransactionActions
              initialToken={pendingSendToken}
              onSendFormClosed={() => setPendingSendToken(undefined)}
            />
          </div>
        </div>
      ) : (
        <header className="wallet-main-page__top-dock wallet-main-page__top-dock--collapsed wallet-main-page__top-dock--alone" />
      )}

      <div className="wallet-main-page__scroll">
        {bottomTab === 'wallet' && (
          <div className="card wallet-main-page__card wallet-main-page__card--below-hero">
            <div className="wallet-main-page__assets">
              <TokenBalance
                tokens={tokens}
                supportsTokens={supportsTokens}
                onTokenSend={handleTokenSend}
              />
            </div>
          </div>
        )}
        {bottomTab === 'activity' && (
          <div className="card wallet-main-page__card wallet-main-page__card--activity">
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

      <div className="wallet-main-page__bottom-wrap">
        <div className="wallet-main-page__tab-bar-spacer" aria-hidden />
        <div className="wallet-main-page__bottom-dock">
          <nav className="wallet-bottom-nav">
            <button
              type="button"
              className={`wallet-bottom-nav__btn ${bottomTab === 'wallet' ? 'wallet-bottom-nav__btn--active' : ''}`}
              onClick={() => selectTab('wallet')}
              data-testid={TESTID.TAB_WALLET}
              aria-label={t('wallet')}
            >
              <span className="wallet-bottom-nav__icon" aria-hidden="true">
                💼
              </span>
              <span className="wallet-bottom-nav__label">{t('wallet')}</span>
            </button>
            <button
              type="button"
              className={`wallet-bottom-nav__btn ${bottomTab === 'activity' ? 'wallet-bottom-nav__btn--active' : ''}`}
              onClick={() => selectTab('activity')}
              data-testid={TESTID.TAB_ACTIVITY}
              aria-label={t('activityTab')}
            >
              <span className="wallet-bottom-nav__icon" aria-hidden="true">
                📋
              </span>
              <span className="wallet-bottom-nav__label">
                {t('activityTab')}
              </span>
            </button>
            <button
              type="button"
              className={`wallet-bottom-nav__btn ${bottomTab === 'more' ? 'wallet-bottom-nav__btn--active' : ''}`}
              onClick={() => selectTab('more')}
              data-testid={TESTID.TAB_MORE}
              aria-label={t('moreTab')}
            >
              <span className="wallet-bottom-nav__icon" aria-hidden="true">
                ⋯
              </span>
              <span className="wallet-bottom-nav__label">{t('moreTab')}</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default WalletMainPage
