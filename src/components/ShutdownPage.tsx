import { useI18n } from '@/i18n'
import './ShutdownPage.css'

export default function ShutdownPage() {
  const { t } = useI18n()

  return (
    <div className="shutdown-page">
      <div className="shutdown-page__card">
        <span className="shutdown-page__icon" aria-hidden="true">
          ⚠
        </span>
        <h1 className="shutdown-page__title">{t('shutdownNoticeTitle')}</h1>
        <p className="shutdown-page__body">{t('shutdownNoticeBody')}</p>
      </div>
    </div>
  )
}
