import React, { useState } from 'react'
import { detectPlatform, type Platform } from '../utils/platformDetect'
import { useI18n, type MessageKey } from '../i18n'
import './BiometricGuide.css'

interface BiometricGuideProps {
  onRetry: () => void
  isChecking: boolean
}

interface PlatformGuide {
  biometricTitle: string
  biometricSteps: string[]
  fallbackTitle: string
  fallbackSteps: string[]
}

function buildGuide(platform: Platform, t: (key: MessageKey) => string): PlatformGuide {
  if (platform === 'ios') {
    return {
      biometricTitle: t('bioIosBiometricTitle'),
      biometricSteps: [
        t('bioIosBiometricStep1'),
        t('bioIosBiometricStep2'),
        t('bioIosBiometricStep3'),
        t('bioIosBiometricStep4'),
        t('bioIosBiometricStep5'),
      ],
      fallbackTitle: t('bioIosFallbackTitle'),
      fallbackSteps: [t('bioIosFallbackStep1'), t('bioIosFallbackStep2')],
    }
  }
  if (platform === 'android') {
    return {
      biometricTitle: t('bioAndroidBiometricTitle'),
      biometricSteps: [
        t('bioAndroidBiometricStep1'),
        t('bioAndroidBiometricStep2'),
        t('bioAndroidBiometricStep3'),
        t('bioAndroidBiometricStep4'),
        t('bioAndroidBiometricStep5'),
      ],
      fallbackTitle: t('bioAndroidFallbackTitle'),
      fallbackSteps: [t('bioAndroidFallbackStep1'), t('bioAndroidFallbackStep2')],
    }
  }
  if (platform === 'macos') {
    return {
      biometricTitle: t('bioMacosBiometricTitle'),
      biometricSteps: [
        t('bioMacosBiometricStep1'),
        t('bioMacosBiometricStep2'),
        t('bioMacosBiometricStep3'),
        t('bioMacosBiometricStep4'),
      ],
      fallbackTitle: t('bioMacosFallbackTitle'),
      fallbackSteps: [t('bioMacosFallbackStep1'), t('bioMacosFallbackStep2')],
    }
  }
  if (platform === 'windows') {
    return {
      biometricTitle: t('bioWindowsBiometricTitle'),
      biometricSteps: [
        t('bioWindowsBiometricStep1'),
        t('bioWindowsBiometricStep2'),
        t('bioWindowsBiometricStep3'),
        t('bioWindowsBiometricStep4'),
        t('bioWindowsBiometricStep5'),
      ],
      fallbackTitle: t('bioWindowsFallbackTitle'),
      fallbackSteps: [t('bioWindowsFallbackStep1'), t('bioWindowsFallbackStep2')],
    }
  }
  return {
    biometricTitle: t('bioDesktopBiometricTitle'),
    biometricSteps: [
      t('bioDesktopBiometricStep1'),
      t('bioDesktopBiometricStep2'),
      t('bioDesktopBiometricStep3'),
      t('bioDesktopBiometricStep4'),
    ],
    fallbackTitle: t('bioDesktopFallbackTitle'),
    fallbackSteps: [t('bioDesktopFallbackStep1')],
  }
}

function renderBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
  )
}

const BiometricGuide: React.FC<BiometricGuideProps> = ({ onRetry, isChecking }) => {
  const { t } = useI18n()
  const [retryCount, setRetryCount] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const platform = detectPlatform()
  const guide = buildGuide(platform, t)

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    onRetry()
  }

  return (
    <div className="biometric-guide">
      <div className="biometric-guide-header">
        <span className="biometric-guide-icon">🔐</span>
        <h3>{t('biometricGuideTitle')}</h3>
      </div>

      <p className="biometric-guide-desc">
        {t('biometricGuideDesc')}
      </p>

      <div className="biometric-guide-section biometric-guide-primary">
        <div className="biometric-guide-section-label">{t('biometricGuideRecommended')}</div>
        <h4>{guide.biometricTitle}</h4>
        <ol className="biometric-guide-steps">
          {guide.biometricSteps.map((step, i) => (
            <li key={i}>{renderBoldText(step)}</li>
          ))}
        </ol>
      </div>

      {!showFallback ? (
        <button
          className="biometric-guide-toggle"
          onClick={() => setShowFallback(true)}
        >
          {t('biometricGuideToggleFallback')}
        </button>
      ) : (
        <div className="biometric-guide-section biometric-guide-fallback">
          <h4>{guide.fallbackTitle}</h4>
          <p className="biometric-guide-fallback-hint">
            {t('biometricGuideFallbackHint')}
          </p>
          <ol className="biometric-guide-steps">
            {guide.fallbackSteps.map((step, i) => (
              <li key={i}>{renderBoldText(step)}</li>
            ))}
          </ol>
        </div>
      )}

      <button
        className="biometric-guide-retry"
        onClick={handleRetry}
        disabled={isChecking}
      >
        {isChecking ? t('biometricGuideChecking') : t('biometricGuideRetry')}
      </button>

      {retryCount >= 2 && (
        <p className="biometric-guide-hint">
          {t('biometricGuideRetryHint')}
        </p>
      )}
    </div>
  )
}

export default BiometricGuide
