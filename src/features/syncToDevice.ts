import type { UserData } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import PasskeyService from '../services/account/passkeyService'
import { signerBridge } from '../services/account/signerBridge'
import { secureZero } from '../utils/memoryCrypto'
import { safeGetItem } from '../utils/safeStorage'

interface SyncParams {
  user: UserData
  login: (userData: UserData) => Promise<void>
}

interface SyncResult {
  success: boolean
  error?: string
}

export async function syncToDevice({
  user,
  login,
}: SyncParams): Promise<SyncResult> {
  if (!user.ringsecurity_seedReady || !user.name) {
    return { success: false, error: 'Sync failed: missing required user info' }
  }

  // Export seed from Worker via encrypted one-time transfer
  const seed = await signerBridge.exportSeedForRegistration()
  let result: Awaited<ReturnType<typeof PasskeyService.register>>
  try {
    result = await PasskeyService.register(user.name, seed)
  } finally {
    secureZero(seed)
  }

  if (!result.success || !result.credential) {
    return { success: false, error: 'Sync failed: ' + result.error }
  }

  try {
    const credentialIdBase64 = btoa(
      String.fromCharCode(...new Uint8Array(result.credential.rawId))
    )
    const storedKey = safeGetItem(`new_wallet_pk_${credentialIdBase64}`)
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
        loginTime: new Date().toLocaleString(),
        ringsecurity_masterSeed: undefined,
        ringsecurity_seedReady: true,
        publicKey: newPublicKey,
        accountType: WalletType.EOA,
      }
      await login(updatedUser)
    }
  } catch (e) {
    console.error('Failed to upgrade to EIP-7951 after sync:', e)
  }

  return { success: true }
}
