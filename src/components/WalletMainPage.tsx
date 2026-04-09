import React, { useCallback, useState } from 'react'
import WalletSwitcher from './WalletSwitcher'
import ChainSwitcher from './fullscreencomps/ChainSwitcher'
import BalanceDisplay from './BalanceDisplay'
import TransactionActions from './TransactionActions'
import AccountDrawer from './AccountDrawer'
import MultiTabs from './MultiTabs'
import type { SendTokenOption } from './transaction/types'
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
  const [pendingSendToken, setPendingSendToken] = useState<
    SendTokenOption | undefined
  >(undefined)

  const handleTokenSend = useCallback(
    (token: {
      symbol: string
      name: string
      address?: string
      decimals?: number
    }) => {
      if (!token.address || token.decimals == null) return
      setPendingSendToken({
        type: 'erc20',
        token: {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
        },
      })
    },
    []
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
      <div className="header-actions">
        <ChainSwitcher />
        <WalletSwitcher onOpenDrawer={() => setDrawerOpen(true)} />
      </div>
      <AccountDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="card wallet-main-page__card">
        <BalanceDisplay />
        <TransactionActions
          initialToken={pendingSendToken}
          onSendFormClosed={() => setPendingSendToken(undefined)}
        />
        <MultiTabs
          onOpenSettings={() => setDrawerOpen(true)}
          hideDAppsTab={peekOverDapp}
          onTokenSend={handleTokenSend}
        />
      </div>
      {footer}
    </div>
  )
}

export default WalletMainPage
