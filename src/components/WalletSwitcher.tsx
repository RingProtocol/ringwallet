import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import './WalletSwitcher.css'

interface WalletSwitcherProps {
  onOpenDrawer?: () => void
}

const WalletSwitcher: React.FC<WalletSwitcherProps> = ({ onOpenDrawer }) => {
  const { isLoggedIn, wallets } = useAuth()

  if (!isLoggedIn || wallets.length === 0) {
    return null
  }

  return (
    <button className="menu-trigger" onClick={onOpenDrawer} aria-label="Menu">
      <span className="menu-dot" />
      <span className="menu-dot" />
      <span className="menu-dot" />
    </button>
  )
}

export default WalletSwitcher
