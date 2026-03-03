import React, { useState } from 'react'
import { useAuth, type UserData } from '../contexts/AuthContext'
import PasskeyService from '../services/passkeyService'
import './LoginButton.css'

const LoginButton: React.FC = () => {
  const { isLoggedIn, login, logout, user, activeWallet } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<{
    isSupported: boolean;
    isSecureContext: boolean;
    isApiAvailable: boolean;
    isUVPAAAvailable: boolean;
    isConditionalMediationAvailable: boolean;
  } | null>(null)

  const handlePasskeyLogin = async () => {
    setIsLoading(true)
    setError('')
    setDebugInfo(null)

    try {
      const availability = await PasskeyService.checkAvailability()
      setDebugInfo(availability)

      console.log("availability:", availability);
      if (!availability.isSecureContext) {
        setError('Passkey 需要在安全环境(HTTPS)下运行')
        return
      }

      if (!availability.isApiAvailable) {
        setError('您的浏览器版本过低或不支持Passkey，请升级Chrome/Edge/Safari')
        return
      }

      if (!availability.isUVPAAAvailable) {
        setError('您的设备未启用生物识别(指纹/面容)或屏幕锁，无法使用Passkey')
        return
      }

      const result = await PasskeyService.login()

      if (result.success && result.credential) {
        const storedUser = localStorage.getItem('last_registered_username')
        const displayUser = result.credential.userHandle || storedUser || 'Passkey用户'

        console.log("result.credential:", result.credential);
        console.log("result.credential.publicKey:", result.credential.publicKey);
        let accountType = localStorage.getItem('preferred_account_type') || 'eoa'
        if (result.credential.publicKey) {
          accountType = 'eip-7951'
          console.log('✅ 检测到 EIP-7951 Public Key，账户类型设置为 eip-7951')
        } else {
          accountType = 'eoa'
          console.log('ℹ️ 未找到 EIP-7951 Public Key，使用 EOA 模式')
        }

        let finalMasterSeed = result.credential.masterSeed
        if (!finalMasterSeed && accountType === 'eoa') {
          const seedKey = `eoa_seed_${result.credential.id}`
          const storedSeed = localStorage.getItem(seedKey)
          if (storedSeed) {
            try {
              finalMasterSeed = new Uint8Array(JSON.parse(storedSeed))
              console.log('✅ 从 localStorage 恢复 EOA Seed')
            } catch { /* ignore parse error */ }
          }
          if (!finalMasterSeed) {
            finalMasterSeed = new Uint8Array(32)
            crypto.getRandomValues(finalMasterSeed)
            localStorage.setItem(seedKey, JSON.stringify(Array.from(finalMasterSeed)))
            console.log('🔑 生成新的 EOA Seed 并保存到 localStorage')
          }
        }

        const userData: UserData = {
          id: result.credential.id,
          name: displayUser,
          loginTime: new Date().toLocaleString('zh-CN'),
          masterSeed: finalMasterSeed ?? undefined,
          publicKey: result.credential.publicKey,
          accountType
        }

        login(userData)
      } else {
        setError(result.error || '登录失败，请重试')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('登录过程中发生错误：' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister7951 = async () => {
    setIsLoading(true)
    setError('')
    setDebugInfo(null)

    try {
      const username = prompt('请输入用户名:')
      if (!username) {
        setIsLoading(false)
        return
      }

      const result = await PasskeyService.register(username)

      if (result.success) {
        localStorage.setItem('last_registered_username', username);
        localStorage.setItem('preferred_account_type', 'eip-7951');
        alert(`Passkey 注册成功！用户 [${username}] 已创建。\n现在可以使用它登录了。`)
      } else {
        setError('注册失败: ' + result.error)
      }
    } catch (err) {
      setError('注册错误: ' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister4337 = async () => {
    setIsLoading(true)
    setError('')
    setDebugInfo(null)

    try {
      const username = prompt('请输入用户名:')
      if (!username) {
        setIsLoading(false)
        return
      }

      const result = await PasskeyService.register(username)

      if (result.success) {
        localStorage.setItem('last_registered_username', username);
        localStorage.setItem('preferred_account_type', '4337');
        alert(`Passkey 注册成功！用户 [${username}] 已创建。\n现在可以使用它登录了。`)
      } else {
        setError('注册失败: ' + result.error)
      }
    } catch (err) {
      setError('注册错误: ' + (err as Error).message)
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
            {activeWallet?.type === 'eip-7951' ? '钱包类型: 7951' : activeWallet?.type === '4337' ? '钱包类型: 4337' : '钱包类型: 普通账户'}
          </span>
        </div>

        <button className="logout-button" onClick={handleLogout} style={{ marginTop: '20px' }}>退出登录</button>
      </div>
    )
  }

  return (
    <div className="login-container">
      <button
        className="login-button"
        onClick={handlePasskeyLogin}
        disabled={isLoading}
      >
        {isLoading ? '登录中...' : '登录'}
      </button>

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

      <div className="passkey-info">
        <p>使用指纹或面容等登录</p>
      </div>
    </div>
  )
}

export default LoginButton
