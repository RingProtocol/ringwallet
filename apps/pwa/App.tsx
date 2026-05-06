import React, { useState, useEffect } from 'react'
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

  // iOS PWA: initial viewport may not include safe-area; force full screen height
  // so tabbar sits at the correct position on first paint.
  useEffect(() => {
    const getSafeAreaBottom = () => {
      const div = document.createElement('div')
      div.style.position = 'fixed'
      div.style.bottom = '0'
      div.style.left = '-9999px'
      div.style.width = '1px'
      div.style.height = '1px'
      div.style.paddingBottom = 'env(safe-area-inset-bottom)'
      document.body.appendChild(div)
      const pb = parseFloat(getComputedStyle(div).paddingBottom) || 0
      document.body.removeChild(div)
      return pb
    }

    const setFullHeight = () => {
      const safeAreaBottom = getSafeAreaBottom()
      const h = window.innerHeight + safeAreaBottom
      document.documentElement.style.height = h + 'px'
      document.body.style.height = h + 'px'
    }

    setFullHeight()
    window.addEventListener('resize', setFullHeight)
    return () => window.removeEventListener('resize', setFullHeight)
  }, [])

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
            <div className="card--guest-content">
              <RingWalletLogo />
              <Introduce />
            </div>
            <LoginButton />
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
