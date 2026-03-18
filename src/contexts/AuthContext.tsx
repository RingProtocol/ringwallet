import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import WalletService from '../services/walletService'
import { SolanaKeyService } from '../services/solanaKeyService'
import { BitcoinKeyService } from '../services/bitcoinKeyService'
import CharUtils from '../utils/CharUtils'
import { WalletType } from '../models/WalletType'
import { ChainFamily, type Chain } from '../models/ChainType'
import { DEFAULT_CHAINS } from '../config/chains'
import * as DbgLog from '../utils/DbgLog'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage'

export type { ChainFamily, Chain }

export interface Wallet {
  index: number;
  address: string;
  privateKey: string | null;
  type: WalletType;
  credentialId?: string;
  path?: string;
}

export interface UserData {
  id: string;
  name: string;
  loginTime: string;
  masterSeed?: Uint8Array | number[];
  publicKey?: Map<number, Uint8Array> | Record<string | number, unknown> | null;
  accountType: WalletType;
}

interface AuthContextValue {
  isLoggedIn: boolean;
  user: UserData | null;
  wallets: Wallet[];
  activeWallet: Wallet | null;
  activeWalletIndex: number;
  switchWallet: (index: number) => void;
  login: (userData: UserData) => Promise<void>;
  logout: () => void;
  CHAINS: Chain[];
  activeChainId: number | string;
  activeChain: Chain;
  switchChain: (chainId: number | string) => void;
  /** Solana wallets — same index mapping as EVM wallets */
  solanaWallets: Wallet[];
  activeSolanaWallet: Wallet | null;
  /** True when the currently selected chain is a Solana chain */
  isSolanaChain: boolean;
  /** Bitcoin wallets — same index mapping as EVM wallets */
  bitcoinWallets: Wallet[];
  activeBitcoinWallet: Wallet | null;
  /** True when the currently selected chain is a Bitcoin chain */
  isBitcoinChain: boolean;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [solanaWallets, setSolanaWallets] = useState<Wallet[]>([])
  const [bitcoinWallets, setBitcoinWallets] = useState<Wallet[]>([])
  const [activeWalletIndex, setActiveWalletIndex] = useState(0)

  const [CHAINS, setChains] = useState<Chain[]>(DEFAULT_CHAINS);
  const [activeChainId, setActiveChainId] = useState<number | string>(1);

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch('/chainid.json');
        if (!response.ok) throw new Error('Failed to fetch chain data');
        const data = await response.json();

        const extraChains: Chain[] = data.map((c: Record<string, unknown>) => ({
          id: c.chainId as number,
          name: c.name as string,
          symbol: (c.nativeCurrency as Record<string, string>)?.symbol || 'ETH',
          family: ChainFamily.EVM,
          rpcUrl: (c.rpc as string[])?.length > 0
            ? (c.rpc as string[])[0].replace('${INFURA_API_KEY}', import.meta.env.VITE_INFURA_API_KEY || '')
            : '',
          explorer: (c.explorers as Array<{ url: string }>)?.length > 0
            ? (c.explorers as Array<{ url: string }>)[0].url
            : '',
        })).filter((c: Chain) =>
          c.rpcUrl && !String(c.rpcUrl).includes('${') &&
          !DEFAULT_CHAINS.some(dc => dc.id === c.id)
        );

        setChains([...DEFAULT_CHAINS, ...extraChains]);
      } catch (error) {
        console.error('Error loading chains:', error);
      }
    };

    fetchChains();
  }, []);

  useEffect(() => {
    const savedChainId = safeGetItem('active_chain_id');
    if (savedChainId) {
      // Numeric string → number; non-numeric string (e.g. 'solana-mainnet') → keep as string
      const parsed = Number(savedChainId);
      setActiveChainId(Number.isInteger(parsed) && !isNaN(parsed) ? parsed : savedChainId);
    }

    const savedLoginState = safeGetItem('wallet_login_state')
    if (!savedLoginState) return

    try {
      const loginData = JSON.parse(savedLoginState) as { isLoggedIn: boolean; user: UserData; timestamp: number }
      if (!loginData.isLoggedIn || !loginData.timestamp) return

      const isExpired = Date.now() - loginData.timestamp > 24 * 60 * 60 * 1000
      if (isExpired) {
        safeRemoveItem('wallet_login_state')
        safeRemoveItem('active_wallet_index')
        return
      }

      if (loginData.user?.publicKey) {
        const publicKey = loginData.user.publicKey;

        const isEmptyObject = typeof publicKey === 'object' && publicKey !== null &&
          !(publicKey instanceof Map) &&
          Object.keys(publicKey).length === 0;

        if (isEmptyObject) {
          loginData.user.publicKey = null;
        } else {
          const normalizedPublicKey = CharUtils.normalizeCoseKey(publicKey as Map<number, Uint8Array>);
          loginData.user.publicKey = normalizedPublicKey;
        }

        if (!loginData.user.publicKey && loginData.user.id) {
          try {
            loginData.user.publicKey = CharUtils.findPublicKeyFromStorage(loginData.user.id) ?? null;
          } catch (e) {
            console.warn('Failed to restore publicKey from storage:', e);
          }
        }
      }

      loginData.user.accountType = WalletType.EOA
      setIsLoggedIn(true)
      setUser(loginData.user)

      if (loginData.user?.masterSeed) {
        const seed = new Uint8Array(Object.values(loginData.user.masterSeed as unknown as Record<string, number>));
        const derivedWallets = WalletService.deriveWallets(seed, 5)
        setWallets(derivedWallets)

        try {
          const derivedSolana = SolanaKeyService.deriveWallets(seed, 5)
          setSolanaWallets(derivedSolana)
        } catch (e) {
          console.error('Failed to derive Solana wallets during session restore:', e)
        }

        try {
          const derivedBtc = BitcoinKeyService.deriveWallets(seed, 5, false)
          setBitcoinWallets(derivedBtc)
        } catch (e) {
          console.error('Failed to derive Bitcoin wallets during session restore:', e)
        }

        const savedIndex = safeGetItem('active_wallet_index')
        if (savedIndex !== null) {
          setActiveWalletIndex(parseInt(savedIndex, 10))
        }
      }
    } catch (error) {
      console.error('Error restoring login state:', error)
      safeRemoveItem('wallet_login_state')
      safeRemoveItem('active_wallet_index')
    }
  }, [])

  const login = async (userData: UserData) => {
    userData.accountType = WalletType.EOA

    setIsLoggedIn(true)
    setUser(userData)

    if (userData.masterSeed) {
      try {
        const seed = userData.masterSeed as Uint8Array
        const derivedWallets = WalletService.deriveWallets(seed, 5)
        setWallets(derivedWallets)
        setActiveWalletIndex(0)

        try {
          const derivedSolana = SolanaKeyService.deriveWallets(seed, 5)
          setSolanaWallets(derivedSolana)
        } catch (e) {
          console.error('Failed to derive Solana wallets during login:', e)
        }

        try {
          const derivedBtc = BitcoinKeyService.deriveWallets(seed, 5, false)
          setBitcoinWallets(derivedBtc)
        } catch (e) {
          console.error('Failed to derive Bitcoin wallets during login:', e)
        }
      } catch (e) {
        console.error('Failed to derive wallets during login:', e)
      }
    }

    const userDataForStorage: Record<string, unknown> = { ...userData };
    if (userDataForStorage.publicKey) {
      const pk = userDataForStorage.publicKey;
      if (pk instanceof Map ||
        (typeof pk === 'object' &&
          pk !== null &&
          !(pk as { _type?: string })._type)) {
        const storageFormat = CharUtils.coseKeyToStorage(pk as Map<number, Uint8Array>);
        if (storageFormat) {
          userDataForStorage.publicKey = storageFormat;
          DbgLog.log('✅ Public Key 已转换为存储格式');
        } else {
          console.warn('⚠️ 无法转换 publicKey 为存储格式，将跳过保存以避免序列化错误');
          delete userDataForStorage.publicKey;
        }
      } else {
        DbgLog.log('✅ Public Key 已经是存储格式');
      }
    }

    const loginState = {
      isLoggedIn: true,
      user: userDataForStorage,
      timestamp: Date.now()
    }
    safeSetItem('wallet_login_state', JSON.stringify(loginState))
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUser(null)
    setWallets([])
    setSolanaWallets([])
    setBitcoinWallets([])
    setActiveWalletIndex(0)
    safeRemoveItem('wallet_login_state')
    safeRemoveItem('active_wallet_index')
  }

  const switchWallet = (index: number) => {
    if (index >= 0 && index < wallets.length) {
      setActiveWalletIndex(index)
      safeSetItem('active_wallet_index', index.toString())
    }
  }

  const switchChain = (chainId: number | string) => {
    const chain = CHAINS.find(c => c.id === chainId);
    if (chain) {
      setActiveChainId(chainId);
      safeSetItem('active_chain_id', chainId.toString());
    }
  }

  const activeWallet = wallets.length > 0 ? wallets[activeWalletIndex] : null
  const activeSolanaWallet = solanaWallets.length > 0 ? solanaWallets[activeWalletIndex] : null
  const activeBitcoinWallet = bitcoinWallets.length > 0 ? bitcoinWallets[activeWalletIndex] : null
  const activeChain = CHAINS.find(c => c.id === activeChainId) || CHAINS[0];
  const isSolanaChain = activeChain?.family === ChainFamily.Solana
  const isBitcoinChain = activeChain?.family === ChainFamily.Bitcoin

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
    solanaWallets,
    activeSolanaWallet,
    isSolanaChain,
    bitcoinWallets,
    activeBitcoinWallet,
    isBitcoinChain,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
