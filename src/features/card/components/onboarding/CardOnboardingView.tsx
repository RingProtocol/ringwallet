import React from 'react'
import { CARD_PROVIDERS } from '../../../../config/cardProviders'
import { cardProviderRegistry } from '../../services/registry'
import { useI18n } from '../../../../i18n'
import CardProviderCard from '../CardProviderCard'
import '../Card.css'

interface Props {
  onApply: (providerId: string) => void
}

const CardOnboardingView: React.FC<Props> = ({ onApply }) => {
  const { t } = useI18n()
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
          />
        ))}
      </div>

      <p className="card-onboarding__footer">{t('cardOnboardFooter')}</p>
    </div>
  )
}

export default CardOnboardingView
