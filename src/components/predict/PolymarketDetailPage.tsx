import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import TitleBar from '../common/TitleBar'
import TempContent from '../common/TempContent'
import PolymarketBettingPanel from './PolymarketBettingPanel'
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
  // All child markets under this event. For a "World Cup Winner" event
  // this lists one market per team (e.g. "Will Spain win…?"). Empty for
  // events with no markets. `marketCount` mirrors `markets.length`.
  marketCount?: number
  markets?: Array<{
    id: string | number
    slug: string
    question: string
    image?: string
    volume: number
    outcomes: string
    outcomePrices: string
    active: boolean
    closed: boolean
  }>
}

interface Props {
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

const PolymarketDetailPage: React.FC<Props> = ({ slug, onBack }) => {
  const { t } = useI18n()
  const [detail, setDetail] = useState<PolymarketMarketDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPolymarketMarketDetail(slug)
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
  }, [slug, t])

  const outcomes = safeJsonParse<string[]>(detail?.outcomes) || []
  const outcomePrices = safeJsonParse<string[]>(detail?.outcomePrices) || []

  // Multi-candidate events (e.g. "World Cup Winner") expose one child
  // market per candidate via `detail.markets`. The candidate list lets
  // the user pick a child market; the betting panel then binds to that
  // market's outcomes & prices.
  const rawMarkets = detail?.markets ?? []
  const isMultiMarket = (detail?.marketCount ?? rawMarkets.length) > 1
  const activeMarkets = useMemo(
    () =>
      isMultiMarket
        ? rawMarkets
            .filter((m) => m.active && !m.closed)
            .sort((a, b) => b.volume - a.volume)
        : [],
    [isMultiMarket, rawMarkets]
  )
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string | null>(
    null
  )
  // Reset selection whenever a new detail is loaded.
  useEffect(() => {
    setSelectedMarketSlug(activeMarkets[0]?.slug ?? null)
  }, [activeMarkets])
  const selectedMarket = useMemo(
    () => activeMarkets.find((m) => m.slug === selectedMarketSlug) ?? null,
    [activeMarkets, selectedMarketSlug]
  )
  // Markets the betting panel binds to: the user's selected candidate
  // for multi-market events, or a synthetic single-market object built
  // from the existing top-level fields for single-market events.
  const bettingMarket = useMemo(() => {
    if (selectedMarket) {
      return {
        slug: selectedMarket.slug,
        outcomes: safeJsonParse<string[]>(selectedMarket.outcomes) || [],
        outcomePrices:
          safeJsonParse<string[]>(selectedMarket.outcomePrices) || [],
      }
    }
    return {
      slug,
      outcomes,
      outcomePrices,
    }
  }, [selectedMarket, slug, outcomes, outcomePrices])

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
            onRetry={() => fetchPolymarketMarketDetail(slug)}
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

            {isMultiMarket ? (
              activeMarkets.length > 0 ? (
                <div className="polymarket-detail__candidates">
                  <h2 className="polymarket-detail__section-title">
                    {t('predictCandidates')}
                  </h2>
                  <div className="polymarket-detail__candidate-list">
                    {activeMarkets.map((market) => {
                      const prices =
                        safeJsonParse<string[]>(market.outcomePrices) || []
                      const yesPrice = prices[0]
                        ? `${(parseFloat(prices[0]) * 100).toFixed(1)}%`
                        : ''
                      const isSelected = market.slug === selectedMarketSlug
                      return (
                        <button
                          key={market.slug}
                          type="button"
                          className={
                            'polymarket-detail__candidate' +
                            (isSelected
                              ? ' polymarket-detail__candidate--selected'
                              : '')
                          }
                          onClick={() => setSelectedMarketSlug(market.slug)}
                        >
                          <span className="polymarket-detail__candidate-question">
                            {market.question}
                          </span>
                          {yesPrice && (
                            <span className="polymarket-detail__candidate-price">
                              {yesPrice}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="polymarket-detail__empty">
                  {t('predictNoMarkets')}
                </div>
              )
            ) : (
              outcomes.length > 0 && (
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
                        <div
                          key={outcome}
                          className="polymarket-detail__outcome"
                        >
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
              )
            )}

            {bettingMarket.outcomes.length > 0 && (
              <PolymarketBettingPanel
                key={bettingMarket.slug}
                market={bettingMarket}
              />
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
