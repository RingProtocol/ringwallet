import React, { useState } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginButton from '@/components/LoginButton'
import Introduce from '@/components/Introduce'
import RingWalletLogo from '@/components/RingWalletLogo'
import WalletSwitcher from '@/components/WalletSwitcher'
import AccountDrawer from '@/components/AccountDrawer'
import WalletMainPage from '@/components/WalletMainPage'
import { VERSION } from './version'
import './App.css'

function AppContent() {
  const { isLoggedIn } = useAuth()
  const [guestDrawerOpen, setGuestDrawerOpen] = useState(false)

  return (
    <div className="app">
      {!isLoggedIn ? (
        <>
          <div className="header-actions">
            <WalletSwitcher onOpenDrawer={() => setGuestDrawerOpen(true)} />
          </div>
          <AccountDrawer
            isOpen={guestDrawerOpen}
            onClose={() => setGuestDrawerOpen(false)}
          />
          <div className="card card--guest">
            <div className="card--guest-logo-wrap">
              <RingWalletLogo />
            </div>
            <LoginButton />
            <Introduce />
          </div>
          <footer className="app-version">version:{VERSION}</footer>
        </>
      ) : (
        <WalletMainPage appVersion={VERSION} />
      )}
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
