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
  type AccountAssetsAddressEntry,
  emptyBalance,
  formatUsdAmount,
} from '../features/balance/balanceManager'
import type { ChainToken } from '../models/ChainTokens'
import {
  chainToAccountAssetsNetwork,
  DEFAULT_CHAINS,
  FEATURED_CHAIN_IDS,
  FEATURED_TESTNET_IDS,
} from '@/config/chains'

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
  const {
    activeAccount,
    activeChain,
    activeWallet,
    activeSolanaWallet,
    activeDogecoinWallet,
    activeWalletIndex,
    accountsByFamily,
  } = useAuth()

  const family = activeChain?.family ?? ChainFamily.EVM
  const adapter = balanceAdapterRegistry.get(family)
  const supportsTokens = adapter?.supportsTokens ?? false

  const accountAssetGroups = useMemo((): AccountAssetsAddressEntry[] => {
    const uniq = (xs: string[]) => [...new Set(xs)]
    const evmNets: string[] = []
    const solNets: string[] = []
    const tronNets: string[] = []
    const dogeNets: string[] = []

    const featuredIdSet = new Set(
      [...FEATURED_CHAIN_IDS, ...FEATURED_TESTNET_IDS].map(String)
    )
    const testnetIdSet = new Set(FEATURED_TESTNET_IDS.map(String))
    const activeChainId = String(activeChain?.id ?? '')

    for (const c of DEFAULT_CHAINS) {
      // Only query chains that are featured (or the current active chain)
      if (!featuredIdSet.has(String(c.id)) && String(c.id) !== activeChainId) {
        continue
      }
      if (c.family === ChainFamily.Bitcoin) continue
      const slug = chainToAccountAssetsNetwork(c)
      if (!slug) continue

      // Skip testnets unless the user is currently on that testnet
      const isTestnet = testnetIdSet.has(String(c.id))
      if (isTestnet && String(c.id) !== activeChainId) {
        continue
      }

      switch (c.family) {
        case ChainFamily.EVM:
        case ChainFamily.Prisma:
          evmNets.push(slug)
          break
        case ChainFamily.Solana:
          solNets.push(slug)
          break
        case ChainFamily.Tron:
          tronNets.push(slug)
          break
        case ChainFamily.Dogecoin:
          dogeNets.push(slug)
          break
        default:
          break
      }
    }

    const groups: AccountAssetsAddressEntry[] = []
    const evmAddr = activeWallet?.address
    if (evmAddr && evmNets.length > 0) {
      groups.push({ address: evmAddr, networks: uniq(evmNets) })
    }
    const solAddr = activeSolanaWallet?.address
    if (solAddr && solNets.length > 0) {
      groups.push({ address: solAddr, networks: uniq(solNets) })
    }
    const tronAcc = accountsByFamily[ChainFamily.Tron]?.[activeWalletIndex]
    if (tronAcc?.address && tronNets.length > 0) {
      groups.push({ address: tronAcc.address, networks: uniq(tronNets) })
    }
    const dogeAddr = activeDogecoinWallet?.address
    if (dogeAddr && dogeNets.length > 0) {
      groups.push({ address: dogeAddr, networks: uniq(dogeNets) })
    }
    return groups
  }, [
    activeWallet?.address,
    activeSolanaWallet?.address,
    activeDogecoinWallet?.address,
    activeWalletIndex,
    accountsByFamily,
    activeChain,
  ])

  const portfolioNetworkSlugs = useMemo(
    () => accountAssetGroups.flatMap((g) => g.networks),
    [accountAssetGroups]
  )

  const accountAssetGroupsRef = useRef(accountAssetGroups)
  accountAssetGroupsRef.current = accountAssetGroups

  const accountAssetsSyncKeyRef = useRef('')
  accountAssetsSyncKeyRef.current = accountAssetGroups
    .map((g) => `${g.address}:${g.networks.join(',')}`)
    .join('|')

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

  const walletIdentityKey = useMemo(
    () =>
      [
        activeWalletIndex,
        activeWallet?.address ?? '',
        activeSolanaWallet?.address ?? '',
        activeDogecoinWallet?.address ?? '',
        accountsByFamily[ChainFamily.Tron]?.[activeWalletIndex]?.address ?? '',
      ].join('|'),
    [
      activeWalletIndex,
      activeWallet?.address,
      activeSolanaWallet?.address,
      activeDogecoinWallet?.address,
      accountsByFamily,
    ]
  )

  useEffect(() => {
    clearChainTokenCache()
  }, [walletIdentityKey])

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
  // Uses exponential backoff on consecutive failures to avoid hammering broken RPCs.
  useEffect(() => {
    if (!activeAccount) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let consecutiveFailures = 0
    const BACKOFF_STEPS = [10_000, 15_000, 20_000, 30_000, 40_000, 60_000]

    const getNextDelay = () =>
      BACKOFF_STEPS[Math.min(consecutiveFailures, BACKOFF_STEPS.length - 1)]

    const tick = async () => {
      const fetchId = ++inFlightFetchIdRef.current
      setIsLoading(true)
      const syncKeyAtStart = accountAssetsSyncKeyRef.current
      const adapterAddress = activeAccountRef.current?.address ?? ''
      try {
        const chain = activeChainRef.current
        if (!chain) return
        const groups = accountAssetGroupsRef.current
        await syncAccountBalancesToCache(adapterAddress, chain, groups)
        if (accountAssetsSyncKeyRef.current !== syncKeyAtStart) return
        applyFromCache({ notifyNativeChange: true })
        consecutiveFailures = 0
      } catch {
        consecutiveFailures++
      } finally {
        if (fetchId === inFlightFetchIdRef.current) {
          setIsLoading(false)
        }
        if (!cancelled) {
          timer = setTimeout(() => void tick(), getNextDelay())
        }
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer != null) clearTimeout(timer)
    }
  }, [activeAccount, accountAssetGroups, applyFromCache, importedTokens])

  return {
    nativeBalance,
    totalAssetUsd,
    currentChainUsd,
    tokens,
    isLoading,
    supportsTokens,
  }
}
