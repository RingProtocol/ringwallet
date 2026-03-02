import React, { useState } from 'react'
import { useAuth, type UserData } from '../contexts/AuthContext'
import PasskeyService from '../services/passkeyService'
import CharUtils from '../utils/CharUtils'
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
        let accountType = localStorage.getItem('preferred_account_type') || 'eip-7951'
        if (result.credential.publicKey) {
          accountType = 'eip-7951'
          console.log('✅ 检测到 EIP-7951 Public Key，账户类型设置为 eip-7951')
          console.log('📊 Public Key 详情:', {
            hasPublicKey: !!result.credential.publicKey,
            isMap: result.credential.publicKey instanceof Map,
            hasX: result.credential.publicKey instanceof Map ? result.credential.publicKey.has(-2) : !!(result.credential.publicKey as Record<number, unknown>)[-2],
            hasY: result.credential.publicKey instanceof Map ? result.credential.publicKey.has(-3) : !!(result.credential.publicKey as Record<number, unknown>)[-3]
          })
        } else {
          console.warn('⚠️ 未找到 EIP-7951 Public Key，将使用传统账户模式')
        }

        const userData: UserData = {
          id: result.credential.id,
          name: displayUser,
          loginTime: new Date().toLocaleString('zh-CN'),
          masterSeed: result.credential.masterSeed ?? undefined,
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

  const handleSyncToDevice = async () => {
    if (!user || !user.masterSeed || !user.name) return

    setIsLoading(true)
    setError('')
    try {
      let masterSeed: Uint8Array
      if (Array.isArray(user.masterSeed)) {
        masterSeed = new Uint8Array(user.masterSeed)
      } else if (!(user.masterSeed instanceof Uint8Array)) {
        masterSeed = new Uint8Array(Object.values(user.masterSeed as Record<string, number>))
      } else {
        masterSeed = user.masterSeed
      }

      const result = await PasskeyService.register(user.name, masterSeed)

      if (result.success && result.credential) {
        alert('✅ 账号同步成功！\n\n已在此设备上创建了包含相同钱包密钥的 Passkey。\n下次您可以直接在此设备上使用生物识别登录，无需扫码。')
        try {
          const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(result.credential.rawId)))
          const storedKey = localStorage.getItem(`new_wallet_pk_${credentialIdBase64}`)
          if (storedKey) {
            const keyData = JSON.parse(storedKey)
            const xBytes = new Uint8Array(keyData.x)
            const yBytes = new Uint8Array(keyData.y)
            const newPublicKey = new Map<number, Uint8Array>()
            newPublicKey.set(-2, xBytes)
            newPublicKey.set(-3, yBytes)

            const updatedUser: UserData = {
              id: result.credential.id,
              name: user.name,
              loginTime: new Date().toLocaleString('zh-CN'),
              masterSeed: user.masterSeed,
              publicKey: newPublicKey,
              accountType: 'eip-7951'
            }
            login(updatedUser)
          }
        } catch (e) {
          console.error('Failed to upgrade to EIP-7951 after sync:', e)
        }
      } else {
        setError('同步失败: ' + result.error)
      }
    } catch (err) {
      setError('同步错误: ' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgradeTo7951 = async () => {
    console.log('🚀 开始升级到 EIP-7951 账户...')

    if (!user || !user.masterSeed || !user.name) {
      console.error('❌ 升级失败: 缺少必要的用户信息', { user })
      setError('升级失败: 缺少必要的用户信息')
      return
    }

    console.log('📋 当前用户信息:', {
      name: user.name,
      hasMasterSeed: !!user.masterSeed,
      hasPublicKey: !!user.publicKey,
      accountType: user.accountType
    })

    setIsLoading(true)
    setError('')

    try {
      console.log('🔐 检查 Passkey 支持情况...')
      const availability = await PasskeyService.checkAvailability()
      console.log('✅ Passkey 支持情况:', availability)

      if (!availability.isSecureContext) {
        const errorMsg = 'Passkey 需要在安全环境(HTTPS)下运行'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      if (!availability.isApiAvailable) {
        const errorMsg = '您的浏览器版本过低或不支持Passkey，请升级Chrome/Edge/Safari'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      if (!availability.isUVPAAAvailable) {
        const errorMsg = '您的设备未启用生物识别(指纹/面容)或屏幕锁，无法使用Passkey'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      console.log('📝 使用现有用户名和 Master Seed 注册新的 7951 Passkey...')
      console.log('   用户名:', user.name)
      console.log('   Master Seed 原始类型:', Array.isArray(user.masterSeed) ? 'Array' : user.masterSeed instanceof Uint8Array ? 'Uint8Array' : typeof user.masterSeed)
      console.log('   Master Seed 原始长度:', (user.masterSeed as Uint8Array)?.length || 0)

      let masterSeed: Uint8Array
      if (Array.isArray(user.masterSeed)) {
        console.log('🔄 检测到 masterSeed 是数组格式，转换为 Uint8Array...')
        masterSeed = new Uint8Array(user.masterSeed)
      } else if (!(user.masterSeed instanceof Uint8Array)) {
        console.log('🔄 检测到 masterSeed 不是 Uint8Array，尝试转换...')
        masterSeed = new Uint8Array(Object.values(user.masterSeed as Record<string, number>))
      } else {
        masterSeed = user.masterSeed
      }

      console.log('   Master Seed 转换后类型:', masterSeed instanceof Uint8Array ? 'Uint8Array' : typeof masterSeed)
      console.log('   Master Seed 转换后长度:', masterSeed.length, 'bytes')

      if (masterSeed.length !== 32) {
        const errorMsg = `Master Seed 长度不正确: 期望 32 bytes，实际 ${masterSeed.length} bytes`
        console.error('❌', errorMsg)
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      const result = await PasskeyService.register(user.name, masterSeed)

      if (result.success && result.credential) {
        console.log('✅ Passkey 注册成功!')
        console.log('📊 注册结果:', {
          credentialId: result.credential.id,
          hasPublicKey: !!result.credential.publicKey,
          publicKeyType: result.credential.publicKey instanceof Map ? 'Map' : typeof result.credential.publicKey
        })

        try {
          const credentialIdBase64 = CharUtils.uint8ArrayToBase64(new Uint8Array(result.credential.rawId))
          console.log('🔑 Credential ID (Base64):', credentialIdBase64)

          if (credentialIdBase64) {
            const storedKey = localStorage.getItem(`new_wallet_pk_${credentialIdBase64}`)
            console.log('💾 从 localStorage 读取 Public Key:', storedKey ? '找到' : '未找到')

            if (storedKey) {
              const keyData = JSON.parse(storedKey)
              console.log('📦 解析 Public Key 数据:', {
                hasX: !!keyData.x,
                hasY: !!keyData.y,
                xLength: keyData.x?.length || 0,
                yLength: keyData.y?.length || 0
              })

              const newPublicKey = CharUtils.coseKeyFromStorage(keyData)

              if (newPublicKey) {
                console.log('✅ Public Key 已转换为 Map 格式')
                console.log('📊 Public Key 详情:', {
                  hasX: newPublicKey.has(-2),
                  hasY: newPublicKey.has(-3),
                  xLength: newPublicKey.get(-2)?.length || 0,
                  yLength: newPublicKey.get(-3)?.length || 0
                })

                const updatedUser: UserData = {
                  id: result.credential.id,
                  name: user.name,
                  loginTime: new Date().toLocaleString('zh-CN'),
                  masterSeed: user.masterSeed,
                  publicKey: newPublicKey,
                  accountType: 'eip-7951'
                }

                console.log('🔄 更新用户信息为 EIP-7951 账户...')
                console.log('📋 更新后的用户信息:', {
                  id: updatedUser.id,
                  name: updatedUser.name,
                  hasPublicKey: !!updatedUser.publicKey,
                  accountType: updatedUser.accountType
                })

                login(updatedUser)

                console.log('🎉 升级完成! 账户已成功升级为 EIP-7951 账户')
                alert('✅ 升级成功！\n\n您的账户已成功升级为 EIP-7951 智能账户。\n现在您可以使用 Passkey 进行交易签名了。')
              } else {
                console.warn('⚠️ 无法从存储数据恢复 Public Key')
                setError('升级过程中 Public Key 格式错误，请重试')
              }
            } else {
              console.warn('⚠️ 未在 localStorage 中找到 Public Key，但注册已成功')
              setError('升级过程中未找到 Public Key，请重试')
            }
          } else {
            console.warn('⚠️ 无法将 credential.rawId 转换为 base64')
            setError('升级过程中数据格式错误，请重试')
          }
        } catch (e) {
          console.error('❌ 升级到 EIP-7951 时发生错误:', e)
          setError('升级失败: ' + (e as Error).message)
        }
      } else {
        console.error('❌ Passkey 注册失败:', result.error)
        setError('注册失败: ' + result.error)
      }
    } catch (err) {
      console.error('❌ 升级过程中发生错误:', err)
      setError('升级错误: ' + (err as Error).message)
    } finally {
      setIsLoading(false)
      console.log('🏁 升级流程结束')
    }
  }

  if (isLoggedIn) {
    return (
      <div className="login-status">
        <div className="user-info">
          <span className="welcome">欢迎，{user?.name || '用户'}！</span>
          <span className="login-time">登录时间: {user?.loginTime}</span>
          <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '12px', background: '#eef2ff', color: '#334155', fontSize: '12px' }}>
            {activeWallet?.type === 'eip-7951' ? '钱包类型: 7951' : activeWallet?.type === '4337' ? '钱包类型: 4337' : '钱包类型: 普通账户'}
          </span>
        </div>

        {isLoggedIn && (!user?.publicKey || user?.accountType !== 'eip-7951') && (
          <div className="upgrade-to-7951" style={{ marginTop: '20px', padding: '10px', background: '#fff3cd', borderRadius: '5px', textAlign: 'left', border: '1px solid #ffc107' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>🚀 升级到 EIP-7951 智能账户</h4>
            <p style={{ fontSize: '12px', color: '#856404', margin: '0 0 10px 0' }}>
              将您的普通账户升级为 EIP-7951 智能账户，享受更安全的 Passkey 签名体验。
            </p>
            <button
              onClick={handleUpgradeTo7951}
              disabled={isLoading}
              style={{ width: '100%', backgroundColor: '#ffc107', color: '#000', fontSize: '14px', fontWeight: 'bold' }}
            >
              {isLoading ? '升级中...' : '开始升级到 7951'}
            </button>
          </div>
        )}

        <div className="device-sync" style={{ marginTop: '20px', padding: '10px', background: '#e8f5e9', borderRadius: '5px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>📲 跨设备同步 (Android/PC)</h4>
              <p style={{ fontSize: '12px', color: '#2e7d32', margin: '0 0 10px 0' }}>
                如果您是通过扫码登录的（例如在 Android 上扫 iPhone），
                请点击下方按钮将账号保存到此设备。
                这样下次您就可以直接使用此设备的指纹/面容登录了。
              </p>
              <button
                onClick={handleSyncToDevice}
                disabled={isLoading}
                style={{ width: '100%', backgroundColor: '#2e7d32', fontSize: '14px' }}
              >
                {isLoading ? '同步中...' : '保存账号到此设备'}
              </button>
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
        {isLoading ? '登录中...' : '使用 Passkey 登录'}
      </button>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button
          className="login-button"
          onClick={handleRegister7951}
          disabled={isLoading}
          style={{ backgroundColor: '#646cff' }}
        >
          {isLoading ? '处理中...' : '注册 7951 钱包'}
        </button>
        <button
          className="login-button"
          onClick={handleRegister4337}
          disabled={isLoading}
          style={{ backgroundColor: '#2e7d32' }}
        >
          {isLoading ? '处理中...' : '注册 4337 钱包'}
        </button>
      </div>

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
        <p>使用Passkey登录，支持指纹、面容等生物识别</p>
      </div>
    </div>
  )
}

export default LoginButton
