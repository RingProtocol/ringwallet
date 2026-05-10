import React from 'react'
import '../Card.css'

interface Props {
  onStart: () => void
}

const TopUpEntry: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="topup-entry" onClick={onStart} role="button" tabIndex={0}>
      <div className="topup-entry__icon" aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <div className="topup-entry__info">
        <h3 className="topup-entry__title">Top Up Your Card</h3>
        <p className="topup-entry__desc">
          Add funds using crypto from your wallet
        </p>
      </div>
      <span className="topup-entry__arrow" aria-hidden="true">
        &rsaquo;
      </span>
    </div>
  )
}

export default TopUpEntry
