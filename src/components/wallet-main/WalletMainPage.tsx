import React, { useCallback, useState } from 'react'
import TokenDetailPage from '../TokenDetailPage'
import type { ChainToken } from '../../models/ChainTokens'
import { useAuth } from '../../contexts/AuthContext'
import { useBalanceManager } from '../../hooks/useBalanceManager'
import type { SendTokenOption } from '../transaction/types'

import BottomTabBar from './BottomTabBar'
import WalletTab from './WalletTab'
import ActivityTab from './ActivityTab'
import MoreTab from './MoreTab'
import type { BottomTab } from './BottomTabBar'
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
  const { activeChain } = useAuth()
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

      <div className="wallet-main-page__scroll">
        {bottomTab === 'wallet' && (
          <WalletTab
            totalAssetUsd={totalAssetUsd}
            tokens={tokens}
            supportsTokens={supportsTokens}
            onTokenSelect={openTokenDetail}
            pendingSendToken={pendingSendToken}
            onSendFormClosed={() => setPendingSendToken(undefined)}
            onAddressClick={openMoreFromAddress}
          />
        )}
        {bottomTab === 'activity' && <ActivityTab />}
        {bottomTab === 'more' && (
          <MoreTab
            appVersion={appVersion}
            expandWalletListOnOpen={moreExpandWalletListOnOpen}
            pulseExpandWalletList={moreWalletListPulse}
          />
        )}
      </div>

      <BottomTabBar activeTab={bottomTab} onSelectTab={selectTab} />

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
