import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useCardProvider, useCardAccounts, useCardTopUp } from '../hooks'
import '../services/adapter'
import { cardProviderRegistry } from '../services/registry'
import CardOnboardingView from './onboarding/CardOnboardingView'
import KYCWebView from './onboarding/KYCWebView'
import CardDashboardView from './dashboard/CardDashboardView'
import CardSettingsView from './management/CardSettingsView'
import TopUpEntry from './topup/TopUpEntry'
import TopUpAssetSelect from './topup/TopUpAssetSelect'
import TopUpAmountInput from './topup/TopUpAmountInput'
import TopUpConfirm from './topup/TopUpConfirm'
import TopUpResult from './topup/TopUpResult'
import './Card.css'

type CardView = 'main' | 'topup' | 'settings' | 'kyc'

const ZERO_EVM = '0x0000000000000000000000000000000000000000'

const CardApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<CardView>('main')
  const [kycUrl, setKycUrl] = useState<string | null>(null)
  /** Full-screen card detail (from Card tab); back collapses into tab body, does not switch tab. */
  const [cardDetailFullscreen, setCardDetailFullscreen] = useState(true)
  const kycPollTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const { activeWallet } = useAuth()
  const { loading: adapterLoading } = useCardProvider()
  const { accounts, activeCard, loading: accountsLoading, reload: reloadAccounts } = useCardAccounts()
  const topUp = useCardTopUp()

  const walletAddress = activeWallet?.address ?? ZERO_EVM

  useEffect(() => {
    if (activeCard) setCardDetailFullscreen(true)
  }, [activeCard?.id])

  const clearKycPollTimeouts = useCallback(() => {
    for (const id of kycPollTimeoutsRef.current) {
      clearTimeout(id)
    }
    kycPollTimeoutsRef.current = []
  }, [])

  useEffect(() => () => clearKycPollTimeouts(), [clearKycPollTimeouts])

  const handleLeaveCardDetailFullscreen = useCallback(() => {
    setCardDetailFullscreen(false)
  }, [])

  // ─── KYC Flow ──────────────────────────────────────

  const handleApply = useCallback(
    async (providerId: string) => {
      clearKycPollTimeouts()
      const impl = cardProviderRegistry.get(providerId)
      if (!impl) return

      if (!impl.isLinked()) {
        await impl.initialize({
          apiKey: '',
          environment: 'sandbox',
          walletAddress,
        })
      }

      try {
        const session = await impl.startKYC()
        setKycUrl(session.url)
        setCurrentView('kyc')

        const pollKYC = () => {
          void (async () => {
            try {
              const status = await impl.getKYCStatus()
              if (status === 'approved') {
                await impl.createCard('virtual')
                setKycUrl(null)
                reloadAccounts()
                setCurrentView('main')
              } else if (status === 'rejected') {
                setKycUrl(null)
                setCurrentView('main')
              } else {
                const id = setTimeout(pollKYC, 2000)
                kycPollTimeoutsRef.current.push(id)
              }
            } catch {
              setKycUrl(null)
              setCurrentView('main')
            }
          })()
        }

        const firstPoll = setTimeout(pollKYC, 3500)
        kycPollTimeoutsRef.current.push(firstPoll)
      } catch (err) {
        console.error('Failed to start KYC:', err)
        setKycUrl(null)
        setCurrentView('main')
      }
    },
    [clearKycPollTimeouts, reloadAccounts, walletAddress],
  )

  const handleKYCComplete = useCallback(() => {
    clearKycPollTimeouts()
    const active = cardProviderRegistry.getActiveProvider()
    setKycUrl(null)
    if (!active) {
      setCurrentView('main')
      return
    }

    active
      .getKYCStatus()
      .then(async (status) => {
        if (status === 'approved') {
          await active.createCard('virtual')
          reloadAccounts()
        }
        setCurrentView('main')
      })
      .catch(() => {
        setCurrentView('main')
      })
  }, [clearKycPollTimeouts, reloadAccounts])

  /** User explicitly closed the KYC view — cancel pending polls. */
  const handleKYCDismiss = useCallback(() => {
    clearKycPollTimeouts()
    setKycUrl(null)
    setCurrentView('main')
  }, [clearKycPollTimeouts])

  /** Iframe failed to load — cancel pending polls and return to main. */
  const handleKYCError = useCallback((_error: string) => {
    clearKycPollTimeouts()
    setKycUrl(null)
    setCurrentView('main')
  }, [clearKycPollTimeouts])

  // ─── Navigation ────────────────────────────────────

  const handleNavigateToTopUp = useCallback(() => {
    setCurrentView('topup')
    topUp.startTopUp()
  }, [topUp])

  const handleNavigateToSettings = useCallback(() => {
    setCurrentView('settings')
  }, [])

  const handleBackToMain = useCallback(() => {
    setCurrentView('main')
    topUp.reset()
  }, [topUp])

  // ─── TopUp Flow ────────────────────────────────────

  const handleTopUpBack = useCallback(() => {
    if (topUp.stage === 'selecting_asset') {
      setCurrentView('main')
      topUp.reset()
    } else if (topUp.stage === 'entering_amount') {
      topUp.selectAsset(topUp.selectedAsset!) // go back to asset select
      // Reset stage to selecting_asset
      topUp.reset()
      topUp.startTopUp()
    } else {
      topUp.reset()
      setCurrentView('main')
    }
  }, [topUp])

  // ─── Render ────────────────────────────────────────

  if (adapterLoading || accountsLoading) {
    return (
      <div className="card-app card-app--loading">
        <div className="card-app__spinner" />
        <p className="card-app__loading-text">Loading...</p>
      </div>
    )
  }

  if (kycUrl) {
    return (
      <div className="card-app">
        <KYCWebView
          url={kycUrl}
          onComplete={handleKYCComplete}
          onDismiss={handleKYCDismiss}
          onError={handleKYCError}
        />
      </div>
    )
  }

  if (accounts.length === 0 && currentView !== 'kyc') {
    return (
      <div className="card-app">
        <CardOnboardingView onApply={handleApply} />
      </div>
    )
  }

  // Settings
  if (currentView === 'settings' && activeCard) {
    return (
      <div className="card-app">
        <CardSettingsView card={activeCard} onBack={handleBackToMain} />
      </div>
    )
  }

  // TopUp Flow
  if (currentView === 'topup') {
    switch (topUp.stage) {
      case 'selecting_asset':
        return (
          <div className="card-app">
            <TopUpAssetSelect
              assets={topUp.supportedAssets}
              onSelect={topUp.selectAsset}
              onBack={handleTopUpBack}
            />
          </div>
        )
      case 'entering_amount':
        return (
          <div className="card-app">
            {topUp.selectedAsset && (
              <TopUpAmountInput
                asset={topUp.selectedAsset}
                amount={topUp.amount}
                onAmountChange={topUp.setAmount}
                onContinue={topUp.confirm}
                onBack={handleTopUpBack}
              />
            )}
          </div>
        )
      case 'confirming':
      case 'signing':
        return (
          <div className="card-app">
            {topUp.order && (
              <TopUpConfirm
                order={topUp.order}
                onConfirm={() => topUp.sign()}
                onBack={handleTopUpBack}
              />
            )}
          </div>
        )
      case 'processing':
        return (
          <div className="card-app card-app--loading">
            <div className="card-app__spinner" />
            <p className="card-app__loading-text">Processing...</p>
          </div>
        )
      case 'success':
        return (
          <div className="card-app">
            {topUp.result && (
              <TopUpResult
                result={topUp.result}
                onDone={handleBackToMain}
              />
            )}
          </div>
        )
      case 'error':
        return (
          <div className="card-app">
            <div className="card-app__error">
              <p className="card-app__error-text">{topUp.error}</p>
              <button
                type="button"
                className="card-app__error-btn"
                onClick={handleBackToMain}
              >
                Back
              </button>
            </div>
          </div>
        )
      default:
        // idle — show topup entry point
        return (
          <div className="card-app">
            <TopUpEntry onStart={topUp.startTopUp} />
          </div>
        )
    }
  }

  // Main Dashboard
  if (activeCard) {
    return (
      <div className="card-app">
        <CardDashboardView
          key={`${activeCard.id}-${cardDetailFullscreen ? 'fs' : 'inline'}`}
          card={activeCard}
          onTopUp={handleNavigateToTopUp}
          onSettings={handleNavigateToSettings}
          presentation={cardDetailFullscreen ? 'fullscreen' : 'inline'}
          onBack={handleLeaveCardDetailFullscreen}
        />
      </div>
    )
  }

  return null
}

export default CardApp
