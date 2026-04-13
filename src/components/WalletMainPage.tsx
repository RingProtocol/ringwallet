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
  const [drawerExpandWalletListOnOpen, setDrawerExpandWalletListOnOpen] =
    useState(false)
  const [drawerWalletListPulse, setDrawerWalletListPulse] = useState(0)
  const [pendingSendToken, setPendingSendToken] = useState<
    SendTokenOption | undefined
  >(undefined)

  const { nativeBalance, tokens, supportsTokens } = useBalanceManager()

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setDrawerWalletListPulse(0)
  }, [])

  const openDrawerFromMenu = useCallback(() => {
    setDrawerExpandWalletListOnOpen(false)
    setDrawerOpen(true)
  }, [])

  const openDrawerFromAddress = useCallback(() => {
    setDrawerExpandWalletListOnOpen(true)
    setDrawerWalletListPulse((n) => n + 1)
    setDrawerOpen(true)
  }, [])

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
        <WalletSwitcher onOpenDrawer={openDrawerFromMenu} />
      </div>
      <AccountDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        expandWalletListOnOpen={drawerExpandWalletListOnOpen}
        pulseExpandWalletList={drawerWalletListPulse}
      />
      <div className="card wallet-main-page__card">
        <NativeBalance
          balance={nativeBalance}
          onAddressClick={openDrawerFromAddress}
        />
        <TransactionActions
          initialToken={pendingSendToken}
          onSendFormClosed={() => setPendingSendToken(undefined)}
        />
        <MultiTabs
          onOpenSettings={openDrawerFromMenu}
          hideDAppsTab={peekOverDapp}
          onTokenSend={handleTokenSend}
          tokens={tokens}
          supportsTokens={supportsTokens}
        />
      </div>
      {footer}
    </div>
  )
}

export default WalletMainPage
