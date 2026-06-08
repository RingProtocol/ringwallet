import React, { useCallback, useMemo } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import TokenDetailPage from '@/components/detail/TokenDetailPage'
import { useAuth } from '@/contexts/AuthContext'
import { useBalanceManager } from '@/hooks/useBalanceManager'
import type { ChainToken } from '@/models/ChainTokens'
import { getTokenRouteId } from './tokenRoute'

interface TokenDetailRouteState {
  token?: ChainToken
}

const WALLET_HOME_PATH = '/?tab=wallet'

function RouteFallback({
  title,
  description,
  onBack,
}: {
  title: string
  description: string
  onBack: () => void
}) {
  return (
    <div className="app">
      <div className="card">
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" onClick={onBack}>
          Back to wallet
        </button>
      </div>
    </div>
  )
}

export default function TokenDetailRoute() {
  const { isLoggedIn, activeChain } = useAuth()
  const { tokens, isLoading } = useBalanceManager()
  const navigate = useNavigate()
  const location = useLocation()
  const { chainId, tokenId } = useParams<{
    chainId: string
    tokenId: string
  }>()

  const routeState = location.state as TokenDetailRouteState | null
  const normalizedTokenId = decodeURIComponent(tokenId ?? '').toLowerCase()

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(WALLET_HOME_PATH, { replace: true })
  }, [navigate])

  const token = useMemo(() => {
    const stateToken = routeState?.token
    if (stateToken && getTokenRouteId(stateToken) === normalizedTokenId) {
      return stateToken
    }
    return (
      tokens.find(
        (candidate) => getTokenRouteId(candidate) === normalizedTokenId
      ) ?? null
    )
  }, [normalizedTokenId, routeState?.token, tokens])

  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }

  if (!activeChain) {
    return <Navigate to="/" replace />
  }

  if (!chainId || String(activeChain.id) !== chainId) {
    return <Navigate to={WALLET_HOME_PATH} replace />
  }

  if (!token) {
    if (isLoading) {
      return (
        <RouteFallback
          title="Loading token"
          description="Fetching the latest token detail data for this route."
          onBack={handleBack}
        />
      )
    }

    return (
      <RouteFallback
        title="Token not found"
        description="This token is not available in the current active chain view."
        onBack={handleBack}
      />
    )
  }

  return (
    <TokenDetailPage token={token} chain={activeChain} onBack={handleBack} />
  )
}
