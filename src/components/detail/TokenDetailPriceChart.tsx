import React, { useMemo, useState } from 'react'
import type { ChainToken } from '../../models/ChainTokens'
import type { Chain } from '../../models/ChainType'
import {
  useTokenPriceHistory,
  type PriceTab,
} from '../../hooks/useTokenPriceHistory'
import type { PriceDataPoint } from '../../features/balance/tokenPriceHistorical'
import { useI18n } from '../../i18n'

export interface TokenDetailPriceChartProps {
  token: ChainToken
  chain: Chain
}

const TIME_LABELS: PriceTab[] = ['1H', '1D']

const SVG_W = 200
const SVG_H = 56
const PAD_TOP = 4
const PAD_BOT = 4

interface SvgPointResult {
  linePoints: string
  areaPoints: string
  up: boolean
  minYPct: number
  maxYPct: number
  minXPct: number
  maxXPct: number
  minPrice: string
  maxPrice: string
}

function formatPriceLabel(v: number): string {
  if (v >= 1000) return `$${v.toFixed(0)}`
  if (v >= 1) return `$${v.toFixed(2)}`
  return `$${v.toPrecision(4)}`
}

function buildSvgPoints(data: PriceDataPoint[]): SvgPointResult | null {
  if (data.length < 2) return null
  const values = data.map((d) => Number(d.value))
  if (values.some((v) => !Number.isFinite(v))) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const usableH = SVG_H - PAD_TOP - PAD_BOT
  let minIdx = 0
  let maxIdx = 0

  const pts = values.map((v, i) => {
    if (v < values[minIdx]) minIdx = i
    if (v > values[maxIdx]) maxIdx = i
    const x = (i / (values.length - 1)) * SVG_W
    const y = PAD_TOP + usableH - ((v - min) / range) * usableH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const linePoints = pts.join(' ')
  const areaPoints = `${linePoints} ${SVG_W},${SVG_H} 0,${SVG_H}`
  const up = values[values.length - 1] >= values[0]

  const yPctOf = (v: number) =>
    ((PAD_TOP + usableH - ((v - min) / range) * usableH) / SVG_H) * 100

  const clampY = (v: number) => Math.max(4, Math.min(96, v))

  return {
    linePoints,
    areaPoints,
    up,
    minYPct: clampY(yPctOf(min)),
    maxYPct: clampY(yPctOf(max)),
    minXPct: (minIdx / (values.length - 1)) * 100,
    maxXPct: (maxIdx / (values.length - 1)) * 100,
    minPrice: formatPriceLabel(min),
    maxPrice: formatPriceLabel(max),
  }
}

const TokenDetailPriceChart: React.FC<TokenDetailPriceChartProps> = ({
  token,
  chain,
}) => {
  const { t } = useI18n()
  const { data, isLoading, hasPrice, selectedTab, setSelectedTab } =
    useTokenPriceHistory(token, chain)
  const [logOpen, setLogOpen] = useState(false)

  const svg = useMemo(() => buildSvgPoints(data), [data])

  if (!hasPrice && !isLoading) {
    return (
      <div className="token-detail__no-price">
        {t('tokenDetailNoPriceData')}
      </div>
    )
  }

  return (
    <>
      {svg && (
        <div
          className="token-detail__sparkline"
          style={{ position: 'relative' }}
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            height="140"
            preserveAspectRatio="none"
            style={{ display: 'block' }}
          >
            <defs>
              <linearGradient id="sp" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={
                    svg.up
                      ? 'rgba(52, 211, 153, 0.18)'
                      : 'rgba(248, 113, 113, 0.18)'
                  }
                />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <polygon points={svg.areaPoints} fill="url(#sp)" />
            <polyline
              points={svg.linePoints}
              fill="none"
              stroke={svg.up ? '#34d399' : '#f87171'}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div
            className="token-detail__hline token-detail__hline--max"
            style={{ top: `${svg.maxYPct}%` }}
          >
            <span
              className="token-detail__hline-label"
              style={svg.maxXPct > 70 ? { right: 6 } : { left: 6 }}
            >
              {svg.maxPrice}
            </span>
          </div>
          <div
            className="token-detail__hline token-detail__hline--min"
            style={{ top: `${svg.minYPct}%` }}
          >
            <span
              className="token-detail__hline-label"
              style={svg.minXPct > 70 ? { right: 6 } : { left: 6 }}
            >
              {svg.minPrice}
            </span>
          </div>
        </div>
      )}

      <div className="token-detail__time-tabs">
        <button
          type="button"
          className="token-detail__log-btn"
          onClick={() => setLogOpen((v) => !v)}
        >
          Log
        </button>
        {TIME_LABELS.map((tLabel) => (
          <button
            key={tLabel}
            type="button"
            className={`token-detail__time-tab ${selectedTab === tLabel ? 'token-detail__time-tab--active' : ''}`}
            onClick={() => setSelectedTab(tLabel)}
          >
            {tLabel}
          </button>
        ))}
      </div>

      {logOpen && (
        <pre className="token-detail__log-panel">
          {data.length > 0 ? JSON.stringify(data, null, 2) : 'No data received'}
        </pre>
      )}
    </>
  )
}

export default TokenDetailPriceChart
