import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import ChainIcon from './ChainIcon'
import './NativeBalance.css'
import { TESTID } from './testids'

function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface NativeBalanceProps {
  balance: string
}

const NativeBalance: React.FC<NativeBalanceProps> = ({ balance }) => {
  const { activeChain, activeAccount } = useAuth()

  if (!activeAccount) return null

  return (
    <div className="balance-display">
      <div className="balance-amount" data-testid={TESTID.BALANCE_AMOUNT}>
        {balance}{' '}
        <span className="currency-symbol">
          <ChainIcon
            icon={activeChain.icon}
            symbol={activeChain.symbol || 'ETH'}
            size={20}
          />
          {activeChain.symbol || 'ETH'}
        </span>
      </div>
      {activeAccount?.address && (
        <div className="wallet-address" data-testid={TESTID.WALLET_ADDRESS}>
          {shortenAddress(activeAccount.address)}
        </div>
      )}
    </div>
  )
}

export default NativeBalance
