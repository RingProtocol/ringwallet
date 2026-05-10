import type { CDPSession, Page } from '@playwright/test'
import { E2E_CONFIG_EVM } from '../env'

/**
 * Encodes a hex string to standard base64 (with padding).
 * CDP WebAuthn protocol requires standard base64, not base64url.
 */
function hexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64')
}

/**
 * Generate a deterministic P-256 private key in PKCS#8 DER format.
 *
 * The Virtual Authenticator requires a base64-encoded PKCS#8 key.
 * We use Node's crypto API to generate one (determinism is not required here
 * because the key is only used by the virtual authenticator to sign challenges;
 * the wallet derives addresses from the masterSeed in userHandle, not from
 * this key).
 */
async function generateP256Pkcs8Base64(): Promise<string> {
  const { subtle } = await import('crypto')
  const keyPair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  )
  const pkcs8 = await subtle.exportKey('pkcs8', keyPair.privateKey)
  return Buffer.from(pkcs8).toString('base64')
}

/**
 * Build the userHandle bytes: masterSeed (32 bytes) + username UTF-8 bytes.
 * This mirrors PasskeyService.register() which stores:
 *   userId = [masterSeed (32 bytes)] + [usernameBytes]
 */
function buildUserHandle(masterSeedHex: string, username: string): string {
  const seedBytes = Buffer.from(masterSeedHex, 'hex')
  const nameBytes = Buffer.from(username, 'utf-8')
  const combined = Buffer.concat([seedBytes, nameBytes])
  return combined.toString('base64')
}

export interface VirtualAuthenticator {
  cdp: CDPSession
  authenticatorId: string
  credentialId: string
}

/**
 * Sets up a CDP Virtual WebAuthn Authenticator on the given page.
 *
 * This creates a virtual authenticator that auto-responds to all WebAuthn
 * requests (register, login, verifyIdentity) with a credential whose
 * userHandle contains the test masterSeed.
 */
export async function setupVirtualAuthenticator(
  page: Page
): Promise<VirtualAuthenticator> {
  const cdp = await page.context().newCDPSession(page)

  await cdp.send('WebAuthn.enable', { enableUI: false })

  const { authenticatorId } = await cdp.send(
    'WebAuthn.addVirtualAuthenticator',
    {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    }
  )

  const privateKeyBase64 = await generateP256Pkcs8Base64()

  const credentialIdHex = 'e2e00000000000000000000000000e2e'
  const credentialId = hexToBase64(credentialIdHex)

  const rpId = new URL(E2E_CONFIG_EVM.baseUrl).hostname
  const userHandle = buildUserHandle(
    E2E_CONFIG_EVM.masterSeed,
    'E2E_TestWallet'
  )

  await cdp.send('WebAuthn.addCredential', {
    authenticatorId,
    credential: {
      credentialId,
      rpId,
      privateKey: privateKeyBase64,
      userHandle,
      signCount: 0,
      isResidentCredential: true,
    },
  })

  return { cdp, authenticatorId, credentialId }
}

/**
 * Tear down the virtual authenticator.
 */
export async function teardownVirtualAuthenticator(
  auth: VirtualAuthenticator
): Promise<void> {
  try {
    await auth.cdp.send('WebAuthn.removeVirtualAuthenticator', {
      authenticatorId: auth.authenticatorId,
    })
    await auth.cdp.send('WebAuthn.disable')
  } catch {
    // ignore errors during cleanup
  }
  await auth.cdp.detach()
}
