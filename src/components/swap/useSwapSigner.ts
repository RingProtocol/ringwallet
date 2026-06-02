import { useMemo } from 'react'
import { ethers } from 'ethers'
import type { SwapSigner } from '@ring-protocol/ring-swap-sdk'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { signerBridge } from '../../services/account/signerBridge'
import { secureZero } from '../../utils/memoryCrypto'

/**
 * Constructs a SwapSigner from the current wallet context.
 * Signing is delegated to the isolated Worker — privateKey never
 * enters the main thread.
 */
export function useSwapSigner(): {
  signer: SwapSigner | null
  chainId: number
  rpcUrl: string
} {
  const { activeWallet, activeChain, activeChainId, user } = useAuth()

  const rpcUrl = getPrimaryRpcUrl(activeChain)
  const chainId = Number(activeChainId)

  const signer = useMemo<SwapSigner | null>(() => {
    if (!activeWallet?.address) return null

    const address = activeWallet.address
    const index = activeWallet.index
    const currentRpcUrl = rpcUrl

    const masterSeed = user?.masterSeed

    return {
      address,
      chainId,
      async sendTransaction(tx) {
        let rawTx: string
        try {
          rawTx = await signerBridge.signEvm({
            index,
            to: tx.to,
            amount: '0',
            chainId,
            rpcUrl: currentRpcUrl,
            data: tx.data,
            gasLimit: tx.gasLimit,
          })
        } catch (err) {
          const msg = (err as Error).message
          if (
            msg.toLowerCase().includes('seed not initialized') &&
            masterSeed
          ) {
            const seed = new Uint8Array(masterSeed)
            await signerBridge.init(seed)
            secureZero(seed)
            rawTx = await signerBridge.signEvm({
              index,
              to: tx.to,
              amount: '0',
              chainId,
              rpcUrl: currentRpcUrl,
              data: tx.data,
              gasLimit: tx.gasLimit,
            })
          } else {
            throw err
          }
        }
        // Broadcast the signed tx
        const provider = new ethers.JsonRpcProvider(currentRpcUrl)
        const resp = await provider.broadcastTransaction(rawTx)
        return resp.hash
      },
    }
  }, [
    activeWallet?.address,
    activeWallet?.index,
    rpcUrl,
    chainId,
    user?.masterSeed,
  ])

  return { signer, chainId, rpcUrl }
}
