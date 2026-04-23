import React from 'react'
import ChainSwitcher from '../fullscreencomps/ChainSwitcher'
import NativeBalance from '../NativeBalance'
import QuickActionBar from '../QuickActionBar'
import TokenBalance from '../TokenBalance'
import type { ChainToken } from '../../models/ChainTokens'
import type { SendTokenOption } from '../transaction/types'
import { useI18n } from '../../i18n'
import { useAuth } from '../../contexts/AuthContext'

export interface WalletTabProps {
  totalAssetUsd: string
  tokens: ChainToken[]
  supportsTokens: boolean
  onTokenSelect: (token: ChainToken) => void
  pendingSendToken?: SendTokenOption
  onSendFormClosed: () => void
  onAddressClick: () => void
}

const WalletTab: React.FC<WalletTabProps> = ({
  totalAssetUsd,
  tokens,
  supportsTokens,
  onTokenSelect,
  pendingSendToken,
  onSendFormClosed,
  onAddressClick,
}) => {
  const { t } = useI18n()
  const { activeAccount } = useAuth()

  return (
    <>
      <div className="wallet-main-page__hero">
        <div className="wallet-main-page__hero-gradient" aria-hidden />
        <header className="wallet-main-page__top-bar">
          <button
            type="button"
            className="wallet-main-page__wallet-pill"
            onClick={onAddressClick}
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
          </div>
        </header>
        <div className="wallet-main-page__hero-body">
          <NativeBalance
            allChainsUsd={totalAssetUsd}
            onAddressClick={onAddressClick}
          />
          <QuickActionBar
            initialToken={pendingSendToken}
            onSendFormClosed={onSendFormClosed}
          />
        </div>
      </div>

      <div className="wallet-main-page__assets">
        <TokenBalance
          tokens={tokens}
          supportsTokens={supportsTokens}
          onTokenSelect={onTokenSelect}
        />
      </div>
    </>
  )
}

export default WalletTab
