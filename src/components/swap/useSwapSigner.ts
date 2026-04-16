import { useMemo } from 'react'
import { ethers } from 'ethers'
import type { SwapSigner } from '@ring-protocol/ring-swap-sdk'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'

/**
 * Constructs a SwapSigner from the current wallet context.
 * Keys stay in memory -- the signer signs locally via ethers.Wallet.
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
    if (!activeWallet?.address || !activeWallet.privateKey) return null

    const address = activeWallet.address
    const privateKey = activeWallet.privateKey
    const currentRpcUrl = rpcUrl

    return {
      address,
      chainId,
      async sendTransaction(tx) {
        const provider = new ethers.JsonRpcProvider(currentRpcUrl)
        const wallet = new ethers.Wallet(privateKey, provider)
        const resp = await wallet.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
          gasLimit: tx.gasLimit,
        })
        return resp.hash
      },
    }
  }, [activeWallet?.address, activeWallet?.privateKey, rpcUrl, chainId])

  return { signer, chainId, rpcUrl }
}
