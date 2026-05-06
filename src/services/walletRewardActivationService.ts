const ACTIVATION_API_BASE =
  'https://ringlabs-admin-platform-production.up.railway.app/api/client'

export async function activateWalletReward(address: string): Promise<void> {
  const encodedAddress = encodeURIComponent(address)
  const userInfoUrl = `${ACTIVATION_API_BASE}/user/info?address=${encodedAddress}`
  const activityUrl = `${ACTIVATION_API_BASE}/activity/wallet-user?address=${encodedAddress}`

  try {
    await fetch(userInfoUrl, { method: 'GET' })
  } catch (error) {
    console.warn(
      'Failed to request user info for wallet reward activation:',
      error
    )
  }

  try {
    await fetch(activityUrl, { method: 'GET' })
  } catch (error) {
    console.warn(
      'Failed to request wallet activity for reward activation:',
      error
    )
  }
}
