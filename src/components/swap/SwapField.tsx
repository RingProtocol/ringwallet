import React from 'react'
import { ethers } from 'ethers'
import type { SwapTokenOption } from './useRingV2Tokens'

const NATIVE_KEY = 'NATIVE'

export const keyOfToken = (t: SwapTokenOption): string =>
  t.isNative ? NATIVE_KEY : t.address

const formatBalance = (balance: bigint, decimals: number): string => {
  if (balance <= 0n) return '0'
  const s = ethers.formatUnits(balance, decimals)
  const [intPart, fracPart] = s.split('.')
  if (!fracPart) return intPart
  return `${intPart}.${fracPart.slice(0, 6)}`
}

interface Props {
  side: string
  token: SwapTokenOption | null
  amount: string
  onAmount?: (v: string) => void
  readOnly?: boolean
  showQuickPercents?: boolean
  onPercent?: (pct: number) => void
  onMax?: () => void
  /** Open the token picker. When omitted, the token pill is inert (read-only). */
  onPickToken?: () => void
  /**
   * Small secondary line under the amount (e.g. USD equivalent). Hidden
   * when empty.
   */
  subtext?: string
  /** True to replace the amount value with a pulsing placeholder. */
  skeleton?: boolean
  /** True when a stale value is displayed while a refresh is in-flight. */
  refreshing?: boolean
}

const SwapField: React.FC<Props> = ({
  side,
  token,
  amount,
  onAmount,
  readOnly,
  showQuickPercents,
  onPercent,
  onMax,
  onPickToken,
  subtext,
  skeleton,
  refreshing,
}) => {
  const balanceText =
    token && token.balance > 0n
      ? formatBalance(token.balance, token.decimals)
      : null
  const glyph = token ? token.symbol.charAt(0).toUpperCase() : '?'

  return (
    <div className="swap-field">
      <div className="swap-field__head">
        <span className="swap-field__label">{side}</span>
        {balanceText && token && (
          <span className="swap-field__balance">
            Balance: {balanceText} {token.symbol}
          </span>
        )}
      </div>
      <div className="swap-field__main">
        <button
          type="button"
          className="swap-field__pill"
          onClick={onPickToken}
          disabled={!onPickToken}
          aria-label={token ? `Select token (${token.symbol})` : 'Select token'}
        >
          <span className="swap-field__glyph" aria-hidden>
            {token?.logo ? (
              <img
                src={token.logo}
                alt=""
                loading="lazy"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              glyph
            )}
          </span>
          <span className="swap-field__symbol">
            {token ? token.symbol : '—'}
          </span>
          <svg
            className="swap-field__chevron"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {readOnly ? (
          skeleton ? (
            <div
              className="swap-field__quote swap-field__quote--skeleton"
              aria-hidden
            />
          ) : (
            <div
              className={`swap-field__quote ${refreshing ? 'is-refreshing' : ''}`}
            >
              {amount || '—'}
            </div>
          )
        ) : (
          <input
            className="swap-field__amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmount?.(e.target.value)}
          />
        )}
      </div>
      {subtext && <div className="swap-field__subtext">{subtext}</div>}
      {showQuickPercents && balanceText && (
        <div className="swap-field__percents">
          {[25, 50, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              className="swap-field__percent"
              onClick={() => (pct === 100 ? onMax?.() : onPercent?.(pct))}
            >
              {pct === 100 ? 'MAX' : `${pct}%`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SwapField
