import { useMemo } from 'react'
import { ethers } from 'ethers'
import type { SwapSigner } from '@ring-protocol/ring-swap-sdk'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { signerBridge } from '../../services/account/signerBridge'

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
  const { activeWallet, activeChain, activeChainId } = useAuth()

  const rpcUrl = getPrimaryRpcUrl(activeChain)
  const chainId = Number(activeChainId)

  const signer = useMemo<SwapSigner | null>(() => {
    if (!activeWallet?.address) return null

    const address = activeWallet.address
    const index = activeWallet.index
    const currentRpcUrl = rpcUrl

    return {
      address,
      chainId,
      async sendTransaction(tx) {
        const rawTx = await signerBridge.signEvm({
          index,
          to: tx.to,
          amount: '0',
          chainId,
          rpcUrl: currentRpcUrl,
          data: tx.data,
          gasLimit: tx.gasLimit,
        })
        // Broadcast the signed tx
        const provider = new ethers.JsonRpcProvider(currentRpcUrl)
        const resp = await provider.broadcastTransaction(rawTx)
        return resp.hash
      },
    }
  }, [activeWallet?.address, activeWallet?.index, rpcUrl, chainId])

  return { signer, chainId, rpcUrl }
}
