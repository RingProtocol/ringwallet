import { useMemo } from 'react'
import { createPublicClient, createWalletClient, http, type Chain } from 'viem'
import { mainnet, sepolia, optimism, arbitrum, polygon } from 'viem/chains'
import type { RingEarnConfig } from '@ring-protocol/ringearnsdk'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { createViemSignerAccount } from '../../utils/viemSignerAccount'

const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  10: optimism,
  42161: arbitrum,
  137: polygon,
}

/**
 * Build a viem `WalletClient` backed by the isolated signing Worker.
 *
 * The Worker (not the main thread) holds the seed; signing requests are
 * routed through `signerBridge` and never expose key material here.
 *
 * Returns `null` when:
 *  - the user is not logged in,
 *  - the active chain is not supported by viem chains list, or
 *  - the active chain is not Ethereum mainnet (Earn is mainnet-only —
 *    Lido and Morpho vaults are not wired for other chains, and the
 *    underlying SDKs only know mainnet deployment addresses).
 */
export function useEarnSdk(): RingEarnConfig | null {
  const { activeChain, activeChainId, isLoggedIn, activeAccount } = useAuth()

  const config = useMemo<RingEarnConfig | null>(() => {
    if (!isLoggedIn || !activeAccount) return null
    const chainId = Number(activeChainId)
    if (chainId !== 1) return null
    const chain = VIEM_CHAINS[chainId]
    if (!chain) return null

    const rpcUrl = getPrimaryRpcUrl(activeChain)
    if (!rpcUrl) return null

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    })

    const account = createViemSignerAccount({
      address: activeAccount.address as `0x${string}`,
      index: activeAccount.index,
      chainId,
      rpcUrl,
    })

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    })

    return {
      chain,
      publicClient,
      walletClient,
      rpcUrl,
    }
  }, [isLoggedIn, activeChainId, activeChain, activeAccount])

  return config
}

export function useIsEarnSupported(): boolean {
  const { activeChainId, isLoggedIn } = useAuth()
  if (!isLoggedIn) return false
  // Earn (Lido stETH) is only wired for Ethereum mainnet.
  return Number(activeChainId) === 1
}
