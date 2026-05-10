import React from 'react'
import { useI18n } from '../../../i18n'
import type { CardProvider } from '../../../config/cardProviders'

interface Props {
  provider: CardProvider
  onApply?: () => void
  onViewDetails?: () => void
}

const BRAND_COLORS: Record<string, string> = {
  immersve: '#6366f1',
  etherfi: '#7c3aed',
  holyheld: '#2563eb',
  baanx: '#0891b2',
  reap: '#059669',
}

const CardProviderCard: React.FC<Props> = ({ provider, onApply, onViewDetails }) => {
  const { t } = useI18n()
  const brandColor = BRAND_COLORS[provider.id] || '#667eea'

  const handleVisitSite = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(provider.url, '_blank', 'noopener,noreferrer')
  }

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation()
    onApply?.()
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    onViewDetails?.()
  }

  return (
    <div className="card-provider-row">
      {/* Left: provider info */}
      <div className="card-provider-row__left">
        <img
          className="card-provider-row__icon"
          src={provider.icon}
          alt={provider.name}
          onError={(e) => {
            const letter = provider.name.charAt(0).toUpperCase()
            ;(e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><rect width="44" height="44" rx="10" fill="${encodeURIComponent(brandColor)}"/><text x="22" y="29" text-anchor="middle" fill="white" font-size="20" font-family="sans-serif" font-weight="600">${letter}</text></svg>`
          }}
        />
        <div className="card-provider-row__info">
          <span className="card-provider-row__name">{provider.name}</span>
          <span className="card-provider-row__desc">{provider.description}</span>
          <div className="card-provider-row__regions">
            {provider.regions.map((region) => (
              <span key={region} className="card-provider-row__region">
                {region}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Center: original provider URL link */}
      <button
        type="button"
        className="card-provider-row__visit"
        onClick={handleVisitSite}
      >
        Visit site
        <svg className="card-provider-row__visit-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Right: action buttons */}
      <div className="card-provider-row__actions">
        {onViewDetails && (
          <button
            type="button"
            className="card-provider-row__details"
            onClick={handleViewDetails}
          >
            {t('cardViewDetails')}
          </button>
        )}
        <button
          type="button"
          className="card-provider-row__apply"
          onClick={handleApply}
          style={onApply ? {} : { opacity: 0.45, pointerEvents: 'none' as const }}
        >
          {t('cardApplyNow')}
          <svg className="card-provider-row__apply-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default CardProviderCard
