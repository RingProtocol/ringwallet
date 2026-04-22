import React, { useState, useEffect } from 'react'
import { useAuth, type UserData } from '../contexts/AuthContext'
import PasskeyService from '../services/account/passkeyService'
import { WalletType } from '../models/WalletType'
import BiometricGuide from './BiometricGuide'
import LegalNotice from './LegalNotice'
import * as DbgLog from '../utils/DbgLog'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'
import './LoginButton.css'
import { useI18n } from '../i18n'
import { TESTID } from './testids'

const LoginButton: React.FC = () => {
  const { isLoggedIn, login } = useAuth()
  const { lang, t } = useI18n()
  const [hasLoginHistory, setHasLoginHistory] = useState(true)

  useEffect(() => {
    setHasLoginHistory(!!safeGetItem('user_has_passkey'))
  }, [])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [error, setError] = useState('')
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [showBiometricGuide, setShowBiometricGuide] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{
    isSupported: boolean
    isSecureContext: boolean
    isApiAvailable: boolean
    isUVPAAAvailable: boolean
    isConditionalMediationAvailable: boolean
    isIOSFallback?: boolean
  } | null>(null)

  const checkAvailabilityGuard = async (): Promise<boolean> => {
    const availability = await PasskeyService.checkAvailability()
    setDebugInfo(availability)

    DbgLog.log('availability:', availability)
    if (!availability.isSecureContext) {
      setError(t('passkeyNeedsSecureContext'))
      return false
    }
    if (!availability.isApiAvailable) {
      setError(t('passkeyApiUnavailable'))
      return false
    }
    if (!availability.isUVPAAAvailable) {
      setShowBiometricGuide(true)
      return false
    }
    return true
  }

  const loginWithCredential = (credential: {
    id: string
    rawId: number[]
    type: string
    userHandle: string | null
    masterSeed: Uint8Array | null
    publicKey: Map<number, Uint8Array> | null
  }) => {
    if (!credential.masterSeed) {
      setError(t('cannotRestoreSeed'))
      return
    }

    const userData: UserData = {
      id: credential.id,
      name: credential.userHandle || 'RingWallet',
      loginTime: new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US'),
      masterSeed: credential.masterSeed,
      publicKey: credential.publicKey,
      accountType: WalletType.EOA,
    }

    login(userData)
    safeSetItem('user_has_passkey', 'true')
  }

  const handleBiometricRetry = async () => {
    setIsCreatingAccount(false)
    setIsLoading(true)
    setError('')
    PasskeyService.clearSupportCache()
    const availability = await PasskeyService.checkAvailability()
    setIsLoading(false)
    if (availability.isUVPAAAvailable) {
      setShowBiometricGuide(false)
    } else {
      setError(t('biometricNotDetected'))
    }
  }

  const handlePasskeyLogin = async () => {
    setIsCreatingAccount(false)
    setIsLoading(true)
    setError('')
    setShowCreateAccount(false)
    setShowBiometricGuide(false)
    setDebugInfo(null)

    try {
      if (!(await checkAvailabilityGuard())) return

      const result = await PasskeyService.login()

      if (result.success && result.credential) {
        loginWithCredential(result.credential)
      } else {
        setShowCreateAccount(true)
      }
    } catch (err) {
      console.error('Login error:', err)
      setShowCreateAccount(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    setIsCreatingAccount(true)
    setIsLoading(true)
    setError('')
    setShowCreateAccount(false)

    try {
      const now = new Date()
      const username = `RingWallet_${now.getMonth() + 1}.${now.getDate()}}`
      const registerResult = await PasskeyService.register(username)

      if (registerResult.success && registerResult.credential) {
        loginWithCredential({
          id: registerResult.credential.id,
          rawId: registerResult.credential.rawId,
          type: registerResult.credential.type,
          userHandle: username,
          masterSeed: registerResult.credential.masterSeed,
          publicKey: registerResult.credential.publicKey as Map<
            number,
            Uint8Array
          > | null,
        })
      } else {
        setError(
          t('createAccountFailed', {
            message: registerResult.error || t('retry'),
          })
        )
      }
    } catch (err) {
      console.error('Create account error:', err)
      setError(t('createAccountError', { message: (err as Error).message }))
    } finally {
      setIsCreatingAccount(false)
      setIsLoading(false)
    }
  }

  if (isLoggedIn) {
    return null
  }

  return (
    <div className="login-container">
      {showBiometricGuide ? (
        <BiometricGuide onRetry={handleBiometricRetry} isChecking={isLoading} />
      ) : (
        <div
          className={`login-form-wrap${showCreateAccount ? ' login-form-wrap--callout' : ''}`}
        >
          {showCreateAccount && (
            <p className="login-no-account-msg">{t('noAccountFound')}</p>
          )}
          <button
            className="login-button login-button--primary"
            onClick={handlePasskeyLogin}
            disabled={isLoading}
            data-testid={TESTID.LOGIN_BUTTON}
          >
            {isLoading && !isCreatingAccount
              ? t('loggingIn')
              : t('iHaveAWallet')}
          </button>
          <button
            className="login-button login-button--secondary"
            onClick={handleCreateAccount}
            disabled={isLoading}
            data-testid={TESTID.CREATE_ACCOUNT_BUTTON}
          >
            {isCreatingAccount ? t('creating') : t('createNewWallet')}
          </button>
          {!hasLoginHistory && !showCreateAccount && (
            <p className="login-tip">{t('loginTipNoPasskey')}</p>
          )}
          <LegalNotice />
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {debugInfo && !debugInfo.isSupported && (
        <div className="debug-info">
          <p className="debug-info__title">{t('envCheckDetails')}</p>
          <ul className="debug-info__list">
            <li>
              {debugInfo.isSecureContext ? '✅' : '❌'}{' '}
              {t('httpsSecureContextLabel')}
            </li>
            <li>
              {debugInfo.isApiAvailable ? '✅' : '❌'} {t('webauthnApiLabel')}
            </li>
            <li>
              {debugInfo.isUVPAAAvailable ? '✅' : '❌'}{' '}
              {t('platformAuthenticatorLabel')}
              {debugInfo.isIOSFallback
                ? ` ${t('iosPasscodeFallbackLabel')}`
                : ''}
            </li>
            <li>
              {debugInfo.isConditionalMediationAvailable ? '✅' : '⚠️'}{' '}
              {t('conditionalMediationLabel')}
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default LoginButton
