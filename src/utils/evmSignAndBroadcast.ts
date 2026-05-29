/**
 * EVM transaction helper that delegates signing to the isolated Worker
 * and handles broadcast on the main thread.
 *
 * This keeps privateKey out of the main thread while allowing
 * arbitrary contract calls (swap, bridge, approve, etc.).
 */

import { ethers } from 'ethers'
import { signerBridge } from '../services/account/signerBridge'

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
  tx: EvmTxParams
): Promise<string> {
  if (!tx.to) throw new Error('Transaction "to" address is required')
  const rawTx = await signerBridge.signEvm({
    index,
    to: tx.to,
    amount: tx.value ? ethers.formatEther(tx.value) : '0',
    chainId,
    rpcUrl,
    data: tx.data,
    gasLimit: tx.gasLimit?.toString(),
  })
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const resp = await provider.broadcastTransaction(rawTx)
  return resp.hash
}
