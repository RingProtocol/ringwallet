import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../common/TitleBar'
import TempContent from '../common/TempContent'
import PolymarketDetailPage from './PolymarketDetailPage'
import PolymarketPositionsPage from './PolymarketPositionsPage'
import {
  formatPolymarketVolume,
  CATEGORY_TABS,
  type PolymarketMarket,
  type MarketCategory,
} from '../../services/polymarketService'
import { usePolymarketMarkets } from '../../hooks/usePolymarketMarkets'
import { useI18n } from '../../i18n'
import './PolymarketListPage.css'

interface Props {
  onClose: () => void
}

const PolymarketListPage: React.FC<Props> = ({ onClose }) => {
  const { t } = useI18n()
  const {
    markets,
    loading,
    loadingMore,
    error,
    hasMore,
    activeCategory,
    setActiveCategory,
    loadMarkets,
    handleRetry,
  } = usePolymarketMarkets()

  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(
    null
  )
  const [showPositions, setShowPositions] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
          loadMarkets(false)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMarkets, loading, loadingMore, hasMore])

  const handleCategoryClick = useCallback(
    (category: MarketCategory) => {
      setActiveCategory(category)
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }
    },
    [setActiveCategory]
  )

  const content = (
    <div className="polymarket-page">
      <TitleBar
        onBack={onClose}
        backLabel={t('close')}
        right={
          <button
            className="polymarket-list__positions-btn"
            onClick={() => setShowPositions(true)}
            type="button"
          >
            {t('predictMyPositions')}
          </button>
        }
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {t('predictTitle')}
        </span>
      </TitleBar>

      <div className="polymarket-tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`polymarket-tabs__item${
              activeCategory === tab.key ? ' polymarket-tabs__item--active' : ''
            }`}
            onClick={() => handleCategoryClick(tab.key)}
            type="button"
          >
            {t(tab.labelKey as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      <div className="polymarket-page__content" ref={contentRef}>
        {loading && <TempContent status="loading" />}
        {error && (
          <TempContent status="error" onRetry={handleRetry}>
            {t('loadingFailed', { error })}
          </TempContent>
        )}
        {!loading && !error && markets.length === 0 && (
          <div className="polymarket-list__empty">{t('noDapps')}</div>
        )}
        {!loading && !error && markets.length > 0 && (
          <div className="polymarket-list">
            {markets.map((market) => (
              <button
                key={market.slug}
                className="polymarket-list__item"
                onClick={() => setSelectedMarket(market)}
                type="button"
              >
                <img
                  className="polymarket-list__icon"
                  src={market.image || ''}
                  alt={market.question}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect width=%2240%22 height=%2240%22 rx=%228%22 fill=%22%234ecdc4%22/><text x=%2220%22 y=%2226%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2218%22 font-family=%22sans-serif%22>P</text></svg>'
                  }}
                />
                <div className="polymarket-list__info">
                  <span className="polymarket-list__name">
                    {market.question}
                  </span>
                  <span className="polymarket-list__meta">
                    {t('predictVolume24h')}:{' '}
                    {formatPolymarketVolume(market.volume24hr)}
                  </span>
                </div>
              </button>
            ))}
            <div ref={loadMoreRef} className="polymarket-list__sentinel" />
            {loadingMore && (
              <div className="polymarket-list__loading-more">
                <div className="dapp-list__spinner" />
              </div>
            )}
          </div>
        )}
      </div>
      {selectedMarket && (
        <PolymarketDetailPage
          slug={selectedMarket.slug}
          onBack={() => setSelectedMarket(null)}
        />
      )}
      {showPositions && (
        <PolymarketPositionsPage onBack={() => setShowPositions(false)} />
      )}
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default PolymarketListPage
