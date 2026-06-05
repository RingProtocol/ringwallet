/**
 * Main-thread bridge to the isolated signing Worker.
 *
 * This is the ONLY interface through which the main thread communicates
 * with the signing Worker. It ensures:
 *  - Private keys never leave the Worker
 *  - Seed is passed to the Worker once and then forgotten in the main thread
 *  - All signing operations are Promise-based and type-safe
 */

import type { ChainFamily } from '../../models/ChainType'
import {
  importPublicKeyJwk,
  encryptSeed,
  generateEcdhKeyPair,
  exportPublicKeyJwk,
  decryptSeed,
  type EncryptedSeed,
} from '../../utils/seedTransport'

export interface WorkerAccount {
  index: number
  address: string
  path: string
  meta?: Record<string, unknown>
}

export interface DeriveOptions {
  isTestnet?: boolean
  coinType?: number
  addressPrefix?: string
}

interface WorkerRequest {
  id: string
  type: string
  payload?: Record<string, unknown>
}

interface WorkerResponse {
  id: string
  type: 'success' | 'error'
  result?: unknown
  error?: string
}

class SignerBridge {
  private worker: Worker | null = null
  private pending = new Map<
    string,
    { resolve: (res: WorkerResponse) => void; reject: (err: Error) => void }
  >()
  private idCounter = 0
  /** Cached Worker ECDH public key (JWK). Avoids extra round-trip on re-init. */
  private workerPublicJwk: JsonWebKey | null = null

  /** Lazily instantiate the Worker on first use. */
  private getWorker(): Worker {
    if (this.worker) return this.worker
    this.worker = new Worker(
      new URL('../../workers/signer.worker.ts', import.meta.url),
      { type: 'module' }
    )
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const res = event.data
      const handler = this.pending.get(res.id)
      if (handler) {
        this.pending.delete(res.id)
        handler.resolve(res)
      }
    }
    this.worker.onerror = (err) => {
      console.error('SignerWorker error:', err)
      // Reject all pending promises immediately so callers don't hang
      for (const [, handler] of this.pending) {
        handler.reject(new Error('SignerWorker crashed'))
      }
      this.pending.clear()
      this.worker = null
    }

    // Health-check: if the Worker hasn't responded to any message within
    // 5 seconds, it likely failed to load (e.g., WASM hang in Next.js dev).
    // Proactively reject pending promises with a helpful error.
    const healthTimer = setTimeout(() => {
      if (this.pending.size > 0 && this.worker) {
        console.error(
          'SignerWorker health check failed — Worker may not have loaded.\n' +
            "This usually happens in Next.js dev server when the Worker's WASM\n" +
            'dependencies (tiny-secp256k1) fail to load in the Worker context.'
        )
        for (const [, handler] of this.pending) {
          handler.reject(
            new Error(
              'SignerWorker failed to load (WASM init hang). ' +
                'Try restarting the dev server or building for production.'
            )
          )
        }
        this.pending.clear()
      }
    }, 5000)
    // Clear the health timer once the first response arrives
    const origOnMessage = this.worker.onmessage
    const workerRef = this.worker
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      clearTimeout(healthTimer)
      // Restore the original handler after first message
      workerRef.onmessage = origOnMessage
      origOnMessage?.call(workerRef, event)
    }

    return this.worker
  }

  private post<T>(type: string, payload?: Record<string, unknown>): Promise<T> {
    const id = `${++this.idCounter}_${Date.now()}`
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`SignerWorker timeout: ${type}`))
      }, 10000)

      this.pending.set(id, {
        resolve: (res) => {
          clearTimeout(timeout)
          if (res.type === 'error') {
            reject(new Error(res.error || 'Worker error'))
          } else {
            resolve(res.result as T)
          }
        },
        reject: (err: Error) => {
          clearTimeout(timeout)
          reject(err)
        },
      })

      this.getWorker().postMessage({ id, type, payload } as WorkerRequest)
    })
  }

  /** Send the ringsecurity_masterSeed into the Worker using ECDH-encrypted transport. */
  async init(seed: Uint8Array): Promise<void> {
    // 1. Get Worker's ECDH public key (cached after first retrieval)
    const jwk = await this.getWorkerPublicKey()
    // 2. Import public key as CryptoKey
    const workerPubKey = await importPublicKeyJwk(jwk)
    // 3. ECDH encrypt the seed
    const encrypted = await encryptSeed(seed, workerPubKey)
    // 4. Send encrypted payload to Worker
    await this.post('init_encrypted', {
      encrypted: {
        ciphertext: Array.from(new Uint8Array(encrypted.ciphertext)),
        iv: Array.from(encrypted.iv),
        ephemeralPublicJwk: encrypted.ephemeralPublicJwk,
      },
    })
  }

  /** Retrieve the Worker's ECDH public key (JWK). Caches after first call. */
  private async getWorkerPublicKey(): Promise<JsonWebKey> {
    if (this.workerPublicJwk) return this.workerPublicJwk
    const jwk = await this.post<JsonWebKey>('get_public_key')
    this.workerPublicJwk = jwk
    return jwk
  }

  /** EVM transaction signing. */
  async signEvm(params: {
    index: number
    to: string
    amount: string
    chainId: number
    rpcUrl: string | null
    tokenOpts?: { address: string; decimals: number }
    data?: string
    gasLimit?: string
  }): Promise<string> {
    return this.post<string>('sign_evm', params as Record<string, unknown>)
  }

  /** Solana transaction signing. */
  async signSolana(params: {
    index: number
    to: string
    amount: number
    rpcUrl: string
  }): Promise<{
    serializedTx: number[]
    blockhash: string
    lastValidBlockHeight: number
  }> {
    return this.post<{
      serializedTx: number[]
      blockhash: string
      lastValidBlockHeight: number
    }>('sign_solana', params as Record<string, unknown>)
  }

  /** Derive addresses (no private keys returned). */
  async deriveAddresses(
    family: ChainFamily,
    count: number,
    options?: DeriveOptions
  ): Promise<WorkerAccount[]> {
    return this.post<WorkerAccount[]>('derive_addresses', {
      family,
      count,
      options,
    })
  }

  /** Build and sign a Bitcoin P2WPKH transaction inside the Worker. */
  async signBitcoin(params: {
    index: number
    isTestnet: boolean
    rpcUrl: string
    toAddress: string
    amountSats: number
    feeRate?: number
  }): Promise<{ txHex: string; fee: number }> {
    return this.post<{ txHex: string; fee: number }>(
      'sign_bitcoin',
      params as Record<string, unknown>
    )
  }

  /** Build and sign a Dogecoin P2PKH transaction inside the Worker. */
  async signDogecoin(params: {
    index: number
    isTestnet: boolean
    rpcUrl: string
    toAddress: string
    amountSats: number
    feeRate?: number
  }): Promise<{ txHex: string; fee: number }> {
    return this.post<{ txHex: string; fee: number }>(
      'sign_dogecoin',
      params as Record<string, unknown>
    )
  }

  /**
   * Export the seed from the Worker encrypted with a one-time ECDH key.
   * Used ONLY for Passkey registration (user-authorized, biometric-gated).
   * Returns plaintext seed that the caller must secureZero() after use.
   */
  async exportSeedForRegistration(): Promise<Uint8Array> {
    // Generate an ephemeral ECDH key pair on the main thread
    const ephemeralKeyPair = await generateEcdhKeyPair()
    const pubJwk = await exportPublicKeyJwk(ephemeralKeyPair.publicKey)

    // Ask Worker to encrypt seed with our public key
    const result = await this.post<{
      ciphertext: number[]
      iv: number[]
      ephemeralPublicJwk: JsonWebKey
    }>('export_seed_encrypted', { publicKey: pubJwk })

    // Decrypt on main thread
    const encrypted: EncryptedSeed = {
      ciphertext: new Uint8Array(result.ciphertext).buffer,
      iv: new Uint8Array(result.iv),
      ephemeralPublicJwk: result.ephemeralPublicJwk,
    }
    const seed = await decryptSeed(encrypted, ephemeralKeyPair.privateKey)
    return seed
  }

  /** Check if the Worker has been initialized with a seed. */
  get isInitialized(): boolean {
    return this.worker !== null
  }

  /** Clear all sensitive state inside the Worker. */
  async clear(): Promise<void> {
    await this.post('clear')
  }

  /** Terminate the Worker entirely. */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.pending.clear()
      this.workerPublicJwk = null
    }
  }
}

export const signerBridge = new SignerBridge()
