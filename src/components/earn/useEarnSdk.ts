import { useMemo } from 'react'
import { createPublicClient, createWalletClient, http, type Chain } from 'viem'
import { mainnet, sepolia, optimism, arbitrum, polygon } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import type { RingEarnConfig } from '@ring-protocol/ringearnsdk'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
// ChainFamily can be used later for protocol filtering

const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  10: optimism,
  42161: arbitrum,
  137: polygon,
}

export function useEarnSdk(): RingEarnConfig | null {
  const { activeWallet, activeChain, activeChainId, isLoggedIn } = useAuth()

  const config = useMemo<RingEarnConfig | null>(() => {
    if (!isLoggedIn || !activeWallet?.privateKey) return null
    const chainId = Number(activeChainId)
    const chain = VIEM_CHAINS[chainId]
    if (!chain) return null

    const rpcUrl = getPrimaryRpcUrl(activeChain)
    if (!rpcUrl) return null

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    })

    const normalizedPk = activeWallet.privateKey.startsWith('0x')
      ? activeWallet.privateKey
      : `0x${activeWallet.privateKey}`
    const account = privateKeyToAccount(normalizedPk as `0x${string}`)
    const walletClient = createWalletClient({
      chain,
      transport: http(rpcUrl),
      account,
    })

    return {
      chain,
      publicClient,
      walletClient,
      rpcUrl,
    }
  }, [isLoggedIn, activeWallet?.privateKey, activeChainId, activeChain])

  return config
}

export function useIsEarnSupported(): boolean {
  const { activeChainId, isLoggedIn, activeWallet } = useAuth()
  if (!isLoggedIn || !activeWallet?.privateKey) return false
  const chainId = Number(activeChainId)
  // Earn (Lido/Morpho) currently supports Ethereum mainnet only
  return chainId === 1
}
