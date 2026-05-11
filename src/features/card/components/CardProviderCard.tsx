import React from 'react'
import { useI18n } from '../../../i18n'
import type { CardProvider } from '../../../config/cardProviders'

interface Props {
  provider: CardProvider
  /**
   * Click handler for the "My Card" button. The parent decides whether this
   * leads to the card-detail dashboard (account exists) or the apply page
   * (account does not exist yet). When omitted the button is disabled —
   * typically because no adapter is registered for this provider.
   */
  onViewDetails?: () => void
  /**
   * Visual treatment for the "My Card" button.
   *  - `primary`: emphasized — used when the user already has a card with this provider.
   *  - `muted`: lower-contrast — used when no card exists yet (click falls back to apply).
   */
  viewDetailsVariant?: 'primary' | 'muted'
}

const BRAND_COLORS: Record<string, string> = {
  immersve: '#6366f1',
  etherfi: '#7c3aed',
  holyheld: '#2563eb',
  baanx: '#0891b2',
  reap: '#059669',
}

const CardProviderCard: React.FC<Props> = ({
  provider,
  onViewDetails,
  viewDetailsVariant = 'primary',
}) => {
  const { t } = useI18n()
  const brandColor = BRAND_COLORS[provider.id] || '#667eea'

  const handleVisitSite = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(provider.url, '_blank', 'noopener,noreferrer')
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    onViewDetails?.()
  }

  const detailsClass =
    viewDetailsVariant === 'muted'
      ? 'card-provider-row__details card-provider-row__details--muted'
      : 'card-provider-row__details'

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

      {/* Right: single action — "My Card" (opens details if account exists,
          otherwise the apply page). When `onViewDetails` is not provided the
          adapter is unavailable for this provider and the button is disabled. */}
      <div className="card-provider-row__actions">
        <button
          type="button"
          className={detailsClass}
          onClick={handleViewDetails}
          style={onViewDetails ? {} : { opacity: 0.45, pointerEvents: 'none' as const }}
        >
          {t('cardViewDetails')}
        </button>
      </div>
    </div>
  )
}

export default CardProviderCard
