import type { UserData } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import PasskeyService from '../services/account/passkeyService'
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
    return { success: false, error: 'Upgrade failed: missing required user info' }
  }

  const availability = await PasskeyService.checkAvailability()
  if (!availability.isSecureContext) return { success: false, error: 'Passkey requires a secure context (HTTPS).' }
  if (!availability.isApiAvailable) return { success: false, error: 'Your browser does not support Passkey. Please upgrade Chrome/Edge/Safari.' }
  if (!availability.isUVPAAAvailable) return { success: false, error: 'No platform authenticator available (Touch ID / Face ID). Passkey cannot be used.' }

  let masterSeed: Uint8Array
  if (Array.isArray(user.masterSeed)) {
    masterSeed = new Uint8Array(user.masterSeed)
  } else if (!(user.masterSeed instanceof Uint8Array)) {
    masterSeed = new Uint8Array(Object.values(user.masterSeed as Record<string, number>))
  } else {
    masterSeed = user.masterSeed
  }

  if (masterSeed.length !== 32) {
    return { success: false, error: `Invalid master seed length: expected 32 bytes, got ${masterSeed.length} bytes` }
  }

  const result = await PasskeyService.register(user.name, masterSeed)

  if (!result.success || !result.credential) {
    return { success: false, error: 'Registration failed: ' + result.error }
  }

  const credentialIdBase64 = CharUtils.uint8ArrayToBase64(new Uint8Array(result.credential.rawId))
  if (!credentialIdBase64) {
    return { success: false, error: 'Upgrade failed due to invalid data format. Please try again.' }
  }

  const storedKey = safeGetItem(`new_wallet_pk_${credentialIdBase64}`)
  if (!storedKey) {
    return { success: false, error: 'Upgrade failed: Public Key not found. Please try again.' }
  }

  const keyData = JSON.parse(storedKey)
  const newPublicKey = CharUtils.coseKeyFromStorage(keyData)
  if (!newPublicKey) {
    return { success: false, error: 'Upgrade failed: invalid Public Key format. Please try again.' }
  }

  const updatedUser: UserData = {
    id: result.credential.id,
    name: user.name,
    loginTime: new Date().toLocaleString(),
    masterSeed: user.masterSeed,
    publicKey: newPublicKey,
    accountType: WalletType.EOA
  }
  await login(updatedUser)

  return { success: true }
}
