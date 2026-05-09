import React, { useState, useMemo } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../../contexts/AuthContext'
import { usePolymarketBetting } from '../../hooks/usePolymarketBetting'
import { useI18n } from '../../i18n'
import { POLYMARKET_CHAIN_ID } from '../../services/polymarket/constants'
import './PolymarketBettingPanel.css'

interface Props {
  slug: string
  outcomes: string[]
  outcomePrices: string[]
}

const PolymarketBettingPanel: React.FC<Props> = ({
  slug,
  outcomes,
  outcomePrices,
}) => {
  const { t } = useI18n()
  const { activeChain, activeWallet, switchChain } = useAuth()
  const { state, error, placeBuyOrder, reset } = usePolymarketBetting()

  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const isPolygon = activeChain?.id === POLYMARKET_CHAIN_ID
  const canBet =
    isPolygon && selectedOutcome !== null && amount && parseFloat(amount) > 0

  const estimatedShares = useMemo(() => {
    if (selectedOutcome === null || !amount) return '0'
    const price = parseFloat(outcomePrices[selectedOutcome] || '0')
    const usdc = parseFloat(amount)
    if (!price || !usdc) return '0'
    return (usdc / price).toFixed(2)
  }, [selectedOutcome, amount, outcomePrices])

  const handleBetClick = () => {
    if (!canBet) return
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!activeWallet?.privateKey || !selectedOutcome) return
    const rpcUrl = Array.isArray(activeChain?.rpcUrl)
      ? activeChain.rpcUrl[0]
      : activeChain?.rpcUrl
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const signer = new ethers.Wallet(activeWallet.privateKey, provider)
    await placeBuyOrder({
      slug,
      outcomeIndex: selectedOutcome,
      usdcAmount: amount,
      signer,
      provider,
    })
  }

  const handleSwitchChain = () => {
    switchChain(POLYMARKET_CHAIN_ID)
  }

  if (state === 'success') {
    return (
      <div className="polymarket-betting-panel polymarket-betting-panel--success">
        <span>{t('predictBetSuccess')}</span>
        <button
          className="polymarket-betting-panel__btn"
          onClick={reset}
          type="button"
        >
          {t('predictBetAgain')}
        </button>
      </div>
    )
  }

  return (
    <div className="polymarket-betting-panel">
      <h3 className="polymarket-betting-panel__title">
        {t('predictPlaceBet')}
      </h3>

      {!isPolygon && (
        <div className="polymarket-betting-panel__chain-guard">
          <span>{t('predictSwitchToPolygonBet')}</span>
          <button
            className="polymarket-betting-panel__btn polymarket-betting-panel__btn--small"
            onClick={handleSwitchChain}
            type="button"
          >
            {t('switchAction')}
          </button>
        </div>
      )}

      <div className="polymarket-betting-panel__outcomes">
        {outcomes.map((outcome, idx) => {
          const price = outcomePrices[idx]
            ? `${(parseFloat(outcomePrices[idx]) * 100).toFixed(1)}%`
            : ''
          return (
            <button
              key={outcome}
              className={`polymarket-betting-panel__outcome${
                selectedOutcome === idx
                  ? ' polymarket-betting-panel__outcome--active'
                  : ''
              }`}
              onClick={() => {
                setSelectedOutcome(idx)
                reset()
              }}
              disabled={!isPolygon}
              type="button"
            >
              <span className="polymarket-betting-panel__outcome-name">
                {outcome}
              </span>
              {price && (
                <span className="polymarket-betting-panel__outcome-price">
                  {price}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="polymarket-betting-panel__input-row">
        <label className="polymarket-betting-panel__label">{t('amount')}</label>
        <input
          className="polymarket-betting-panel__input"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!isPolygon || state === 'posting'}
          min="0"
          step="0.01"
        />
        <span className="polymarket-betting-panel__currency">USDC</span>
      </div>

      <button
        className="polymarket-betting-panel__btn polymarket-betting-panel__btn--primary"
        onClick={handleBetClick}
        disabled={!canBet || state === 'posting'}
        type="button"
      >
        {state === 'posting' ? t('confirming') : t('predictBet')}
      </button>

      {showConfirm && selectedOutcome !== null && (
        <div
          className="polymarket-betting-panel__modal-overlay"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="polymarket-betting-panel__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="polymarket-betting-panel__modal-title">
              {t('predictReviewOrder')}
            </h4>
            <div className="polymarket-betting-panel__modal-row">
              <span>{t('predictOutcome')}</span>
              <span>{outcomes[selectedOutcome]}</span>
            </div>
            <div className="polymarket-betting-panel__modal-row">
              <span>{t('amount')}</span>
              <span>{amount} USDC</span>
            </div>
            <div className="polymarket-betting-panel__modal-row">
              <span>{t('predictEstShares')}</span>
              <span>{estimatedShares}</span>
            </div>
            <div className="polymarket-betting-panel__modal-row">
              <span>{t('predictPrice')}</span>
              <span>
                {outcomePrices[selectedOutcome]
                  ? `${(parseFloat(outcomePrices[selectedOutcome]) * 100).toFixed(1)}%`
                  : '-'}
              </span>
            </div>
            <div className="polymarket-betting-panel__modal-actions">
              <button
                className="polymarket-betting-panel__btn"
                onClick={() => setShowConfirm(false)}
                type="button"
              >
                {t('cancel')}
              </button>
              <button
                className="polymarket-betting-panel__btn polymarket-betting-panel__btn--primary"
                onClick={handleConfirm}
                disabled={state === 'posting'}
                type="button"
              >
                {state === 'posting' ? t('confirming') : t('confirm')}
              </button>
            </div>
            {error && (
              <p className="polymarket-betting-panel__error">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PolymarketBettingPanel
