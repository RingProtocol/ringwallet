import React, { useState } from 'react'
import { useAuth, type UserData } from '../contexts/AuthContext'
import PasskeyService from '../services/passkeyService'
import { WalletType } from '../models/WalletType'
import BiometricGuide from './BiometricGuide'
import './LoginButton.css'

const LoginButton: React.FC = () => {
  const { isLoggedIn, login, logout, user, activeWallet } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [showBiometricGuide, setShowBiometricGuide] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{
    isSupported: boolean;
    isSecureContext: boolean;
    isApiAvailable: boolean;
    isUVPAAAvailable: boolean;
    isConditionalMediationAvailable: boolean;
  } | null>(null)

  const checkAvailabilityGuard = async (): Promise<boolean> => {
    const availability = await PasskeyService.checkAvailability()
    setDebugInfo(availability)

    console.log("availability:", availability);
    if (!availability.isSecureContext) {
      setError('Passkey 需要在安全环境(HTTPS)下运行')
      return false
    }
    if (!availability.isApiAvailable) {
      setError('您的浏览器版本过低或不支持Passkey，请升级Chrome/Edge/Safari')
      return false
    }
    if (!availability.isUVPAAAvailable) {
      setShowBiometricGuide(true)
      return false
    }
    return true
  }

  const loginWithCredential = (credential: {
    id: string;
    rawId: number[];
    type: string;
    userHandle: string | null;
    masterSeed: Uint8Array | null;
    publicKey: Map<number, Uint8Array> | null;
  }) => {
    const storedUser = localStorage.getItem('last_registered_username')
    const displayUser = credential.userHandle || storedUser || 'Passkey用户'
    console.log("[login]credential=", credential);
    console.log("[login]displayUser=", displayUser);
    let finalMasterSeed = credential.masterSeed
    if (!finalMasterSeed) {
      const seedKey = `eoa_seed_${credential.id}`
      const storedSeed = localStorage.getItem(seedKey)
      console.log("[login]storedSeed=", storedSeed);
      if (storedSeed) {
        try {
          finalMasterSeed = new Uint8Array(JSON.parse(storedSeed))
        } catch { /* ignore parse error */ }
      }
      console.log("[login]finalMasterSeed=", finalMasterSeed);
      if (!finalMasterSeed) {
        finalMasterSeed = new Uint8Array(32)
        crypto.getRandomValues(finalMasterSeed)
        localStorage.setItem(seedKey, JSON.stringify(Array.from(finalMasterSeed)))
        console.log("[login]localStorage.setItem(seedKey, JSON.stringify(Array.from(finalMasterSeed)))=", localStorage.getItem(seedKey));
      }
    }

    const userData: UserData = {
      id: credential.id,
      name: displayUser,
      loginTime: new Date().toLocaleString('zh-CN'),
      masterSeed: finalMasterSeed ?? undefined,
      publicKey: credential.publicKey,
      accountType: WalletType.EOA
    }

    login(userData)
  }

  const handleBiometricRetry = async () => {
    setIsLoading(true)
    setError('')
    PasskeyService.clearSupportCache()
    const availability = await PasskeyService.checkAvailability()
    setIsLoading(false)
    if (availability.isUVPAAAvailable) {
      setShowBiometricGuide(false)
    } else {
      setError('仍未检测到设备验证，请确认已完成设置')
    }
  }

  const handlePasskeyLogin = async () => {
    setIsLoading(true)
    setError('')
    setShowCreateAccount(false)
    setShowBiometricGuide(false)
    setDebugInfo(null)

    try {
      if (!await checkAvailabilityGuard()) return

      const hasRegisteredBefore =
        localStorage.getItem('wallet_login_state') ||
        localStorage.getItem('last_registered_username') ||
        Object.keys(localStorage).some(k => k.startsWith('new_wallet_pk_'))

      if (!hasRegisteredBefore) {
        setShowCreateAccount(true)
        return
      }

      const result = await PasskeyService.login()

      if (result.success && result.credential) {
        loginWithCredential(result.credential)
      } else {
        setShowCreateAccount(true)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('登录过程中发生错误：' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    setIsLoading(true)
    setError('')
    setShowCreateAccount(false)

    try {
      const fallbackUsername = localStorage.getItem('last_registered_username') || '本机用户'
      const registerResult = await PasskeyService.register(fallbackUsername)

      if (registerResult.success && registerResult.credential) {
        localStorage.setItem('last_registered_username', fallbackUsername)
        loginWithCredential({
          id: registerResult.credential.id,
          rawId: registerResult.credential.rawId,
          type: registerResult.credential.type,
          userHandle: fallbackUsername,
          masterSeed: registerResult.credential.masterSeed,
          publicKey: registerResult.credential.publicKey as Map<number, Uint8Array> | null
        })
      } else {
        setError('创建账户失败: ' + (registerResult.error || '请重试'))
      }
    } catch (err) {
      console.error('Create account error:', err)
      setError('创建账户过程中发生错误：' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  if (isLoggedIn) {
    return (
      <div className="login-status">
        <div className="user-info">
          <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '12px', background: '#eef2ff', color: '#334155', fontSize: '12px' }}>
            {activeWallet?.type === WalletType.SmartContract ? '钱包类型: 智能合约' : '钱包类型: EOA'}
          </span>
        </div>

        <button className="logout-button" onClick={handleLogout} style={{ marginTop: '20px' }}>退出登录</button>
      </div>
    )
  }

  return (
    <div className="login-container">
      {showBiometricGuide ? (
        <BiometricGuide onRetry={handleBiometricRetry} isChecking={isLoading} />
      ) : showCreateAccount ? (
        <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0369a1' }}>
            未找到已有账户
          </p>
          <button
            className="login-button"
            onClick={handleCreateAccount}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? '创建中...' : '创建新账户'}
          </button>
        </div>
      ) : (
        <button
          className="login-button"
          onClick={handlePasskeyLogin}
          disabled={isLoading}
        >
          {isLoading ? '登录中...' : '登录'}
        </button>
      )}

      {error && <div className="error-message">{error}</div>}

      {debugInfo && !debugInfo.isSupported && (
        <div className="debug-info" style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', textAlign: 'left' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>环境检测详情:</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li>{debugInfo.isSecureContext ? '✅' : '❌'} HTTPS/安全上下文</li>
            <li>{debugInfo.isApiAvailable ? '✅' : '❌'} WebAuthn API</li>
            <li>{debugInfo.isUVPAAAvailable ? '✅' : '❌'} 平台验证器(指纹/面容)</li>
            <li>{debugInfo.isConditionalMediationAvailable ? '✅' : '⚠️'} 自动填充支持 (非必须)</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default LoginButton
