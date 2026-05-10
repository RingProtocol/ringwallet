import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../common/TitleBar'
import TempContent from '../common/TempContent'
import { usePolymarketPositions } from '../../hooks/usePolymarketPositions'
import { usePolymarketOrders } from '../../hooks/usePolymarketOrders'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../i18n'
import './PolymarketPositionsPage.css'

type Tab = 'positions' | 'orders'

interface Props {
  onBack: () => void
}

const PolymarketPositionsPage: React.FC<Props> = ({ onBack }) => {
  const { t } = useI18n()
  const { activeWallet, activeChain } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('positions')
  const walletAddress = activeWallet?.address ?? null

  const {
    positions,
    loading: posLoading,
    error: posError,
    refetch: refetchPositions,
  } = usePolymarketPositions(walletAddress, null)

  const {
    orders,
    loading: ordLoading,
    error: ordError,
    refetch: refetchOrders,
  } = usePolymarketOrders(walletAddress)

  const isPolygon = activeChain?.id === 137

  const handleRetry = () => {
    if (activeTab === 'positions') refetchPositions()
    else refetchOrders()
  }

  const content = (
    <div className="polymarket-positions-page">
      <TitleBar onBack={onBack} backLabel={t('back')}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {t('predictMyPositions')}
        </span>
      </TitleBar>

      {!isPolygon && (
        <div className="polymarket-chain-banner">
          {t('predictSwitchToPolygonBet')}
        </div>
      )}

      <div className="polymarket-positions-tabs">
        <button
          className={`polymarket-positions-tabs__item${
            activeTab === 'positions'
              ? ' polymarket-positions-tabs__item--active'
              : ''
          }`}
          onClick={() => setActiveTab('positions')}
          type="button"
        >
          {t('predictTabPositions')}
        </button>
        <button
          className={`polymarket-positions-tabs__item${
            activeTab === 'orders'
              ? ' polymarket-positions-tabs__item--active'
              : ''
          }`}
          onClick={() => setActiveTab('orders')}
          type="button"
        >
          {t('predictTabOrders')}
        </button>
      </div>

      <div className="polymarket-positions-page__content">
        {activeTab === 'positions' && (
          <>
            {posLoading && <TempContent status="loading" />}
            {posError && (
              <TempContent status="error" onRetry={handleRetry}>
                {t('loadingFailed', { error: posError })}
              </TempContent>
            )}
            {!posLoading && !posError && positions.length === 0 && (
              <div className="polymarket-positions__empty">
                {t('predictNoPositions')}
              </div>
            )}
            {!posLoading && !posError && positions.length > 0 && (
              <div className="polymarket-positions-list">
                {positions.map((p) => (
                  <div key={p.marketId} className="polymarket-position-card">
                    {p.image && (
                      <img
                        className="polymarket-position-card__image"
                        src={p.image}
                        alt={p.question}
                      />
                    )}
                    <div className="polymarket-position-card__info">
                      <span className="polymarket-position-card__question">
                        {p.question}
                      </span>
                      <span className="polymarket-position-card__outcome">
                        {p.outcome}
                      </span>
                      <div className="polymarket-position-card__stats">
                        <span>
                          {t('predictQty')}: {p.quantity}
                        </span>
                        <span>
                          {t('predictAvgPrice')}: {p.avgPrice}
                        </span>
                        <span>
                          {t('predictCurrentPrice')}: {p.currentPrice}
                        </span>
                        <span>
                          {t('predictValue')}: ${p.estimatedValue}
                        </span>
                        <span
                          className={
                            parseFloat(p.pnl) >= 0
                              ? 'polymarket-position-card__pnl--positive'
                              : 'polymarket-position-card__pnl--negative'
                          }
                        >
                          {t('predictPnl')}: {parseFloat(p.pnl) >= 0 ? '+' : ''}
                          {p.pnl}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <>
            {ordLoading && <TempContent status="loading" />}
            {ordError && (
              <TempContent status="error" onRetry={handleRetry}>
                {t('loadingFailed', { error: ordError })}
              </TempContent>
            )}
            {!ordLoading && !ordError && orders.length === 0 && (
              <div className="polymarket-positions__empty">
                {t('predictNoOrders')}
              </div>
            )}
            {!ordLoading && !ordError && orders.length > 0 && (
              <div className="polymarket-orders-list">
                {orders.map((o) => (
                  <div key={o.id} className="polymarket-order-row">
                    <span className="polymarket-order-row__market">
                      {o.marketQuestion}
                    </span>
                    <span className="polymarket-order-row__meta">
                      {o.side} · {o.status}
                    </span>
                    <span className="polymarket-order-row__amount">
                      ${o.makerAmount}
                    </span>
                    <span className="polymarket-order-row__time">
                      {new Date(
                        Number(o.timestamp) * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default PolymarketPositionsPage
