import { useCallback, useState } from 'react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginButton from '@/components/LoginButton'
import Introduce from '@/components/Introduce'
import RingWalletLogo from '@/components/RingWalletLogo'
import WalletSwitcher from '@/components/accounts/WalletSwitcher'
import AccountDrawer from '@/components/AccountDrawer'
import WalletMainPage from '@/components/WalletMainPage'
import type { ChainToken } from '@/models/ChainTokens'
import { VERSION } from './version'
import TokenDetailRoute from './routes/TokenDetailRoute'
import { buildTokenDetailPath } from './routes/tokenRoute'
import './App.css'

function AuthenticatedRoutes() {
  const { activeChain } = useAuth()
  const navigate = useNavigate()

  const handleTokenSelect = useCallback(
    (token: ChainToken) => {
      if (!activeChain) return
      navigate(buildTokenDetailPath(activeChain.id, token), {
        state: { token },
      })
    },
    [activeChain, navigate]
  )

  return (
    <Routes>
      <Route
        path="/"
        element={
          <WalletMainPage
            appVersion={VERSION}
            onTokenSelect={activeChain ? handleTokenSelect : undefined}
          />
        }
      />
      <Route path="/token/:chainId/:tokenId" element={<TokenDetailRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

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
            <div className="card--guest-content">
              <RingWalletLogo />
              <Introduce />
            </div>
            <LoginButton />
          </div>
          <footer className="app-version">version:{VERSION}</footer>
        </>
      ) : (
        <AuthenticatedRoutes />
      )}
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  )
}

export default App
