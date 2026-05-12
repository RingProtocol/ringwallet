'use client'

import React from 'react'
import { useI18n } from '../../i18n'
import styles from './InstallPwaGuideCard.module.css'

const InstallPwaGuideCard: React.FC = () => {
  const { t } = useI18n()

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <img
          src="/icons/logo.png"
          alt="Ring Wallet"
          width={46}
          height={46}
          className={styles.appIcon}
        />
        <div className={styles.cardTitle}>{t('installRingWallet')}</div>
      </div>

      <div className={styles.steps}>
        <div className={styles.stepLine}>{t('installStep1')}</div>
        <div className={styles.hintWrapper}>
          <img
            src="/assets/pwa/instructions-pwa-install.png"
            alt={t('installStep1')}
            className={styles.hintImage}
          />
        </div>
        <div className={styles.stepLine}>
          {t('installStep2Prefix')}
          <span className={styles.inlineTag}>{t('installAddToHome')}</span>
        </div>
      </div>
    </section>
  )
}

export default InstallPwaGuideCard
