import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../common/TitleBar'
import TempContent from '../common/TempContent'
import PolymarketDetailPage from './PolymarketDetailPage'
import {
  fetchPolymarketMarkets,
  formatPolymarketVolume,
  type PolymarketMarket,
} from '../../services/polymarketService'
import { useI18n } from '../../i18n'
import './PolymarketListPage.css'

interface Props {
  onClose: () => void
}

const PAGE_SIZE = 20

const PolymarketListPage: React.FC<Props> = ({ onClose }) => {
  const { t } = useI18n()
  const [markets, setMarkets] = useState<PolymarketMarket[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(
    null
  )
  const offsetRef = useRef(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadMarkets = useCallback(
    async (isInitial: boolean) => {
      if (isInitial) {
        setLoading(true)
        offsetRef.current = 0
      } else {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
      }
      setError(null)

      try {
        const data = await fetchPolymarketMarkets(PAGE_SIZE, offsetRef.current)
        if (isInitial) {
          setMarkets(data)
        } else {
          setMarkets((prev) => [...prev, ...data])
        }
        setHasMore(data.length === PAGE_SIZE)
        offsetRef.current += data.length
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('loadingFailed', { error: 'Unknown error' })
        )
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [loadingMore, hasMore, t]
  )

  useEffect(() => {
    loadMarkets(true)
  }, [loadMarkets])

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

  const handleRetry = () => {
    loadMarkets(true)
  }

  const content = (
    <div className="polymarket-page">
      <TitleBar onBack={onClose} backLabel={t('close')}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {t('predictTitle')}
        </span>
      </TitleBar>
      <div className="polymarket-page__content">
        {loading && <TempContent status="loading" />}
        {error && (
          <TempContent status="error" onRetry={handleRetry}>
            {t('loadingFailed', { error })}
          </TempContent>
        )}
        {!loading && !error && (
          <div className="polymarket-list">
            {markets.map((market) => (
              <button
                key={market.slug}
                className="polymarket-list__item"
                onClick={() => setSelectedMarket(market)}
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
          id={selectedMarket.id}
          slug={selectedMarket.slug}
          onBack={() => setSelectedMarket(null)}
        />
      )}
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default PolymarketListPage
