import React, { useState, useEffect, useCallback, useRef } from 'react'
import '../Card.css'

interface Props {
  cardNumber: string
  cvc: string
  expiryMonth: number
  expiryYear: number
}

const AUTO_HIDE_TIMEOUT = 60

const CardDetailsReveal: React.FC<Props> = ({
  cardNumber,
  cvc,
  expiryMonth,
  expiryYear,
}) => {
  const [revealed, setRevealed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const formatCardNumber = (num: string, show: boolean) => {
    if (!show) {
      const last4 = num.slice(-4)
      return `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${last4}`
    }
    return num.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (month: number, year: number) => {
    return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
  }

  const handleReveal = useCallback(() => {
    // Simulate biometric verification
    setRevealed(true)
    setCountdown(AUTO_HIDE_TIMEOUT)
  }, [])

  const handleHide = useCallback(() => {
    setRevealed(false)
    setCountdown(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (revealed && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            setRevealed(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [revealed, countdown])

  return (
    <div className="card-details-reveal">
      <div className="card-details-reveal__header">
        <button
          type="button"
          className="card-details-reveal__back"
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
        <h3 className="card-details-reveal__title">Card Details</h3>
      </div>

      <div className="card-details-reveal__card">
        <div className="card-details-reveal__field">
          <span className="card-details-reveal__field-label">Card Number</span>
          <span className="card-details-reveal__field-value card-details-reveal__field-value--mono">
            {formatCardNumber(cardNumber, revealed)}
          </span>
        </div>

        <div className="card-details-reveal__row">
          <div className="card-details-reveal__field">
            <span className="card-details-reveal__field-label">Expiry</span>
            <span className="card-details-reveal__field-value card-details-reveal__field-value--mono">
              {revealed ? formatExpiry(expiryMonth, expiryYear) : '\u2022\u2022/\u2022\u2022'}
            </span>
          </div>
          <div className="card-details-reveal__field">
            <span className="card-details-reveal__field-label">CVC</span>
            <span className="card-details-reveal__field-value card-details-reveal__field-value--mono">
              {revealed ? cvc : '\u2022\u2022\u2022'}
            </span>
          </div>
        </div>
      </div>

      {revealed && (
        <div className="card-details-reveal__countdown">
          <div className="card-details-reveal__countdown-bar">
            <div
              className="card-details-reveal__countdown-progress"
              style={{ width: `${(countdown / AUTO_HIDE_TIMEOUT) * 100}%` }}
            />
          </div>
          <span className="card-details-reveal__countdown-text">
            Auto-hide in {countdown}s
          </span>
        </div>
      )}

      <div className="card-details-reveal__actions">
        {!revealed ? (
          <button
            type="button"
            className="card-details-reveal__reveal-btn"
            onClick={handleReveal}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Reveal Card Details</span>
          </button>
        ) : (
          <button
            type="button"
            className="card-details-reveal__hide-btn"
            onClick={handleHide}
          >
            Hide Now
          </button>
        )}
      </div>

      <p className="card-details-reveal__warning">
        Never share your card details with anyone. These details are shown for
        your reference only.
      </p>
    </div>
  )
}

export default CardDetailsReveal
