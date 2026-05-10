import React, { useState, useCallback } from 'react'
import { useCardProvider, useCardAccounts, useCardTopUp } from '../hooks'
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

const CardApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<CardView>('main')
  const { adapter, loading: adapterLoading } = useCardProvider()
  const { accounts, activeCard, loading: accountsLoading, reload: reloadAccounts } = useCardAccounts()
  const topUp = useCardTopUp()

  // ─── KYC Flow ──────────────────────────────────────

  const handleApply = useCallback(async (providerId: string) => {
    if (!adapter) return

    try {
      const session = await adapter.startKYC()
      setCurrentView('kyc')

      // Poll KYC status until approved
      const pollKYC = async () => {
        const status = await adapter.getKYCStatus()
        if (status === 'approved') {
          // Auto-create card after KYC approval
          const card = await adapter.createCard('virtual')
          reloadAccounts()
          setCurrentView('main')
        } else if (status === 'rejected') {
          setCurrentView('main')
        } else {
          setTimeout(pollKYC, 2000)
        }
      }

      // Start polling after a short delay to let the mock auto-approve
      setTimeout(pollKYC, 3500)
    } catch (err) {
      console.error('Failed to start KYC:', err)
    }
  }, [adapter, reloadAccounts])

  const handleKYCComplete = useCallback(() => {
    if (!adapter) return

    // KYC web view closed — check status and proceed
    adapter.getKYCStatus().then(async (status) => {
      if (status === 'approved') {
        const card = await adapter.createCard('virtual')
        reloadAccounts()
      }
      setCurrentView('main')
    }).catch(() => {
      setCurrentView('main')
    })
  }, [adapter, reloadAccounts])

  const handleKYCError = useCallback((_error: string) => {
    // Keep KYC view open so user can retry
  }, [])

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

  // No adapter or no cards — show onboarding
  if (!adapter || accounts.length === 0) {
    return (
      <div className="card-app">
        <CardOnboardingView onApply={handleApply} />
      </div>
    )
  }

  // KYC Flow
  if (currentView === 'kyc') {
    return (
      <div className="card-app">
        <KYCWebView
          url="https://mock-kyc.example.com/verify"
          onComplete={handleKYCComplete}
          onError={handleKYCError}
        />
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
          card={activeCard}
          onTopUp={handleNavigateToTopUp}
          onSettings={handleNavigateToSettings}
        />
      </div>
    )
  }

  return null
}

export default CardApp
