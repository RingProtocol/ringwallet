import React from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginButton from '@/components/LoginButton'
import Introduce from '@/components/Introduce'
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
        <ChainSwitcher />
        <WalletSwitcher />
      </div>
      <div className="card">
        {isLoggedIn && <BalanceDisplay />}
        {isLoggedIn && <TransactionActions />}
        {!isLoggedIn && <h1 className="title">Hello World!</h1>}
        {!isLoggedIn && <p className="subtitle">欢迎使用New Wallet</p>}
        
        {isLoggedIn ? (
          <div className="welcome-message">
            <h2>🎉 登录成功！</h2>
            <p>您现在可以享受完整的钱包功能</p>
          </div>
        ) : (
          <div className="guest-message">
            <p>请登录以开始使用钱包</p>
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
