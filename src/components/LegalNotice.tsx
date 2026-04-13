import React from 'react'
import { useI18n } from '../i18n'
import './LegalNotice.css'

const LegalNotice: React.FC = () => {
  const { t } = useI18n()

  return (
    <p className="legal-notice">
      {t('legalNoticePrefix')}
      <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">
        {t('termsOfService')}
      </a>
      {t('legalNoticeMid')}
      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
        {t('privacyPolicy')}
      </a>
      {t('legalNoticeSuffix')}
    </p>
  )
}

export default LegalNotice
