'use client'

import React from 'react'
import { useI18n } from '../../i18n'
import styles from './InstallPwaGuideCard.module.css'

const InstallPwaGuideCard: React.FC = () => {
  const { t } = useI18n()

  return (
    <section className={styles.card}>
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <div className={styles.stepText}>{t('installStep1')}</div>
            <img
              src="/assets/getapp/how-to-share.png"
              alt={t('installStep1')}
              className={styles.stepImage}
            />
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepContent}>
            <div className={styles.stepText}>{t('installStep2')}</div>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepContent}>
            <div className={styles.stepText}>{t('installStep3')}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InstallPwaGuideCard
