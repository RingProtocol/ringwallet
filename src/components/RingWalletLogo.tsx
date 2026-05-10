import React from 'react'
import './RingWalletLogo.css'

const RingWalletLogo: React.FC = () => {
  return (
    <div className="ring-wallet-logo" aria-hidden>
      <div className="ring-wallet-logo__icon">
        <svg
          width="42"
          height="42"
          viewBox="0 0 48 48"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient
              id="ringGradLogo"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#f15266" />
              <stop offset="50%" stopColor="#bc74ed" />
              <stop offset="100%" stopColor="#1abee9" />
            </linearGradient>
          </defs>
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke="url(#ringGradLogo)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="90 120"
            transform="rotate(-30 24 24)"
          />
          <circle cx="24" cy="24" r="4.5" fill="url(#ringGradLogo)" />
        </svg>
      </div>
    </div>
  )
}

export default RingWalletLogo
