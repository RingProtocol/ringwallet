import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../common/TitleBar'
import TempContent from '../common/TempContent'
import {
  fetchPolymarketMarkets,
  formatPolymarketVolume,
  getPolymarketEventUrl,
  type PolymarketMarket,
} from '../../services/polymarketService'
import { useI18n } from '../../i18n'
import type { DAppInfo } from '../../features/dapps/types/dapp'
import './PolymarketListPage.css'

interface Props {
  onClose: () => void
  onSelectMarket: (dapp: DAppInfo) => void
}

const PolymarketListPage: React.FC<Props> = ({ onClose, onSelectMarket }) => {
  const { t } = useI18n()
  const [markets, setMarkets] = useState<PolymarketMarket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPolymarketMarkets(20)
      .then((data) => {
        if (!cancelled) {
          setMarkets(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    fetchPolymarketMarkets(20)
      .then((data) => {
        setMarkets(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      })
  }

  const handleSelect = (market: PolymarketMarket) => {
    const url = getPolymarketEventUrl(market.slug)
    const dapp: DAppInfo = {
      id: -Math.abs(
        url.split('').reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0)
      ),
      name: market.question,
      description: 'Polymarket',
      url,
      icon: market.image || '',
      chains: [],
      category: 'predict',
      top: 0,
    }
    onSelectMarket(dapp)
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
                onClick={() => handleSelect(market)}
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
          </div>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default PolymarketListPage
