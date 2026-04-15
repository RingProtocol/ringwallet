import React from 'react'
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
  /** USD on the active chain only (formatted). */
  currentChainUsd: string
  /** Opens the same account drawer as the header menu (wallet switcher). */
  onAddressClick?: () => void
}

const NativeBalance: React.FC<NativeBalanceProps> = ({
  allChainsUsd,
  currentChainUsd,
  onAddressClick,
}) => {
  const { activeAccount } = useAuth()
  const { t } = useI18n()

  if (!activeAccount) return null

  return (
    <div className="balance-display">
      <div className="balance-usd-stack">
        <div className="balance-usd-row balance-usd-row--secondary">
          <span className="balance-usd-label">{t('balanceAllChainsUsd')}</span>
          <span className="balance-usd-value">{allChainsUsd}</span>
        </div>
        <div className="balance-usd-row balance-usd-row--primary">
          <span className="balance-usd-label">
            {t('balanceCurrentChainUsd')}
          </span>
          <span
            className="balance-usd-value balance-amount"
            data-testid={TESTID.BALANCE_AMOUNT}
          >
            {currentChainUsd}
          </span>
        </div>
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
