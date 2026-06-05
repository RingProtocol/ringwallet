import { describe, it, expect } from 'vitest'
import {
  generateEcdhKeyPair,
  exportPublicKeyJwk,
  importPublicKeyJwk,
  encryptSeed,
  decryptSeed,
} from '../../../src/utils/seedTransport'

describe('seedTransport: ECDH + AES-GCM round-trip', () => {
  it('encrypt then decrypt returns original seed', async () => {
    // Simulate Worker's key pair
    const workerKeyPair = await generateEcdhKeyPair()

    // Original 32-byte seed
    const originalSeed = new Uint8Array(32)
    crypto.getRandomValues(originalSeed)

    // Main thread encrypts the seed for the Worker
    const encrypted = await encryptSeed(originalSeed, workerKeyPair.publicKey)

    // Verify encrypted output structure
    expect(encrypted.ciphertext).toBeInstanceOf(ArrayBuffer)
    expect(encrypted.iv).toBeInstanceOf(Uint8Array)
    expect(encrypted.iv.length).toBe(12)
    expect(encrypted.ephemeralPublicJwk).toBeDefined()
    expect(encrypted.ephemeralPublicJwk.kty).toBe('EC')
    expect(encrypted.ephemeralPublicJwk.crv).toBe('P-256')

    // Worker decrypts
    const decrypted = await decryptSeed(encrypted, workerKeyPair.privateKey)

    expect(decrypted).toEqual(originalSeed)
  })

  it('different encryptions produce different ciphertexts (ephemeral key uniqueness)', async () => {
    const workerKeyPair = await generateEcdhKeyPair()
    const seed = new Uint8Array(32)
    crypto.getRandomValues(seed)

    const encrypted1 = await encryptSeed(seed, workerKeyPair.publicKey)
    const encrypted2 = await encryptSeed(seed, workerKeyPair.publicKey)

    // Same plaintext but different ciphertext (different ephemeral keys + IVs)
    const ct1 = new Uint8Array(encrypted1.ciphertext)
    const ct2 = new Uint8Array(encrypted2.ciphertext)
    expect(ct1).not.toEqual(ct2)

    // Both decrypt to same seed
    const decrypted1 = await decryptSeed(encrypted1, workerKeyPair.privateKey)
    const decrypted2 = await decryptSeed(encrypted2, workerKeyPair.privateKey)
    expect(decrypted1).toEqual(seed)
    expect(decrypted2).toEqual(seed)
  })

  it('decryption with wrong private key fails', async () => {
    const workerKeyPair = await generateEcdhKeyPair()
    const wrongKeyPair = await generateEcdhKeyPair()

    const seed = new Uint8Array(32)
    crypto.getRandomValues(seed)

    const encrypted = await encryptSeed(seed, workerKeyPair.publicKey)

    // Decrypting with wrong key should throw
    await expect(
      decryptSeed(encrypted, wrongKeyPair.privateKey)
    ).rejects.toThrow()
  })

  it('public key export/import round-trip works', async () => {
    const keyPair = await generateEcdhKeyPair()
    const jwk = await exportPublicKeyJwk(keyPair.publicKey)
    const importedKey = await importPublicKeyJwk(jwk)

    // Use the imported key to encrypt, verify decryption still works
    const seed = new Uint8Array(32)
    crypto.getRandomValues(seed)

    const encrypted = await encryptSeed(seed, importedKey)
    const decrypted = await decryptSeed(encrypted, keyPair.privateKey)
    expect(decrypted).toEqual(seed)
  })

  it('handles minimal and maximal seed sizes', async () => {
    const workerKeyPair = await generateEcdhKeyPair()

    // 1-byte seed
    const tinySeed = new Uint8Array([42])
    const encTiny = await encryptSeed(tinySeed, workerKeyPair.publicKey)
    const decTiny = await decryptSeed(encTiny, workerKeyPair.privateKey)
    expect(decTiny).toEqual(tinySeed)

    // 64-byte seed (some HD wallet implementations)
    const largeSeed = new Uint8Array(64)
    crypto.getRandomValues(largeSeed)
    const encLarge = await encryptSeed(largeSeed, workerKeyPair.publicKey)
    const decLarge = await decryptSeed(encLarge, workerKeyPair.privateKey)
    expect(decLarge).toEqual(largeSeed)
  })
})
