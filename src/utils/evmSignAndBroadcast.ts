/**
 * EVM transaction helper that delegates signing to the isolated Worker
 * and handles broadcast on the main thread.
 *
 * This keeps privateKey out of the main thread while allowing
 * arbitrary contract calls (swap, bridge, approve, etc.).
 */

import { ethers } from 'ethers'
import { signerBridge } from '../services/account/signerBridge'
import { secureZero } from './memoryCrypto'

export interface EvmTxParams {
  to?: string
  data?: string
  value?: bigint
  gasLimit?: bigint
}

/**
 * Sign and broadcast an EVM transaction via the Worker.
 * Returns the transaction hash.
 */
export async function signAndBroadcastEvm(
  index: number,
  chainId: number,
  rpcUrl: string,
  tx: EvmTxParams,
  seed?: Uint8Array
): Promise<string> {
  if (!tx.to) throw new Error('Transaction "to" address is required')
  let rawTx: string
  try {
    rawTx = await signerBridge.signEvm({
      index,
      to: tx.to,
      amount: tx.value ? ethers.formatEther(tx.value) : '0',
      chainId,
      rpcUrl,
      data: tx.data,
      gasLimit: tx.gasLimit?.toString(),
    })
  } catch (err) {
    const msg = (err as Error).message
    if (msg.toLowerCase().includes('seed not initialized') && seed) {
      const seedCopy = new Uint8Array(seed)
      await signerBridge.init(seedCopy)
      secureZero(seedCopy)
      rawTx = await signerBridge.signEvm({
        index,
        to: tx.to,
        amount: tx.value ? ethers.formatEther(tx.value) : '0',
        chainId,
        rpcUrl,
        data: tx.data,
        gasLimit: tx.gasLimit?.toString(),
      })
    } else {
      throw err
    }
  }
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const resp = await provider.broadcastTransaction(rawTx)
  return resp.hash
}
