import React from 'react'

interface Props {
  amount: string
  currency?: string
  className?: string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  SGD: 'S$',
  HKD: 'HK$',
  AUD: 'A$',
  JPY: '\u00A5',
}

const CurrencyAmount: React.FC<Props> = ({
  amount,
  currency = 'USD',
  className = '',
}) => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `

  const numericAmount = parseFloat(amount)
  const formatted =
    isNaN(numericAmount)
      ? amount
      : numericAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

  return (
    <span className={`currency-amount ${className}`}>
      <span className="currency-amount__symbol">{symbol}</span>
      <span className="currency-amount__value">{formatted}</span>
    </span>
  )
}

export default CurrencyAmount
