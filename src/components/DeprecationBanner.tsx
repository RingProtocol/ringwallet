import { useState } from 'react'
import { useI18n } from '@/i18n'
import './DeprecationBanner.css'

export default function DeprecationBanner() {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="deprecation-banner" role="alert">
      <div className="deprecation-banner__content">
        <span className="deprecation-banner__icon">⚠</span>
        <p className="deprecation-banner__text">{t('deprecationNotice')}</p>
      </div>
      <button
        className="deprecation-banner__close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
