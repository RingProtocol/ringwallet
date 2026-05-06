import React from 'react'
import type { CardProvider } from '../../../config/cardProviders'

interface Props {
  provider: CardProvider
}

const BRAND_COLORS: Record<string, string> = {
  immersve: '#6366f1',
  etherfi: '#7c3aed',
  holyheld: '#2563eb',
  baanx: '#0891b2',
  reap: '#059669',
}

const CardProviderCard: React.FC<Props> = ({ provider }) => {
  const brandColor = BRAND_COLORS[provider.id] || '#667eea'

  const handleClick = () => {
    window.open(provider.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button className="card-provider" onClick={handleClick}>
      <img
        className="card-provider__icon"
        src={provider.icon}
        alt={provider.name}
        onError={(e) => {
          const letter = provider.name.charAt(0).toUpperCase()
          ;(e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><rect width="44" height="44" rx="10" fill="${encodeURIComponent(brandColor)}"/><text x="22" y="29" text-anchor="middle" fill="white" font-size="20" font-family="sans-serif" font-weight="600">${letter}</text></svg>`
        }}
      />
      <div className="card-provider__info">
        <span className="card-provider__name">{provider.name}</span>
        <span className="card-provider__desc">{provider.description}</span>
        <div className="card-provider__regions">
          {provider.regions.map((region) => (
            <span key={region} className="card-provider__region">
              {region}
            </span>
          ))}
        </div>
      </div>
      <span className="card-provider__arrow" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

export default CardProviderCard
