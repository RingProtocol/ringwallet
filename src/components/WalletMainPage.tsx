import React, { useCallback, useState } from 'react'
import WalletSwitcher from './WalletSwitcher'
import ChainSwitcher from './fullscreencomps/ChainSwitcher'
import NativeBalance from './NativeBalance'
import TransactionActions from './TransactionActions'
import AccountDrawer from './AccountDrawer'
import MultiTabs from './MultiTabs'
import { useBalanceManager } from '../hooks/useBalanceManager'
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
  peekOverDapp = true,
  className,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingSendToken, setPendingSendToken] = useState<
    SendTokenOption | undefined
  >(undefined)

  const { nativeBalance, tokens, isLoading, supportsTokens } =
    useBalanceManager()

  const handleTokenSend = useCallback(
    (token: {
      symbol: string
      name: string
      address?: string
      decimals?: number
    }) => {
      if (token.address && token.decimals != null) {
        setPendingSendToken({
          type: 'erc20',
          token: {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
          },
        })
      } else {
        setPendingSendToken({ type: 'native', symbol: token.symbol })
      }
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
        <NativeBalance balance={nativeBalance} />
        <TransactionActions
          initialToken={pendingSendToken}
          onSendFormClosed={() => setPendingSendToken(undefined)}
        />
        <MultiTabs
          onOpenSettings={() => setDrawerOpen(true)}
          hideDAppsTab={peekOverDapp}
          onTokenSend={handleTokenSend}
          tokens={tokens}
          isLoading={isLoading}
          supportsTokens={supportsTokens}
        />
      </div>
      {footer}
    </div>
  )
}

export default WalletMainPage
