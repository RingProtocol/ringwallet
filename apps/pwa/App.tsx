import React from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginButton from '@/components/LoginButton'
import Introduce from '@/components/Introduce'
import RingWalletLogo from '@/components/RingWalletLogo'
import WalletSwitcher from '@/components/WalletSwitcher'
import ChainSwitcher from '@/components/ChainSwitcher'
import BalanceDisplay from '@/components/BalanceDisplay'
import TransactionActions from '@/components/TransactionActions'
import './App.css'

function AppContent() {
  const { isLoggedIn } = useAuth()

  return (
    <div className="app">
      <div className="header-actions">
        {isLoggedIn && <ChainSwitcher />}
        <WalletSwitcher />
      </div>
      <div className={`card ${!isLoggedIn ? 'card--guest' : ''}`}>
        {isLoggedIn && <BalanceDisplay />}
        {isLoggedIn && <TransactionActions />}

        {isLoggedIn && (
          <div className="welcome-message">
            <h2>🎉 登录成功！</h2>
            <p>您现在可以享受完整的钱包功能</p>
          </div>
        )}

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
