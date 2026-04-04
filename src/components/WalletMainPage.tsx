import React, { useState } from 'react'
import WalletSwitcher from './WalletSwitcher'
import ChainSwitcher from './fullscreencomps/ChainSwitcher'
import BalanceDisplay from './BalanceDisplay'
import TransactionActions from './TransactionActions'
import AccountDrawer from './AccountDrawer'
import MultiTabs from './MultiTabs'
import './WalletMainPage.css'

export interface WalletMainPageProps {
  footer?: React.ReactNode
  /** When set, shows a close control and overlay layout (e.g. DApp fullscreen peek). */
  onClose?: () => void
  /** Narrow panel over DApp: omit DApps tab. */
  peekOverDapp?: boolean
  className?: string
}

const WalletMainPage: React.FC<WalletMainPageProps> = ({
  footer,
  onClose,
  peekOverDapp = false,
  className,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      <div className="header-actions">
        <ChainSwitcher />
        <WalletSwitcher onOpenDrawer={() => setDrawerOpen(true)} />
      </div>
      <AccountDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="card wallet-main-page__card">
        <BalanceDisplay />
        <TransactionActions />
        <MultiTabs
          onOpenSettings={() => setDrawerOpen(true)}
          hideDAppsTab={peekOverDapp}
        />
      </div>
      {footer}
    </div>
  )
}

export default WalletMainPage
