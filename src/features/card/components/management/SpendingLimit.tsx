import React, { useState, useCallback } from 'react'
import type { SpendingLimits } from '../../types'
import '../Card.css'

interface Props {
  limits: SpendingLimits
  onSave: (limits: SpendingLimits) => void
}

const SpendingLimit: React.FC<Props> = ({ limits, onSave }) => {
  const [daily, setDaily] = useState(limits.daily ?? '')
  const [monthly, setMonthly] = useState(limits.monthly ?? '')
  const [perTransaction, setPerTransaction] = useState(limits.perTransaction ?? '')
  const [noLimitDaily, setNoLimitDaily] = useState(limits.daily === null)
  const [noLimitMonthly, setNoLimitMonthly] = useState(limits.monthly === null)
  const [noLimitPerTx, setNoLimitPerTx] = useState(limits.perTransaction === null)

  const handleSave = useCallback(() => {
    onSave({
      daily: noLimitDaily ? null : daily || null,
      monthly: noLimitMonthly ? null : monthly || null,
      perTransaction: noLimitPerTx ? null : perTransaction || null,
    })
  }, [daily, monthly, perTransaction, noLimitDaily, noLimitMonthly, noLimitPerTx, onSave])

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    noLimit: boolean,
    onToggleNoLimit: (v: boolean) => void,
  ) => (
    <div className="spending-limit__field">
      <div className="spending-limit__field-header">
        <label className="spending-limit__label">{label}</label>
        <label className="spending-limit__no-limit">
          <input
            type="checkbox"
            checked={noLimit}
            onChange={(e) => onToggleNoLimit(e.target.checked)}
          />
          <span>No limit</span>
        </label>
      </div>
      <div className="spending-limit__input-wrapper">
        <span className="spending-limit__input-prefix">$</span>
        <input
          type="text"
          className="spending-limit__input"
          value={noLimit ? '' : value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          disabled={noLimit}
          inputMode="decimal"
        />
      </div>
    </div>
  )

  return (
    <div className="spending-limit">
      <div className="spending-limit__header">
        <button
          type="button"
          className="spending-limit__back"
          onClick={() => {
            // TODO: navigate back
          }}
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
        <h3 className="spending-limit__title">Spending Limits</h3>
      </div>

      <div className="spending-limit__fields">
        {renderField('Daily Limit', daily, setDaily, noLimitDaily, setNoLimitDaily)}
        {renderField('Monthly Limit', monthly, setMonthly, noLimitMonthly, setNoLimitMonthly)}
        {renderField('Per Transaction', perTransaction, setPerTransaction, noLimitPerTx, setNoLimitPerTx)}
      </div>

      <button
        type="button"
        className="spending-limit__save-btn"
        onClick={handleSave}
      >
        Save
      </button>
    </div>
  )
}

export default SpendingLimit
