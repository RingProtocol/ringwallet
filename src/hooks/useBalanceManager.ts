import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { BALANCE_POLL_INTERVAL_MS } from '../config/uiTiming'
import { ChainFamily } from '../models/ChainType'
import { notifyBalanceChange } from '../services/devices/notificationService'
import { getTokenList, type TokenInfo } from '../utils/tokenStorage'
import { balanceAdapterRegistry } from '../features/balance/balanceAdapterRegistry'
import {
  fetchAllBalances,
  emptyBalance,
} from '../features/balance/balanceManager'
import type { DisplayToken } from '../features/balance/balanceTypes'

export interface BalanceState {
  nativeBalance: string
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

  // Reset on chain/account change
  useEffect(() => {
    setNativeBalance(emptyBalance(family))
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

    const fetchBalances = async () => {
      setIsLoading(true)
      try {
        const result = await fetchAllBalances(
          address,
          activeChain,
          importedTokens
        )
        commitNativeBalance(result.nativeBalance, { notifyOnChange: true })
        setTokens(result.tokens)
      } catch (error) {
        console.error('Failed to fetch balances:', error)
        const zero = emptyBalance(family)
        commitNativeBalance(zero, { recordObserved: false })
        setTokens([
          {
            symbol: activeChain.symbol || 'UNKNOWN',
            name: activeChain.name,
            balance: zero,
            isNative: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, BALANCE_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeAccount, activeChain, importedTokens, family, commitNativeBalance])

  return { nativeBalance, tokens, isLoading, supportsTokens }
}
