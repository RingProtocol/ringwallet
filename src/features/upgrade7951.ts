import type { UserData } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import PasskeyService from '../services/passkeyService'
import CharUtils from '../utils/CharUtils'
import { safeGetItem } from '../utils/safeStorage'

interface UpgradeParams {
  user: UserData
  login: (userData: UserData) => Promise<void>
}

interface UpgradeResult {
  success: boolean
  error?: string
}

export async function upgradeTo7951({ user, login }: UpgradeParams): Promise<UpgradeResult> {
  if (!user.masterSeed || !user.name) {
    return { success: false, error: '升级失败: 缺少必要的用户信息' }
  }

  const availability = await PasskeyService.checkAvailability()
  if (!availability.isSecureContext) return { success: false, error: 'Passkey 需要在安全环境(HTTPS)下运行' }
  if (!availability.isApiAvailable) return { success: false, error: '您的浏览器不支持Passkey，请升级Chrome/Edge/Safari' }
  if (!availability.isUVPAAAvailable) return { success: false, error: '您的设备未启用生物识别(指纹/面容)，无法使用Passkey' }

  let masterSeed: Uint8Array
  if (Array.isArray(user.masterSeed)) {
    masterSeed = new Uint8Array(user.masterSeed)
  } else if (!(user.masterSeed instanceof Uint8Array)) {
    masterSeed = new Uint8Array(Object.values(user.masterSeed as Record<string, number>))
  } else {
    masterSeed = user.masterSeed
  }

  if (masterSeed.length !== 32) {
    return { success: false, error: `Master Seed 长度不正确: 期望 32 bytes，实际 ${masterSeed.length} bytes` }
  }

  const result = await PasskeyService.register(user.name, masterSeed)

  if (!result.success || !result.credential) {
    return { success: false, error: '注册失败: ' + result.error }
  }

  const credentialIdBase64 = CharUtils.uint8ArrayToBase64(new Uint8Array(result.credential.rawId))
  if (!credentialIdBase64) {
    return { success: false, error: '升级过程中数据格式错误，请重试' }
  }

  const storedKey = safeGetItem(`new_wallet_pk_${credentialIdBase64}`)
  if (!storedKey) {
    return { success: false, error: '升级过程中未找到 Public Key，请重试' }
  }

  const keyData = JSON.parse(storedKey)
  const newPublicKey = CharUtils.coseKeyFromStorage(keyData)
  if (!newPublicKey) {
    return { success: false, error: '升级过程中 Public Key 格式错误，请重试' }
  }

  const updatedUser: UserData = {
    id: result.credential.id,
    name: user.name,
    loginTime: new Date().toLocaleString('zh-CN'),
    masterSeed: user.masterSeed,
    publicKey: newPublicKey,
    accountType: WalletType.EOA
  }
  await login(updatedUser)

  return { success: true }
}
