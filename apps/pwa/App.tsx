import React, { useState } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginButton from '@/components/LoginButton'
import Introduce from '@/components/Introduce'
import RingWalletLogo from '@/components/RingWalletLogo'
import WalletSwitcher from '@/components/WalletSwitcher'
import ChainSwitcher from '@/components/ChainSwitcher'
import BalanceDisplay from '@/components/BalanceDisplay'
import TransactionActions from '@/components/TransactionActions'
import AccountDrawer from '@/components/AccountDrawer'
import './App.css'

function AppContent() {
  const { isLoggedIn } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="app">
      <div className="header-actions">
        {isLoggedIn && <ChainSwitcher />}
        <WalletSwitcher onOpenDrawer={() => setDrawerOpen(true)} />
      </div>
      <AccountDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className={`card ${!isLoggedIn ? 'card--guest' : ''}`}>
        {isLoggedIn && <BalanceDisplay />}
        {isLoggedIn && <TransactionActions />}

        {!isLoggedIn && (
          <div className="card--guest-logo-wrap">
            <RingWalletLogo />
          </div>
        )}
        <LoginButton />
        {!isLoggedIn && <Introduce />}
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
