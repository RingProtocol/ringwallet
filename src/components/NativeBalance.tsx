import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n'
import './NativeBalance.css'
import { TESTID } from './testids'

function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface NativeBalanceProps {
  /** Total USD across polled chains (formatted). */
  allChainsUsd: string
  /** Opens the same account drawer as the header menu (wallet switcher). */
  onAddressClick?: () => void
}

const NativeBalance: React.FC<NativeBalanceProps> = ({
  allChainsUsd,
  onAddressClick,
}) => {
  const { activeAccount } = useAuth()
  const { t } = useI18n()
  const [hideBalance, setHideBalance] = useState(false)

  if (!activeAccount) return null

  // Parse the main balance value for display
  const balanceText = hideBalance ? '••••••' : allChainsUsd

  return (
    <div className="balance-display">
      <div className="balance-header">
        <span className="balance-label">{t('totalBalance')}</span>
        <button
          type="button"
          className="balance-toggle"
          onClick={() => setHideBalance((v) => !v)}
          aria-label={hideBalance ? t('showBalance') : t('hideBalance')}
        >
          {hideBalance ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      <div className="balance-amount-row">
        <div className="balance-amount" data-testid={TESTID.BALANCE_AMOUNT}>
          {balanceText}
        </div>
        {/* <div className="balance-change-badge">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          +$312 (2.45%)
        </div> */}
      </div>

      {activeAccount?.address &&
        (onAddressClick ? (
          <button
            type="button"
            className="wallet-address wallet-address--clickable"
            data-testid={TESTID.WALLET_ADDRESS}
            onClick={onAddressClick}
            aria-label="Accounts and wallets"
          >
            {shortenAddress(activeAccount.address)}
          </button>
        ) : (
          <div className="wallet-address" data-testid={TESTID.WALLET_ADDRESS}>
            {shortenAddress(activeAccount.address)}
          </div>
        ))}
    </div>
  )
}

export default NativeBalance
