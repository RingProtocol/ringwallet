import React from 'react'
import type { DAppInfo } from '../types/dapp'

interface Props {
  dapp: DAppInfo
  onClick: (dapp: DAppInfo) => void
}

const DAppCard: React.FC<Props> = ({ dapp, onClick }) => {
  return (
    <button className="dapp-card" onClick={() => onClick(dapp)}>
      <img
        className="dapp-card__icon"
        src={dapp.icon || undefined}
        alt={dapp.name}
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="%23667eea"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-family="sans-serif">D</text></svg>'
        }}
      />
      <div className="dapp-card__info">
        <span className="dapp-card__name">{dapp.name}</span>
        <span className="dapp-card__desc">{dapp.description}</span>
      </div>
    </button>
  )
}

export default DAppCard
