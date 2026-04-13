import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import './NativeBalance.css'
import { TESTID } from './testids'

function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface NativeBalanceProps {
  balance: string
  /** Opens the same account drawer as the header menu (wallet switcher). */
  onAddressClick?: () => void
}

const NativeBalance: React.FC<NativeBalanceProps> = ({
  balance,
  onAddressClick,
}) => {
  const { activeAccount } = useAuth()

  if (!activeAccount) return null

  return (
    <div className="balance-display">
      <div className="balance-amount" data-testid={TESTID.BALANCE_AMOUNT}>
        {balance}
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
