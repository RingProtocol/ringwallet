import React, { useCallback } from 'react'
import type { TopUpAsset } from '../../types'
import CurrencyAmount from '../shared/CurrencyAmount'
import '../Card.css'

interface Props {
  asset: TopUpAsset
  amount: string
  onAmountChange: (amount: string) => void
  onContinue: () => void
  onBack: () => void
}

const QUICK_AMOUNTS = ['$50', '$100', '$500']

const TopUpAmountInput: React.FC<Props> = ({
  asset,
  amount,
  onAmountChange,
  onContinue,
  onBack,
}) => {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^0-9.]/g, '')
      onAmountChange(value)
    },
    [onAmountChange],
  )

  const handleQuickAmount = useCallback(
    (preset: string) => {
      const numericValue = parseFloat(preset.replace('$', ''))
      if (!isNaN(numericValue)) {
        onAmountChange(numericValue.toString())
      }
    },
    [onAmountChange],
  )

  const numericAmount = parseFloat(amount)
  const isValid =
    !isNaN(numericAmount) &&
    numericAmount >= parseFloat(asset.minAmount) &&
    numericAmount <= parseFloat(asset.maxAmount)

  return (
    <div className="topup-amount-input">
      <div className="topup-amount-input__header">
        <button
          type="button"
          className="topup-amount-input__back"
          onClick={onBack}
          aria-label="Back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h3 className="topup-amount-input__title">Enter Amount</h3>
      </div>

      <div className="topup-amount-input__asset-info">
        <span className="topup-amount-input__asset-symbol">{asset.symbol}</span>
        <span className="topup-amount-input__asset-chain">{asset.chain}</span>
      </div>

      <div className="topup-amount-input__field-wrapper">
        <span className="topup-amount-input__currency-symbol">$</span>
        <input
          type="text"
          className="topup-amount-input__field"
          value={amount}
          onChange={handleInputChange}
          placeholder="0.00"
          inputMode="decimal"
          autoComplete="off"
        />
      </div>

      <div className="topup-amount-input__quick-amounts">
        {QUICK_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="topup-amount-input__quick-btn"
            onClick={() => handleQuickAmount(preset)}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="topup-amount-input__details">
        <div className="topup-amount-input__detail-row">
          <span className="topup-amount-input__detail-label">Balance</span>
          <span className="topup-amount-input__detail-value">
            {parseFloat(asset.balance).toFixed(4)} {asset.symbol}
          </span>
        </div>
        <div className="topup-amount-input__detail-row">
          <span className="topup-amount-input__detail-label">Min</span>
          <span className="topup-amount-input__detail-value">
            ${asset.minAmount}
          </span>
        </div>
        <div className="topup-amount-input__detail-row">
          <span className="topup-amount-input__detail-label">Max</span>
          <span className="topup-amount-input__detail-value">
            ${asset.maxAmount}
          </span>
        </div>
        <div className="topup-amount-input__detail-row">
          <span className="topup-amount-input__detail-label">Est. Fee</span>
          <span className="topup-amount-input__detail-value">
            {asset.estimatedFee}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="topup-amount-input__continue-btn"
        onClick={onContinue}
        disabled={!isValid}
      >
        Continue
      </button>
    </div>
  )
}

export default TopUpAmountInput
