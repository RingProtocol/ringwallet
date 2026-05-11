import React from 'react'
import { CARD_PROVIDERS } from '../../../../config/cardProviders'
import { cardProviderRegistry } from '../../services/registry'
import { useI18n } from '../../../../i18n'
import type { CardAccount } from '../../types'
import CardProviderCard from '../CardProviderCard'
import '../Card.css'

interface Props {
  /**
   * Click handler for the per-row "My Card" button. The parent decides whether
   * clicking leads to the card-detail dashboard (account already exists for
   * this provider) or to the apply page (no account yet).
   */
  onViewDetails: (providerId: string) => void
  accounts?: CardAccount[]
}

const CardOnboardingView: React.FC<Props> = ({ onViewDetails, accounts = [] }) => {
  const { t } = useI18n()
  const linkedProviders = new Set(accounts.map((a) => a.provider))

  return (
    <div className="card-onboarding">
      <div className="card-onboarding__header">
        <h2 className="card-onboarding__title">{t('cardOnboardTitle')}</h2>
        <p className="card-onboarding__subtitle">{t('cardOnboardSubtitle')}</p>
      </div>

      <div className="card-onboarding__list">
        {CARD_PROVIDERS.map((provider) => {
          const adapterAvailable = cardProviderRegistry.has(provider.id)
          const hasAccount = linkedProviders.has(provider.id)
          return (
            <CardProviderCard
              key={provider.id}
              provider={provider}
              onViewDetails={
                adapterAvailable ? () => onViewDetails(provider.id) : undefined
              }
              viewDetailsVariant={hasAccount ? 'primary' : 'muted'}
            />
          )
        })}
      </div>

      <p className="card-onboarding__footer">{t('cardOnboardFooter')}</p>
    </div>
  )
}

export default CardOnboardingView
