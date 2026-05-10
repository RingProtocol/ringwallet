import React from 'react'
import { CARD_PROVIDERS } from '../../../../config/cardProviders'
import { cardProviderRegistry } from '../../services/registry'
import { useI18n } from '../../../../i18n'
import type { CardAccount } from '../../types'
import CardProviderCard from '../CardProviderCard'
import '../Card.css'

interface Props {
  onApply: (providerId: string) => void
  accounts?: CardAccount[]
  onViewDetails?: (providerId: string) => void
}

const CardOnboardingView: React.FC<Props> = ({ onApply, accounts = [], onViewDetails }) => {
  const { t } = useI18n()
  const linkedProviders = new Set(accounts.map((a) => a.provider))

  return (
    <div className="card-onboarding">
      <div className="card-onboarding__header">
        <h2 className="card-onboarding__title">{t('cardOnboardTitle')}</h2>
        <p className="card-onboarding__subtitle">{t('cardOnboardSubtitle')}</p>
      </div>

      <div className="card-onboarding__list">
        {CARD_PROVIDERS.map((provider) => (
          <CardProviderCard
            key={provider.id}
            provider={provider}
            onApply={
              cardProviderRegistry.has(provider.id)
                ? () => onApply(provider.id)
                : undefined
            }
            onViewDetails={
              linkedProviders.has(provider.id) && onViewDetails
                ? () => onViewDetails(provider.id)
                : undefined
            }
          />
        ))}
      </div>

      <p className="card-onboarding__footer">{t('cardOnboardFooter')}</p>
    </div>
  )
}

export default CardOnboardingView
