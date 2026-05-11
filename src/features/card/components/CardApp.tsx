import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useI18n } from '../../../i18n'
import { useCardProvider, useCardAccounts, useCardTopUp } from '../hooks'
import '../services/adapter'
import { cardProviderRegistry } from '../services/registry'
import { CARD_PROVIDERS } from '../../../config/cardProviders'
import type { CardAccount } from '../types'
import CardOnboardingView from './onboarding/CardOnboardingView'
import CardApplyPage from './onboarding/CardApplyPage'
import CardDashboardView from './dashboard/CardDashboardView'
import CardSettingsView from './management/CardSettingsView'
import TopUpEntry from './topup/TopUpEntry'
import TopUpAssetSelect from './topup/TopUpAssetSelect'
import TopUpAmountInput from './topup/TopUpAmountInput'
import TopUpConfirm from './topup/TopUpConfirm'
import TopUpResult from './topup/TopUpResult'
import './Card.css'

type CardView = 'main' | 'detail' | 'topup' | 'settings' | 'apply'

/**
 * Sub-state of the apply page. Drives the loading copy shown by
 * `CardApplyPage` when no iframe is being rendered.
 *
 *  - `checking`: querying the provider adapter for an existing card.
 *  - `starting`: linking the adapter and starting the KYC session.
 *  - `creating`: KYC approved, issuing the card.
 */
type ApplyStage = 'checking' | 'starting' | 'creating' | null

const ZERO_EVM = '0x0000000000000000000000000000000000000000'

const CardApp: React.FC = () => {
  const { t } = useI18n()
  const [currentView, setCurrentView] = useState<CardView>('main')
  const [kycUrl, setKycUrl] = useState<string | null>(null)
  /** Sub-stage of the apply flow, used for loading-state copy. */
  const [applyStage, setApplyStage] = useState<ApplyStage>(null)
  /** Fatal error encountered while running the apply flow (query or apply). */
  const [applyError, setApplyError] = useState<string | null>(null)
  /** Provider that initiated the current apply flow — cleared on exit. */
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)
  /** Provider whose card detail is currently being viewed. */
  const [detailProviderId, setDetailProviderId] = useState<string | null>(null)
  /**
   * Card just returned by `getCards()` or `createCard()` — held locally so
   * the dashboard renders immediately without waiting for the
   * `useCardAccounts` reload round-trip. Cleared on detail-back.
   */
  const [pendingDetailCard, setPendingDetailCard] = useState<CardAccount | null>(null)
  const kycPollTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const { activeWallet } = useAuth()
  const { loading: adapterLoading } = useCardProvider()
  const { accounts, activeCard, loading: accountsLoading, error: accountsError, reload: reloadAccounts } = useCardAccounts()
  const topUp = useCardTopUp()

  // Keep a ref to the latest reloadAccounts so KYC poll closures never capture
  // a stale version (adapter was null when handleViewDetails ran but becomes
  // non-null after the first re-render triggered by setKycUrl).
  const reloadAccountsRef = useRef(reloadAccounts)
  reloadAccountsRef.current = reloadAccounts

  const walletAddress = activeWallet?.address ?? ZERO_EVM

  const clearKycPollTimeouts = useCallback(() => {
    for (const id of kycPollTimeoutsRef.current) {
      clearTimeout(id)
    }
    kycPollTimeoutsRef.current = []
  }, [])

  useEffect(() => () => clearKycPollTimeouts(), [clearKycPollTimeouts])

  /** Back from card detail to provider list. */
  const handleDetailBack = useCallback(() => {
    setDetailProviderId(null)
    setPendingDetailCard(null)
    setCurrentView('main')
  }, [])

  // ─── Apply / Detail Flow ───────────────────────────

  /**
   * Single entry-point for the per-row "My Card" button.
   *
   * Flow:
   *  1. Open the apply page in `checking` state so the user gets immediate
   *     feedback (TempContent loading).
   *  2. Ask the provider adapter whether this user already has a card with
   *     this provider. If yes → navigate straight to the dashboard with the
   *     existing card (no new application).
   *  3. Otherwise start the KYC session and poll for approval. On approval
   *     the card is created and the user is navigated directly to the
   *     dashboard (not back to the onboarding list).
   *  4. Any failure (query, KYC start, KYC reject, card create) is surfaced
   *     as `applyError` so the apply page can offer Retry / Back without
   *     dumping the user back to the onboarding list.
   */
  const handleViewDetails = useCallback(
    async (providerId: string) => {
      clearKycPollTimeouts()
      setApplyError(null)
      setKycUrl(null)
      setActiveProviderId(providerId)
      setApplyStage('checking')
      setCurrentView('apply')

      const impl = cardProviderRegistry.get(providerId)
      if (!impl) {
        setApplyError(t('cardApplyFailed'))
        return
      }

      // ── Step 1: existing card lookup ───────────────
      try {
        if (impl.isLinked()) {
          const cards = await impl.getCards()
          if (cards.length > 0) {
            setPendingDetailCard(cards[0])
            setDetailProviderId(providerId)
            setApplyStage(null)
            setKycUrl(null)
            setCurrentView('detail')
            reloadAccountsRef.current()
            return
          }
        }
      } catch (err) {
        console.error('Failed to query existing cards:', err)
        setApplyError(t('cardLoadCardsFailed'))
        return
      }

      // ── Step 2: no existing card → KYC session ─────
      setApplyStage('starting')
      try {
        if (!impl.isLinked()) {
          await impl.initialize({
            apiKey: '',
            environment: 'sandbox',
            walletAddress,
          })
        }

        const session = await impl.startKYC()
        setKycUrl(session.url)

        const pollKYC = () => {
          void (async () => {
            try {
              const status = await impl.getKYCStatus()
              if (status === 'approved') {
                setApplyStage('creating')
                setKycUrl(null)
                const newCard = await impl.createCard('virtual')
                setPendingDetailCard(newCard)
                setDetailProviderId(providerId)
                setApplyStage(null)
                setCurrentView('detail')
                reloadAccountsRef.current()
              } else if (status === 'rejected') {
                setApplyError(t('cardApplyFailed'))
              } else {
                const id = setTimeout(pollKYC, 2000)
                kycPollTimeoutsRef.current.push(id)
              }
            } catch (err) {
              console.error('KYC poll failed:', err)
              setApplyError(t('cardApplyFailed'))
            }
          })()
        }

        const firstPoll = setTimeout(pollKYC, 3500)
        kycPollTimeoutsRef.current.push(firstPoll)
      } catch (err) {
        console.error('Failed to start KYC:', err)
        setApplyError(t('cardApplyFailed'))
      }
    },
    [clearKycPollTimeouts, walletAddress, t],
  )

  /** User explicitly closed the apply page — cancel pending polls. */
  const handleApplyDismiss = useCallback(() => {
    clearKycPollTimeouts()
    setKycUrl(null)
    setApplyError(null)
    setApplyStage(null)
    setActiveProviderId(null)
    setCurrentView('main')
  }, [clearKycPollTimeouts])

  /** Iframe failed to load — surface as page error so user can retry. */
  const handleApplyIframeError = useCallback((message: string) => {
    setApplyError(message)
  }, [])

  /** Retry the apply flow for the currently active provider. */
  const handleApplyRetry = useCallback(() => {
    if (activeProviderId) {
      void handleViewDetails(activeProviderId)
    }
  }, [activeProviderId, handleViewDetails])

  // ─── Navigation ────────────────────────────────────

  const handleNavigateToTopUp = useCallback(() => {
    setCurrentView('topup')
    topUp.startTopUp()
  }, [topUp])

  const handleNavigateToSettings = useCallback(() => {
    setCurrentView('settings')
  }, [])

  const handleBackToMain = useCallback(() => {
    setDetailProviderId(null)
    setPendingDetailCard(null)
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
        <p className="card-app__loading-text">{t('cardLoading')}</p>
      </div>
    )
  }

  // Apply page (fullscreen — see documents/specs/pages/page-style.md).
  // Rendered ahead of other checks so it stays visible regardless of
  // background state changes (e.g. an account load error elsewhere should
  // not blank the apply page while the user is mid-application).
  if (currentView === 'apply') {
    const provider = CARD_PROVIDERS.find((p) => p.id === activeProviderId)
    const providerName = provider?.name ?? ''
    const loadingMessage =
      applyStage === 'checking'
        ? t('cardApplyChecking')
        : applyStage === 'creating'
          ? t('cardApplyCreating')
          : t('cardApplyStarting')
    return (
      <div className="card-app">
        <CardApplyPage
          providerName={providerName}
          kycUrl={kycUrl}
          loadingMessage={loadingMessage}
          error={applyError}
          onBack={handleApplyDismiss}
          onIframeError={handleApplyIframeError}
          onRetry={handleApplyRetry}
        />
      </div>
    )
  }

  if (accountsError && accounts.length === 0) {
    return (
      <div className="card-app">
        <div className="card-app__error">
          <p className="card-app__error-text">{t('cardLoadError')}</p>
          <button
            type="button"
            className="card-app__error-btn"
            onClick={reloadAccounts}
          >
            {t('cardRetry')}
          </button>
        </div>
      </div>
    )
  }

  // Card Detail (fullscreen dashboard).
  // Prefer the freshly-resolved `pendingDetailCard` so the dashboard is
  // populated synchronously — avoids a flash of onboarding while the
  // useCardAccounts reload completes.
  if (currentView === 'detail') {
    const detailCard =
      pendingDetailCard ??
      (detailProviderId
        ? accounts.find((a) => a.provider === detailProviderId) ?? activeCard
        : activeCard)
    if (detailCard) {
      return (
        <div className="card-app">
          <CardDashboardView
            card={detailCard}
            onTopUp={handleNavigateToTopUp}
            onSettings={handleNavigateToSettings}
            onBack={handleDetailBack}
          />
        </div>
      )
    }
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
            <p className="card-app__loading-text">{t('cardProcessing')}</p>
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
                {t('cardBack')}
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

  // Main: always show provider list
  return (
    <div className="card-app">
      <CardOnboardingView
        accounts={accounts}
        onViewDetails={(id) => {
          void handleViewDetails(id)
        }}
      />
    </div>
  )
}

export default CardApp
