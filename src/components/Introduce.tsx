import React from 'react'
import './Introduce.css'
import { useI18n } from '../i18n'

interface IntroDotProps {
  icon: React.ReactNode
  title: string
  sub: string
}

const IntroDot: React.FC<IntroDotProps> = ({ icon, title, sub }) => (
  <div className="introduce-dot">
    <div className="introduce-dot__icon">{icon}</div>
    <div className="introduce-dot__text">
      <div className="introduce-dot__title">{title}</div>
      <div className="introduce-dot__sub">{sub}</div>
    </div>
  </div>
)

const Introduce: React.FC = () => {
  const { t } = useI18n()

  return (
    <section className="introduce" aria-label="Product introduction">
      <h1 className="introduce-title">
        {t('welcomeTo')}{' '}
        <span className="introduce-title__gradient">{t('ring')}</span>
      </h1>
      <p className="introduce-subtitle">{t('welcomeSubtitle')}</p>

      <div className="introduce-dots">
        <IntroDot
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
          title={t('introSelfCustodyTitle')}
          sub={t('introSelfCustodySub')}
        />
        <IntroDot
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
          }
          title={t('introMultiChainTitle')}
          sub={t('introMultiChainSub')}
        />
        <IntroDot
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="7 17 17 7" />
              <polyline points="8 7 17 7 17 16" />
            </svg>
          }
          title={t('introSwapTitle')}
          sub={t('introSwapSub')}
        />
        <IntroDot
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title={t('introNoFeeTitle')}
          sub={t('introNoFeeSub')}
        />
        {/* <IntroDot
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          }
          title={t('introDevFriendlyTitle')}
          sub={t('introDevFriendlySub')}
        /> */}
      </div>
    </section>
  )
}

export default Introduce
