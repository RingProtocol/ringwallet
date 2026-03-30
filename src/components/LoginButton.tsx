import React, { useState, useEffect } from 'react'
import { useAuth, type UserData } from '../contexts/AuthContext'
import PasskeyService from '../services/account/passkeyService'
import { WalletType } from '../models/WalletType'
import BiometricGuide from './BiometricGuide'
import * as DbgLog from '../utils/DbgLog'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'
import './LoginButton.css'
import { useI18n } from '../i18n'

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
    DbgLog.log('[login]credential=', credential)

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
          style={{
            padding: '12px',
            background: showCreateAccount ? '#f0f9ff' : 'transparent',
            borderRadius: '8px',
            border: showCreateAccount ? '1px solid #bae6fd' : 'none',
          }}
        >
          {showCreateAccount && (
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#0369a1',
              }}
            >
              {t('noAccountFound')}
            </p>
          )}
          <button
            className="login-button"
            onClick={handlePasskeyLogin}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading && !isCreatingAccount ? t('loggingIn') : t('login')}
          </button>
          <button
            className="login-button"
            onClick={handleCreateAccount}
            disabled={isLoading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isCreatingAccount ? t('creating') : t('createAccount')}
          </button>
          {!hasLoginHistory && !showCreateAccount && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              {t('loginTipNoPasskey')}
            </p>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {debugInfo && !debugInfo.isSupported && (
        <div
          className="debug-info"
          style={{
            marginTop: '10px',
            padding: '10px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            textAlign: 'left',
          }}
        >
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            {t('envCheckDetails')}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
