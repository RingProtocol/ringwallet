import React from 'react'
import { chainTokenChangePercentLabel } from '../../features/balance/balanceManager'
import type { ChainToken } from '../../models/ChainTokens'

export interface TokenDetailPriceChartProps {
  token: ChainToken
}

const TIME_LABELS = ['1H', '1D', '1W', '1M', '1Y', 'ALL']

const TokenDetailPriceChart: React.FC<TokenDetailPriceChartProps> = ({
  token,
}) => {
  const changeStr = chainTokenChangePercentLabel(token)
  const up = changeStr ? changeStr.startsWith('+') : true

  return (
    <>
      <div className="token-detail__sparkline">
        <svg
          viewBox="0 0 200 56"
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
                  up ? 'rgba(52, 211, 153, 0.18)' : 'rgba(248, 113, 113, 0.18)'
                }
              />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <polygon
            points={`${up ? '0,44 18,40 36,36 54,28 72,32 90,20 108,22 126,14 144,18 162,10 180,14 198,6' : '0,10 18,14 36,12 54,22 72,18 90,30 108,26 126,36 144,32 162,40 180,38 198,48'} 200,56 0,56`}
            fill="url(#sp)"
          />
          <polyline
            points={
              up
                ? '0,44 18,40 36,36 54,28 72,32 90,20 108,22 126,14 144,18 162,10 180,14 198,6'
                : '0,10 18,14 36,12 54,22 72,18 90,30 108,26 126,36 144,32 162,40 180,38 198,48'
            }
            fill="none"
            stroke={up ? '#34d399' : '#f87171'}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="token-detail__time-tabs">
        {TIME_LABELS.map((tLabel, i) => (
          <button
            key={tLabel}
            type="button"
            className={`token-detail__time-tab ${i === 2 ? 'token-detail__time-tab--active' : ''}`}
          >
            {tLabel}
          </button>
        ))}
      </div>
    </>
  )
}

export default TokenDetailPriceChart
