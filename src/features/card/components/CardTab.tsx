import React from 'react'
import { CARD_PROVIDERS } from '../../../config/cardProviders'
import { useI18n } from '../../../i18n'
import CardProviderCard from './CardProviderCard'
import './Card.css'

export const CardTabHeader: React.FC = () => {
  const { t } = useI18n()

  return (
    <header className="wallet-main-page__top-bar wallet-main-page__top-bar--collapsed">
      <h1 className="wallet-main-page__tab-title">{t('cardTab')}</h1>
    </header>
  )
}

export const CardTabBody: React.FC = () => {
  return (
    <div className="card-tab">
      <div className="card-tab__header">
        <p className="card-tab__subtitle">
          Get a crypto card to spend your assets anywhere Visa is accepted
        </p>
      </div>
      <div className="card-tab__list">
        {CARD_PROVIDERS.map((provider) => (
          <CardProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  )
}
