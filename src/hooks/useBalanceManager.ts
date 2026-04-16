import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ChainFamily } from '../models/ChainType'
import {
  clearChainTokenCache,
  subscribeTokenCache,
} from '../models/ChainTokens'
import { notifyBalanceChange } from '../services/devices/notificationService'
import { getTokenList, type TokenInfo } from '../utils/tokenStorage'
import { balanceAdapterRegistry } from '../features/balance/balanceAdapterRegistry'
import '../features/balance/adapters'

import {
  readAccountBalancesFromCache,
  syncAccountBalancesToCache,
  emptyBalance,
  formatUsdAmount,
  getAccountBalancePollIntervalMs,
} from '../features/balance/balanceManager'
import type { ChainToken } from '../models/ChainTokens'
import { chainToAccountAssetsNetwork, DEFAULT_CHAINS } from '@/config/chains'

export interface BalanceState {
  nativeBalance: string
  /** Total portfolio value in USD (formatted), from `fetchAccountBalances` / `getAccountBalance`. */
  totalAssetUsd: string
  /** Active chain portfolio USD (formatted), same network as token list. */
  currentChainUsd: string
  tokens: ChainToken[]
  isLoading: boolean
  supportsTokens: boolean
}

export function useBalanceManager(): BalanceState {
  const { activeAccount, activeChain } = useAuth()

  const family = activeChain?.family ?? ChainFamily.EVM
  const adapter = balanceAdapterRegistry.get(family)
  const supportsTokens = adapter?.supportsTokens ?? false

  const portfolioNetworkSlugs = useMemo(
    () =>
      DEFAULT_CHAINS.filter((c) => c.family !== ChainFamily.Bitcoin)
        .map((c) => chainToAccountAssetsNetwork(c) ?? '')
        .filter(Boolean),
    []
  )

  const [nativeBalance, setNativeBalance] = useState(() => emptyBalance(family))
  const [totalAssetUsd, setTotalAssetUsd] = useState(() => formatUsdAmount('0'))
  const [currentChainUsd, setCurrentChainUsd] = useState(() =>
    formatUsdAmount('0')
  )
  const [tokens, setTokens] = useState<ChainToken[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const observedBalanceRef = useRef<string | null>(null)
  const activeChainRef = useRef(activeChain)
  const activeAccountRef = useRef(activeAccount)
  activeChainRef.current = activeChain
  activeAccountRef.current = activeAccount

  const inFlightFetchIdRef = useRef(0)

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

  const applyFromCache = useCallback(
    (opts?: { notifyNativeChange?: boolean }) => {
      const acc = activeAccountRef.current
      const chain = activeChainRef.current
      if (!acc?.address || !chain) {
        setTokens([])
        setTotalAssetUsd(formatUsdAmount('0'))
        setCurrentChainUsd(formatUsdAmount('0'))
        commitNativeBalance(emptyBalance(ChainFamily.EVM), {
          notifyOnChange: false,
          recordObserved: false,
        })
        observedBalanceRef.current = null
        return
      }
      const r = readAccountBalancesFromCache(chain, portfolioNetworkSlugs)
      setTokens(r.tokens)
      setTotalAssetUsd(r.totalAssetUsd)
      setCurrentChainUsd(r.currentChainUsd)
      commitNativeBalance(r.nativeBalance, {
        notifyOnChange: opts?.notifyNativeChange ?? false,
      })
    },
    [portfolioNetworkSlugs, commitNativeBalance]
  )

  // On chain/account change: show cached row for this network immediately.
  useEffect(() => {
    observedBalanceRef.current = null
    applyFromCache({ notifyNativeChange: false })
  }, [activeChain?.id, activeAccount?.address, family, applyFromCache])

  // Re-render when something else updates the shared token cache.
  useEffect(() => {
    return subscribeTokenCache(() => {
      applyFromCache({ notifyNativeChange: false })
    })
  }, [applyFromCache])

  // Interval: only fetch + populate cache; UI reads cache above.
  useEffect(() => {
    if (!activeAccount) return
    const address = activeAccount.address

    const tick = async () => {
      const fetchId = ++inFlightFetchIdRef.current
      setIsLoading(true)
      try {
        const chain = activeChainRef.current
        if (!chain) return
        await syncAccountBalancesToCache(address, chain, portfolioNetworkSlugs)
        if (activeAccountRef.current?.address !== address) return
        applyFromCache({ notifyNativeChange: true })
      } finally {
        if (fetchId === inFlightFetchIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    void tick()
    const interval = setInterval(
      () => void tick(),
      getAccountBalancePollIntervalMs()
    )
    return () => clearInterval(interval)
  }, [activeAccount, portfolioNetworkSlugs, applyFromCache, importedTokens])

  return {
    nativeBalance,
    totalAssetUsd,
    currentChainUsd,
    tokens,
    isLoading,
    supportsTokens,
  }
}
