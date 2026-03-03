import type { UserData } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import PasskeyService from '../services/passkeyService'

interface SyncParams {
  user: UserData
  login: (userData: UserData) => Promise<void>
}

interface SyncResult {
  success: boolean
  error?: string
}

export async function syncToDevice({ user, login }: SyncParams): Promise<SyncResult> {
  if (!user.masterSeed || !user.name) {
    return { success: false, error: '同步失败: 缺少必要的用户信息' }
  }

  let masterSeed: Uint8Array
  if (Array.isArray(user.masterSeed)) {
    masterSeed = new Uint8Array(user.masterSeed)
  } else if (!(user.masterSeed instanceof Uint8Array)) {
    masterSeed = new Uint8Array(Object.values(user.masterSeed as Record<string, number>))
  } else {
    masterSeed = user.masterSeed
  }

  const result = await PasskeyService.register(user.name, masterSeed)

  if (!result.success || !result.credential) {
    return { success: false, error: '同步失败: ' + result.error }
  }

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
        accountType: WalletType.EOA
      }
      await login(updatedUser)
    }
  } catch (e) {
    console.error('Failed to upgrade to EIP-7951 after sync:', e)
  }

  return { success: true }
}
