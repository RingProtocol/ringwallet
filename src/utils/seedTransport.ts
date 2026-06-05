/**
 * ECDH + AES-256-GCM seed transport encryption.
 *
 * Prevents a supply-chain attacker who hooks Worker.prototype.postMessage
 * from reading the ringsecurity_masterSeed in transit between the main thread and the
 * signing Worker.
 *
 * Protocol:
 *  1. Worker generates a long-lived ECDH key pair (P-256) on startup.
 *  2. Main thread requests the Worker's public key (JWK).
 *  3. Main thread generates an ephemeral ECDH key pair, performs ECDH
 *     with the Worker's public key to derive a shared AES-256-GCM key,
 *     encrypts the seed, and sends {ciphertext, iv, ephemeralPublicJwk}
 *     to the Worker.
 *  4. Worker imports the ephemeral public key, performs ECDH with its own
 *     private key to derive the same AES-256-GCM key, and decrypts the seed.
 *
 * Private keys never cross the postMessage boundary.  An attacker who
 * intercepts postMessage only sees public keys and ciphertext.
 */

/** AES-GCM parameters */
const AES_KEY_LENGTH = 256
const IV_BYTE_LENGTH = 12
const AES_GCM_ALGO = 'AES-GCM'

/** ECDH curve */
const ECDH_CURVE: EcKeyAlgorithm = { name: 'ECDH', namedCurve: 'P-256' }

// ── Key generation ──────────────────────────────────────────────────────

/** Generate an ECDH P-256 key pair. Private key is non-extractable. */
export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' } as EcKeyGenParams,
    false, // private key non-extractable — cannot be read by supply-chain JS
    ['deriveKey']
  )
}

// ── Export / import public key ──────────────────────────────────────────

/** Export a public key as JWK (safe to send over postMessage). */
export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key)
}

/** Import a JWK as an ECDH public key. */
export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, ECDH_CURVE, true, [])
}

// ── Encrypt / decrypt ───────────────────────────────────────────────────

export interface EncryptedSeed {
  ciphertext: ArrayBuffer
  iv: Uint8Array
  ephemeralPublicJwk: JsonWebKey
}

/**
 * Encrypt a seed for the Worker.
 *
 * 1. Generate an ephemeral ECDH key pair.
 * 2. ECDH(ephemeralPrivate, workerPublic) → shared AES-256-GCM key.
 * 3. AES-GCM encrypt the seed.
 * 4. Return ciphertext + iv + ephemeralPublicJwk.
 *
 * The ephemeral private key is discarded after this call (it only lives
 * inside the CryptoKey object which becomes garbage-collectible).
 */
export async function encryptSeed(
  seed: Uint8Array,
  workerPublicKey: CryptoKey
): Promise<EncryptedSeed> {
  // Generate ephemeral key pair
  const ephemeralKeyPair = await generateEcdhKeyPair()

  // Derive shared AES key via ECDH
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: workerPublicKey } as EcdhKeyDeriveParams,
    ephemeralKeyPair.privateKey,
    { name: AES_GCM_ALGO, length: AES_KEY_LENGTH } as AesDerivedKeyParams,
    false, // derived key is non-extractable
    ['encrypt']
  )

  // AES-GCM encrypt
  const iv = new Uint8Array(IV_BYTE_LENGTH)
  crypto.getRandomValues(iv)

  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_GCM_ALGO, iv } as AesGcmParams,
    aesKey,
    new Uint8Array(seed) as unknown as ArrayBuffer
  )

  // Export ephemeral public key so the Worker can derive the same shared key
  const ephemeralPublicJwk = await exportPublicKeyJwk(
    ephemeralKeyPair.publicKey
  )

  return { ciphertext, iv, ephemeralPublicJwk }
}

/**
 * Decrypt a seed inside the Worker.
 *
 * 1. Import the ephemeral public key.
 * 2. ECDH(workerPrivate, ephemeralPublic) → shared AES-256-GCM key.
 * 3. AES-GCM decrypt → original seed.
 */
export async function decryptSeed(
  encrypted: EncryptedSeed,
  workerPrivateKey: CryptoKey
): Promise<Uint8Array> {
  // Import ephemeral public key
  const ephemeralPublicKey = await importPublicKeyJwk(
    encrypted.ephemeralPublicJwk
  )

  // Derive the same shared AES key
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephemeralPublicKey } as EcdhKeyDeriveParams,
    workerPrivateKey,
    { name: AES_GCM_ALGO, length: AES_KEY_LENGTH } as AesDerivedKeyParams,
    false,
    ['decrypt']
  )

  // AES-GCM decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: AES_GCM_ALGO, iv: encrypted.iv } as AesGcmParams,
    aesKey,
    encrypted.ciphertext
  )

  return new Uint8Array(plaintext)
}
