import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../common/TitleBar'
import TempContent from '../common/TempContent'
import {
  fetchPolymarketMarketDetail,
  formatPolymarketVolume,
  getPolymarketEventUrl,
} from '../../services/polymarketService'
import { useI18n } from '../../i18n'
import './PolymarketDetailPage.css'

export interface PolymarketMarketDetail {
  question?: string
  slug?: string
  image?: string
  description?: string
  volume?: string
  volume24hr?: string
  liquidity?: string
  spread?: string
  outcomes?: string | string[]
  outcomePrices?: string | string[]
  endDate?: string
  resolutionSource?: string
}

interface Props {
  id: string | number
  slug: string
  onBack: () => void
}

function safeJsonParse<T>(value: unknown): T | null {
  if (typeof value !== 'string') return value as T | null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const PolymarketDetailPage: React.FC<Props> = ({ id, slug, onBack }) => {
  const { t } = useI18n()
  const [detail, setDetail] = useState<PolymarketMarketDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPolymarketMarketDetail(id)
      .then((data) => {
        if (!cancelled) {
          setDetail((data as PolymarketMarketDetail) || null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('loadingFailed', { error: 'Unknown error' })
          )
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  const outcomes = safeJsonParse<string[]>(detail?.outcomes) || []
  const outcomePrices = safeJsonParse<string[]>(detail?.outcomePrices) || []

  const handleOpenExternal = () => {
    const url = getPolymarketEventUrl(slug)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const content = (
    <div className="polymarket-detail-page">
      <TitleBar onBack={onBack} backLabel={t('back')}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {t('predictDetail')}
        </span>
      </TitleBar>
      <div className="polymarket-detail-page__content">
        {loading && <TempContent status="loading" />}
        {error && (
          <TempContent
            status="error"
            onRetry={() => fetchPolymarketMarketDetail(id)}
          >
            {t('loadingFailed', { error })}
          </TempContent>
        )}
        {!loading && !error && detail && (
          <div className="polymarket-detail">
            {detail.image && (
              <img
                className="polymarket-detail__image"
                src={detail.image}
                alt={detail.question || ''}
              />
            )}
            <h1 className="polymarket-detail__question">
              {detail.question || t('predictUntitled')}
            </h1>
            {detail.description && (
              <p className="polymarket-detail__description">
                {detail.description}
              </p>
            )}

            <div className="polymarket-detail__stats">
              {detail.volume && (
                <div className="polymarket-detail__stat">
                  <span className="polymarket-detail__stat-label">
                    {t('predictTotalVolume')}
                  </span>
                  <span className="polymarket-detail__stat-value">
                    {formatPolymarketVolume(detail.volume)}
                  </span>
                </div>
              )}
              {detail.volume24hr && (
                <div className="polymarket-detail__stat">
                  <span className="polymarket-detail__stat-label">
                    {t('predictVolume24h')}
                  </span>
                  <span className="polymarket-detail__stat-value">
                    {formatPolymarketVolume(detail.volume24hr)}
                  </span>
                </div>
              )}
              {detail.liquidity && (
                <div className="polymarket-detail__stat">
                  <span className="polymarket-detail__stat-label">
                    {t('predictLiquidity')}
                  </span>
                  <span className="polymarket-detail__stat-value">
                    {formatPolymarketVolume(detail.liquidity)}
                  </span>
                </div>
              )}
              {detail.endDate && (
                <div className="polymarket-detail__stat">
                  <span className="polymarket-detail__stat-label">
                    {t('predictEndDate')}
                  </span>
                  <span className="polymarket-detail__stat-value">
                    {new Date(detail.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {outcomes.length > 0 && (
              <div className="polymarket-detail__outcomes">
                <h2 className="polymarket-detail__section-title">
                  {t('predictOutcomes')}
                </h2>
                <div className="polymarket-detail__outcome-list">
                  {outcomes.map((outcome, index) => {
                    const price = outcomePrices[index]
                      ? `${(parseFloat(outcomePrices[index]) * 100).toFixed(1)}%`
                      : ''
                    return (
                      <div key={outcome} className="polymarket-detail__outcome">
                        <span className="polymarket-detail__outcome-name">
                          {outcome}
                        </span>
                        {price && (
                          <span className="polymarket-detail__outcome-price">
                            {price}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              className="polymarket-detail__external-btn"
              onClick={handleOpenExternal}
            >
              {t('predictOpenOnPolymarket')}
            </button>
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

export default PolymarketDetailPage
