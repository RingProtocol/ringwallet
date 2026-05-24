import React, { useState } from 'react'
import ChainSwitcher from '../chains/ChainSwitcher'
import NativeBalance from '../assets/NativeBalance'
import QuickActionBar from '../common/QuickActionBar'
import TokenBalance from '../assets/TokenBalance'
import InstallPwaGuideCard from '../pwa/InstallPwaGuideCard'
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

export const WalletTabHeader: React.FC<
  Pick<
    WalletTabProps,
    'totalAssetUsd' | 'pendingSendToken' | 'onSendFormClosed' | 'onAddressClick'
  >
> = ({ totalAssetUsd, pendingSendToken, onSendFormClosed, onAddressClick }) => {
  const { t } = useI18n()
  const { activeAccount } = useAuth()
  const [showInstallGuide, setShowInstallGuide] = useState(false)

  return (
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
          <button
            type="button"
            className="wallet-main-page__getapp-btn"
            onClick={() => setShowInstallGuide(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t('walletActionGetApp')}</span>
          </button>
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

      {showInstallGuide && (
        <div
          className="wallet-main-page__getapp-overlay"
          onClick={() => setShowInstallGuide(false)}
        >
          <div
            className="wallet-main-page__getapp-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wallet-main-page__getapp-header">
              <h3>{t('walletActionGetApp')}</h3>
              <button
                type="button"
                className="wallet-main-page__getapp-close"
                onClick={() => setShowInstallGuide(false)}
                aria-label={t('close')}
              >
                <svg
                  width="16"
                  height="16"
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
            </div>
            <InstallPwaGuideCard />
          </div>
        </div>
      )}
    </div>
  )
}

export const WalletTabBody: React.FC<
  Pick<WalletTabProps, 'tokens' | 'supportsTokens' | 'onTokenSelect'>
> = ({ tokens, supportsTokens, onTokenSelect }) => {
  return (
    <div className="wallet-main-page__assets">
      <TokenBalance
        tokens={tokens}
        supportsTokens={supportsTokens}
        onTokenSelect={onTokenSelect}
      />
    </div>
  )
}

const WalletTab: React.FC<WalletTabProps> = (props) => {
  return (
    <>
      <WalletTabHeader {...props} />
      <WalletTabBody {...props} />
    </>
  )
}

export default WalletTab
