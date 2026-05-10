import React from 'react'
import { CARD_PROVIDERS } from '../../../../config/cardProviders'
import CardProviderCard from '../CardProviderCard'
import '../Card.css'

interface Props {
  onApply: (providerId: string) => void
}

const INTEGRATED_PROVIDERS = new Set(['immersve'])

const CardOnboardingView: React.FC<Props> = ({ onApply }) => {
  return (
    <div className="card-onboarding">
      <div className="card-onboarding__header">
        <h2 className="card-onboarding__title">Get a Crypto Card</h2>
        <p className="card-onboarding__subtitle">
          Spend your crypto anywhere Visa is accepted. Choose a provider and
          apply for a virtual card in minutes.
        </p>
      </div>

      <div className="card-onboarding__list">
        {CARD_PROVIDERS.map((provider) => (
          <CardProviderCard
            key={provider.id}
            provider={provider}
            onApply={
              INTEGRATED_PROVIDERS.has(provider.id)
                ? () => onApply(provider.id)
                : undefined
            }
          />
        ))}
      </div>

      <p className="card-onboarding__footer">
        More providers coming soon
      </p>
    </div>
  )
}

export default CardOnboardingView
