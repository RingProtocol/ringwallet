import { useMemo } from 'react'
import { createPublicClient, http, type Chain } from 'viem'
import { mainnet, sepolia, optimism, arbitrum, polygon } from 'viem/chains'
import type { RingEarnConfig } from '@ring-protocol/ringearnsdk'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'

const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  10: optimism,
  42161: arbitrum,
  137: polygon,
}

/**
 * Earn SDK is temporarily disabled because it requires a viem walletClient
 * backed by a privateKey, and our Worker-isolated signer architecture
 * does not yet provide a viem-compatible custom account.
 *
 * TODO: Implement a viem `Account` that delegates signing to signerBridge,
 * then restore full Earn functionality.
 */
export function useEarnSdk(): RingEarnConfig | null {
  const { activeChain, activeChainId, isLoggedIn } = useAuth()

  const config = useMemo<RingEarnConfig | null>(() => {
    if (!isLoggedIn) return null
    const chainId = Number(activeChainId)
    const chain = VIEM_CHAINS[chainId]
    if (!chain) return null

    const rpcUrl = getPrimaryRpcUrl(activeChain)
    if (!rpcUrl) return null

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    })

    // Wallet signing disabled pending Worker-compatible viem account.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walletClient = null as any

    return {
      chain,
      publicClient,
      walletClient,
      rpcUrl,
    }
  }, [isLoggedIn, activeChainId, activeChain])

  return config
}

export function useIsEarnSupported(): boolean {
  const { activeChainId, isLoggedIn } = useAuth()
  if (!isLoggedIn) return false
  const chainId = Number(activeChainId)
  // Earn (Lido/Morpho) currently supports Ethereum mainnet only
  return chainId === 1
}
