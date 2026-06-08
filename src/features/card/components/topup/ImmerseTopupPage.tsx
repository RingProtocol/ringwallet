import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type {
  CardAccount,
  TopUpAsset,
  TopUpOrder,
  TopUpResult,
} from '../../types'
import { useCardProvider } from '../../hooks'
import { useCardAccounts } from '../../hooks'
import TitleBar from '../../../../components/common/TitleBar'
import { useI18n } from '../../../../i18n'
import TopUpAssetSelect from './TopUpAssetSelect'
import TopUpAmountInput from './TopUpAmountInput'
import TopUpConfirm from './TopUpConfirm'
import TopUpResultView from './TopUpResult'
import '../Card.css'

interface Props {
  card: CardAccount
  onBack: () => void
}

type Stage =
  | 'selecting_asset'
  | 'entering_amount'
  | 'confirming'
  | 'signing'
  | 'processing'
  | 'success'
  | 'error'

const POLL_INTERVAL = 3000
const MAX_POLL_ATTEMPTS = 40

const ImmerseTopupPage: React.FC<Props> = ({ card, onBack }) => {
  const { t } = useI18n()
  const { adapter } = useCardProvider()
  const { reload: reloadAccounts } = useCardAccounts()

  const [stage, setStage] = useState<Stage>('selecting_asset')
  const [supportedAssets, setSupportedAssets] = useState<TopUpAsset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<TopUpAsset | null>(null)
  const [amount, setAmount] = useState('')
  const [order, setOrder] = useState<TopUpOrder | null>(null)
  const [result, setResult] = useState<TopUpResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load supported assets on mount
  useEffect(() => {
    if (!adapter) {
      setError('No card provider available')
      setStage('error')
      return
    }
    adapter
      .getSupportedTopUpAssets()
      .then((assets) => {
        setSupportedAssets(assets)
        setStage('selecting_asset')
      })
      .catch((err) => {
        setError((err as Error).message || 'Failed to load supported assets')
        setStage('error')
      })
  }, [adapter])

  const handleSelectAsset = useCallback((asset: TopUpAsset) => {
    setSelectedAsset(asset)
    setAmount('')
    setStage('entering_amount')
  }, [])

  const handleSetAmount = useCallback((value: string) => {
    setAmount(value)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!adapter || !selectedAsset || !amount) {
      setError('Missing required top-up parameters')
      return
    }
    setError(null)
    setStage('confirming')
    try {
      const topUpOrder = await adapter.createTopUp({
        cardId: card.id,
        asset: selectedAsset.symbol,
        chain: selectedAsset.chain,
        amount,
      })
      setOrder(topUpOrder)
      setStage('signing')
    } catch (err) {
      setError((err as Error).message || 'Failed to create top-up order')
      setStage('error')
    }
  }, [adapter, card.id, selectedAsset, amount])

  const handleSubmitSignature = useCallback(
    async (signature: string) => {
      if (!adapter || !order) {
        setError('No pending order to execute')
        return
      }
      setError(null)
      setStage('processing')
      try {
        const topUpResult = await adapter.executeTopUp(order, signature)
        setResult(topUpResult)

        if (topUpResult.status === 'confirmed') {
          setStage('success')
          reloadAccounts()
        } else {
          // poll
          let attempts = 0
          const timer = setInterval(async () => {
            if (!adapter) return
            attempts++
            try {
              const status = await adapter.getTopUpStatus(topUpResult.orderId)
              if (status.status === 'confirmed') {
                clearInterval(timer)
                setResult(status)
                setStage('success')
                reloadAccounts()
              } else if (status.status === 'failed') {
                clearInterval(timer)
                setError('Top-up failed')
                setStage('error')
              }
              if (attempts >= MAX_POLL_ATTEMPTS) {
                clearInterval(timer)
                setError('Top-up status polling timed out')
                setStage('error')
              }
            } catch (e) {
              clearInterval(timer)
              setError((e as Error).message || 'Failed to check top-up status')
              setStage('error')
            }
          }, POLL_INTERVAL)
        }
      } catch (err) {
        setError((err as Error).message || 'Failed to execute top-up')
        setStage('error')
      }
    },
    [adapter, order, reloadAccounts]
  )

  const handleDone = useCallback(() => {
    onBack()
  }, [onBack])

  const handleRetry = useCallback(() => {
    setError(null)
    setResult(null)
    setOrder(null)
    setSelectedAsset(null)
    setAmount('')
    setStage('selecting_asset')
  }, [])

  // ─── Render stages ─────────────────────────────────

  const renderContent = () => {
    switch (stage) {
      case 'selecting_asset':
        return (
          <div className="card-settings-page__content">
            <TopUpAssetSelect
              assets={supportedAssets}
              onSelect={handleSelectAsset}
              onBack={onBack}
            />
          </div>
        )
      case 'entering_amount':
        return (
          <div className="card-settings-page__content">
            <TopUpAmountInput
              asset={selectedAsset!}
              amount={amount}
              onAmountChange={handleSetAmount}
              onContinue={handleConfirm}
              onBack={() => setStage('selecting_asset')}
            />
          </div>
        )
      case 'confirming':
        return (
          <div className="card-settings-page__content">
            <div className="topup-confirm">
              <p>Creating top-up order…</p>
            </div>
          </div>
        )
      case 'signing':
        return (
          <div className="card-settings-page__content">
            <TopUpConfirm
              order={order!}
              onConfirm={() => handleSubmitSignature('mock_signature')}
              onBack={() => setStage('entering_amount')}
            />
          </div>
        )
      case 'processing':
        return (
          <div className="card-settings-page__content">
            <div className="topup-confirm">
              <p>Processing top-up…</p>
            </div>
          </div>
        )
      case 'success':
        return (
          <div className="card-settings-page__content">
            <TopUpResultView result={result!} onDone={handleDone} />
          </div>
        )
      case 'error':
        return (
          <div className="card-settings-page__content">
            <div className="topup-result">
              <div className="topup-result__icon topup-result__icon--failed">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h3 className="topup-result__title">Top Up Failed</h3>
              <p className="topup-result__description">
                {error || 'Something went wrong. Please try again.'}
              </p>
              <div className="topup-result__actions">
                <button
                  type="button"
                  className="topup-result__done-btn"
                  onClick={handleRetry}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  className="topup-result__done-btn topup-result__done-btn--secondary"
                  onClick={handleDone}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const content = (
    <div className="card-settings-page">
      <TitleBar onBack={onBack} backLabel={t('back')}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Immersve Top Up</span>
      </TitleBar>
      {renderContent()}
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

export default ImmerseTopupPage
