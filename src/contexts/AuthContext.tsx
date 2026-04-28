import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import {
  chainRegistry,
  BITCOIN_TESTNET_ACCOUNTS_KEY,
  DOGECOIN_TESTNET_ACCOUNTS_KEY,
  cosmosAccountsKey,
  type DerivedAccount,
} from '../services/chainplugins'
import { COSMOS_CHAIN_VARIANTS } from '../config/chains'
import { WalletType } from '../models/WalletType'
import { ChainFamily, type Chain } from '../models/ChainType'
import { DEFAULT_CHAINS } from '../config/chains'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage'

export type { ChainFamily, Chain }

export interface Wallet {
  index: number
  address: string
  privateKey: string | null
  type: WalletType
  credentialId?: string
  path?: string
}

export interface UserData {
  id: string
  name: string
  loginTime: string
  masterSeed?: Uint8Array | number[]
  publicKey?: Map<number, Uint8Array> | Record<string | number, unknown> | null
  accountType: WalletType
}

interface AuthContextValue {
  isLoggedIn: boolean
  user: UserData | null
  wallets: Wallet[]
  activeWallet: Wallet | null
  activeWalletIndex: number
  switchWallet: (index: number) => void
  login: (userData: UserData) => Promise<void>
  logout: () => void
  CHAINS: Chain[]
  activeChainId: number | string
  activeChain: Chain
  switchChain: (chainId: number | string) => void
  /** Add a user-defined custom chain and persist it to localStorage. */
  addCustomChain: (chain: Chain) => void
  /** Remove a user-defined custom chain and persist the change. */
  removeCustomChain: (chainId: number | string) => void
  /** Solana wallets — same index mapping as EVM wallets */
  solanaWallets: Wallet[]
  activeSolanaWallet: Wallet | null
  /** True when the currently selected chain is a Solana chain */
  isSolanaChain: boolean
  /** Bitcoin wallets — same index mapping as EVM wallets */
  bitcoinWallets: Wallet[]
  activeBitcoinWallet: Wallet | null
  /** True when the currently selected chain is a Bitcoin chain */
  isBitcoinChain: boolean
  /** Dogecoin wallets — same index mapping as EVM wallets */
  dogecoinWallets: Wallet[]
  activeDogecoinWallet: Wallet | null
  /** True when the currently selected chain is a Dogecoin chain */
  isDogecoinChain: boolean

  /** All derived accounts keyed by ChainFamily. Prefer this over the per-chain arrays. */
  accountsByFamily: Record<string, DerivedAccount[]>
  /** Active account for the currently selected chain family. */
  activeAccount: DerivedAccount | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export { AuthContext as AuthContext__TEST_ONLY }

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function derivedAccountToWallet(account: DerivedAccount): Wallet {
  return {
    index: account.index,
    address: account.address,
    privateKey: account.privateKey,
    type: WalletType.EOA,
    path: account.path,
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [accountsByFamily, setAccountsByFamily] = useState<
    Record<string, DerivedAccount[]>
  >({})
  const [activeWalletIndex, setActiveWalletIndex] = useState(0)

  const CUSTOM_CHAINS_KEY = 'custom_chains'

  const [customChains, setCustomChains] = useState<Chain[]>(() => {
    try {
      const raw = safeGetItem(CUSTOM_CHAINS_KEY)
      if (raw) return JSON.parse(raw) as Chain[]
    } catch {
      /* ignore */
    }
    return []
  })

  const CHAINS = useMemo(
    () => [...DEFAULT_CHAINS, ...customChains],
    [customChains]
  )

  const [activeChainId, setActiveChainId] = useState<number | string>(1)

  function deriveAllFromSeed(seed: Uint8Array, count: number) {
    const all = chainRegistry.deriveAllAccounts(seed, count)
    setAccountsByFamily(all)
  }

  useEffect(() => {
    const savedChainId = safeGetItem('active_chain_id')
    if (savedChainId) {
      const parsed = Number(savedChainId)
      setActiveChainId(
        Number.isInteger(parsed) && !isNaN(parsed) ? parsed : savedChainId
      )
    }

    safeRemoveItem('wallet_login_state')
  }, [])

  const addCustomChain = useCallback((chain: Chain) => {
    setCustomChains((prev) => {
      if (prev.some((c) => String(c.id) === String(chain.id))) {
        return prev
      }
      const next = [...prev, chain]
      safeSetItem(CUSTOM_CHAINS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeCustomChain = useCallback((chainId: number | string) => {
    setCustomChains((prev) => {
      const next = prev.filter((c) => String(c.id) !== String(chainId))
      safeSetItem(CUSTOM_CHAINS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const login = async (userData: UserData) => {
    userData.accountType = WalletType.EOA

    setIsLoggedIn(true)
    setUser(userData)

    if (userData.masterSeed) {
      try {
        const seed = userData.masterSeed as Uint8Array
        deriveAllFromSeed(seed, 5)
        const savedIndex = safeGetItem('active_wallet_index')
        const parsedIndex = savedIndex !== null ? parseInt(savedIndex, 10) : NaN
        const nextWalletIndex =
          Number.isInteger(parsedIndex) && parsedIndex >= 0 && parsedIndex < 5
            ? parsedIndex
            : 0
        setActiveWalletIndex(nextWalletIndex)
      } catch (e) {
        console.error('Failed to derive wallets during login:', e)
      }
    }
    safeRemoveItem('wallet_login_state')
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUser(null)
    setAccountsByFamily({})
    setActiveWalletIndex(0)
    safeRemoveItem('wallet_login_state')
  }

  const switchWallet = (index: number) => {
    const evmAccounts = accountsByFamily[ChainFamily.EVM] ?? []
    if (index >= 0 && index < evmAccounts.length) {
      setActiveWalletIndex(index)
      safeSetItem('active_wallet_index', index.toString())
    }
  }

  const switchChain = (chainId: number | string) => {
    const chain = CHAINS.find((c) => c.id === chainId)
    if (chain) {
      setActiveChainId(chainId)
      safeSetItem('active_chain_id', chainId.toString())
    }
  }

  const activeChain = CHAINS.find((c) => c.id === activeChainId) || CHAINS[0]
  const isSolanaChain = activeChain?.family === ChainFamily.Solana
  const isBitcoinChain = activeChain?.family === ChainFamily.Bitcoin
  const isDogecoinChain = activeChain?.family === ChainFamily.Dogecoin

  // Backward-compatible per-family wallet arrays (derived from accountsByFamily)
  const wallets = useMemo(
    () => (accountsByFamily[ChainFamily.EVM] ?? []).map(derivedAccountToWallet),
    [accountsByFamily]
  )
  const solanaWallets = useMemo(
    () =>
      (accountsByFamily[ChainFamily.Solana] ?? []).map(derivedAccountToWallet),
    [accountsByFamily]
  )
  const bitcoinWallets = useMemo(() => {
    const isBtcTestnet =
      activeChain?.family === ChainFamily.Bitcoin &&
      activeChain.network === 'testnet'
    const key = isBtcTestnet
      ? BITCOIN_TESTNET_ACCOUNTS_KEY
      : ChainFamily.Bitcoin
    return (accountsByFamily[key] ?? []).map(derivedAccountToWallet)
  }, [accountsByFamily, activeChain])
  const dogecoinWallets = useMemo(() => {
    const isDogeTestnet =
      activeChain?.family === ChainFamily.Dogecoin &&
      activeChain.network === 'testnet'
    const key = isDogeTestnet
      ? DOGECOIN_TESTNET_ACCOUNTS_KEY
      : ChainFamily.Dogecoin
    return (accountsByFamily[key] ?? []).map(derivedAccountToWallet)
  }, [accountsByFamily, activeChain])

  const activeWallet = wallets.length > 0 ? wallets[activeWalletIndex] : null
  const activeSolanaWallet =
    solanaWallets.length > 0 ? solanaWallets[activeWalletIndex] : null
  const activeBitcoinWallet =
    bitcoinWallets.length > 0 ? bitcoinWallets[activeWalletIndex] : null
  const activeDogecoinWallet =
    dogecoinWallets.length > 0 ? dogecoinWallets[activeWalletIndex] : null

  const activeAccount = useMemo(() => {
    const family = activeChain?.family
    if (!family) return null
    if (family === ChainFamily.Bitcoin && activeChain.network === 'testnet') {
      return (
        (accountsByFamily[BITCOIN_TESTNET_ACCOUNTS_KEY] ?? [])[
          activeWalletIndex
        ] ?? null
      )
    }
    if (family === ChainFamily.Dogecoin && activeChain.network === 'testnet') {
      return (
        (accountsByFamily[DOGECOIN_TESTNET_ACCOUNTS_KEY] ?? [])[
          activeWalletIndex
        ] ?? null
      )
    }
    if (family === ChainFamily.Cosmos && activeChain.addressPrefix) {
      const variant = COSMOS_CHAIN_VARIANTS.find(
        (v) => v.addressPrefix === activeChain.addressPrefix
      )
      if (variant) {
        return (
          (accountsByFamily[cosmosAccountsKey(variant.key)] ?? [])[
            activeWalletIndex
          ] ?? null
        )
      }
    }
    const accounts = accountsByFamily[family] ?? []
    return accounts[activeWalletIndex] ?? null
  }, [accountsByFamily, activeChain, activeWalletIndex])

  const value: AuthContextValue = {
    isLoggedIn,
    user,
    wallets,
    activeWallet,
    activeWalletIndex,
    switchWallet,
    login,
    logout,
    CHAINS,
    activeChainId,
    activeChain,
    switchChain,
    addCustomChain,
    removeCustomChain,
    solanaWallets,
    activeSolanaWallet,
    isSolanaChain,
    bitcoinWallets,
    activeBitcoinWallet,
    isBitcoinChain,
    dogecoinWallets,
    activeDogecoinWallet,
    isDogecoinChain,
    accountsByFamily,
    activeAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
