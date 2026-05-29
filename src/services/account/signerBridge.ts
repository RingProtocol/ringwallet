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

export interface WorkerAccount {
  index: number
  address: string
  path: string
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
  private pending = new Map<string, (res: WorkerResponse) => void>()
  private idCounter = 0

  /** Lazily instantiate the Worker on first use. */
  private getWorker(): Worker {
    if (this.worker) return this.worker
    this.worker = new Worker(
      new URL('../../workers/signer.worker.ts', import.meta.url),
      { type: 'module' }
    )
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const res = event.data
      const resolve = this.pending.get(res.id)
      if (resolve) {
        this.pending.delete(res.id)
        resolve(res)
      }
    }
    this.worker.onerror = (err) => {
      console.error('SignerWorker error:', err)
    }
    return this.worker
  }

  private post<T>(type: string, payload?: Record<string, unknown>): Promise<T> {
    const id = `${++this.idCounter}_${Date.now()}`
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`SignerWorker timeout: ${type}`))
      }, 120000)

      this.pending.set(id, (res) => {
        clearTimeout(timeout)
        if (res.type === 'error') {
          reject(new Error(res.error || 'Worker error'))
        } else {
          resolve(res.result as T)
        }
      })

      this.getWorker().postMessage({ id, type, payload } as WorkerRequest)
    })
  }

  /** Send the masterSeed into the Worker and zero it locally. */
  async init(seed: Uint8Array): Promise<void> {
    const seedArr = Array.from(seed)
    await this.post('init', { seed: seedArr })
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
    count: number
  ): Promise<WorkerAccount[]> {
    return this.post<WorkerAccount[]>('derive_addresses', {
      family,
      count,
    })
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
    }
  }
}

export const signerBridge = new SignerBridge()
