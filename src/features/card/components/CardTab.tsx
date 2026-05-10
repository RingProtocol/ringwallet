import React from 'react'
import { useI18n } from '../../../i18n'
import CardApp from './CardApp'
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
  return <CardApp />
}
