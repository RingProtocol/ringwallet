import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ChainFamily } from '../models/ChainType'
import { clearChainTokenCache } from '../models/ChainTokens'
import { notifyBalanceChange } from '../services/devices/notificationService'
import { getTokenList, type TokenInfo } from '../utils/tokenStorage'
import { balanceAdapterRegistry } from '../features/balance/balanceAdapterRegistry'
import '../features/balance/adapters'
import {
  DEFAULT_CHAINS,
  FEATURED_CHAIN_IDS,
  FEATURED_TESTNET_IDS,
} from '../config/chains'
import {
  fetchAccountBalances,
  emptyBalance,
  formatUsdAmount,
  getAccountBalancePollIntervalMs,
} from '../features/balance/balanceManager'
import type { DisplayToken } from '../features/balance/balanceTypes'

export interface BalanceState {
  nativeBalance: string
  /** Total portfolio value in USD (formatted), from `fetchAccountBalances` / `getAccountBalance`. */
  totalAssetUsd: string
  /** Active chain portfolio USD (formatted), same network as token list. */
  currentChainUsd: string
  tokens: DisplayToken[]
  isLoading: boolean
  supportsTokens: boolean
}

export function useBalanceManager(): BalanceState {
  const { activeAccount, activeChain } = useAuth()

  const family = activeChain?.family ?? ChainFamily.EVM
  const adapter = balanceAdapterRegistry.get(family)
  const supportsTokens = adapter?.supportsTokens ?? false

  const [nativeBalance, setNativeBalance] = useState(() => emptyBalance(family))
  const [totalAssetUsd, setTotalAssetUsd] = useState(() => formatUsdAmount('0'))
  const [currentChainUsd, setCurrentChainUsd] = useState(() =>
    formatUsdAmount('0')
  )
  const [tokens, setTokens] = useState<DisplayToken[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const observedBalanceRef = useRef<string | null>(null)

  // Track imported tokens
  const [importedTokens, setImportedTokens] = useState<TokenInfo[]>(() =>
    activeAccount && activeChain && supportsTokens
      ? getTokenList(activeAccount.address, activeChain.id)
      : []
  )

  // Sync imported tokens on chain/account change
  useEffect(() => {
    if (activeAccount && activeChain && supportsTokens) {
      setImportedTokens(getTokenList(activeAccount.address, activeChain.id))
    } else {
      setImportedTokens([])
    }
  }, [activeAccount?.address, activeChain?.id, supportsTokens])

  // Listen for token import events
  useEffect(() => {
    if (!activeAccount || !activeChain || !supportsTokens) return

    const handleTokensUpdated = () => {
      setImportedTokens(getTokenList(activeAccount.address, activeChain.id))
    }

    window.addEventListener('ring:tokens-updated', handleTokensUpdated)
    return () =>
      window.removeEventListener('ring:tokens-updated', handleTokensUpdated)
  }, [activeAccount?.address, activeChain?.id, supportsTokens])

  useEffect(() => {
    clearChainTokenCache()
  }, [activeAccount?.address])

  // Reset on chain/account change
  useEffect(() => {
    setNativeBalance(emptyBalance(family))
    setTotalAssetUsd(formatUsdAmount('0'))
    setCurrentChainUsd(formatUsdAmount('0'))
    setTokens([])
    observedBalanceRef.current = null
  }, [activeChain?.id, activeAccount?.address, family])

  // Commit balance with optional change notification
  const commitNativeBalance = useCallback(
    (
      next: string,
      opts: { notifyOnChange?: boolean; recordObserved?: boolean } = {}
    ) => {
      const { notifyOnChange = false, recordObserved = true } = opts
      const previousObserved = observedBalanceRef.current

      if (recordObserved) {
        observedBalanceRef.current = next
      }

      if (
        notifyOnChange &&
        previousObserved !== null &&
        previousObserved !== next &&
        activeAccount?.address &&
        activeChain
      ) {
        void notifyBalanceChange({
          accountAddress: activeAccount.address,
          chainName: activeChain.name,
          previousBalance: previousObserved,
          nextBalance: next,
          symbol: activeChain.symbol || 'ETH',
        })
      }

      setNativeBalance((prev) => (prev === next ? prev : next))
    },
    [activeAccount?.address, activeChain]
  )

  // Polling effect
  useEffect(() => {
    if (!activeAccount || !activeChain) return

    const address = activeAccount.address
    const featuredIds = new Set<string | number>([
      ...FEATURED_CHAIN_IDS,
      ...FEATURED_TESTNET_IDS,
    ])
    const portfolioChains = DEFAULT_CHAINS.filter((c) => featuredIds.has(c.id))

    const fetchBalances = async () => {
      setIsLoading(true)
      try {
        const [allBal] = await Promise.allSettled([
          fetchAccountBalances(
            address,
            portfolioChains,
            activeChain
            // importedTokens
          ),
        ])

        if (allBal.status === 'fulfilled') {
          const result = allBal.value
          commitNativeBalance(result.nativeBalance, { notifyOnChange: true })
          setTokens(result.tokens)
          setTotalAssetUsd(result.totalAssetUsd)
          setCurrentChainUsd(result.currentChainUsd)
        } else {
          console.error('Failed to fetch token balances:', allBal.reason)
          // Keep last successful values; a later poll may recover.
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalances()
    const interval = setInterval(
      fetchBalances,
      getAccountBalancePollIntervalMs()
    )
    return () => clearInterval(interval)
  }, [activeAccount, activeChain, importedTokens, commitNativeBalance])

  return {
    nativeBalance,
    totalAssetUsd,
    currentChainUsd,
    tokens,
    isLoading,
    supportsTokens,
  }
}
