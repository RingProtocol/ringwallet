import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import WalletService from '../services/walletService'
import CharUtils from '../utils/CharUtils'
import { WalletType } from '../models/WalletType'
import * as DbgLog from '../utils/DbgLog'

export interface Chain {
  id: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorer: string;
  bundlerUrl?: string;
  entryPoint?: string;
  factoryAddress?: string;
}

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
  activeChainId: number;
  activeChain: Chain;
  switchChain: (chainId: number) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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
  const [activeWalletIndex, setActiveWalletIndex] = useState(0)

  const DEFAULT_CHAINS: Chain[] = [
    { id: 1, name: 'Ethereum Mainnet', symbol: 'ETH', rpcUrl: import.meta.env.VITE_RPC_ETH_MAINNET, explorer: 'https://etherscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_ETH_MAINNET, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_ETH_MAINNET },
    { id: 11155111, name: 'Sepolia Testnet', symbol: 'SepoliaETH', rpcUrl: import.meta.env.VITE_RPC_SEPOLIA, explorer: 'https://sepolia.etherscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_SEPOLIA, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_SEPOLIA },
    { id: 10, name: 'Optimism', symbol: 'ETH', rpcUrl: import.meta.env.VITE_RPC_OPTIMISM, explorer: 'https://optimistic.etherscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_OPTIMISM, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_OPTIMISM },
    { id: 42161, name: 'Arbitrum One', symbol: 'ETH', rpcUrl: import.meta.env.VITE_RPC_ARBITRUM, explorer: 'https://arbiscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_ARBITRUM, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_ARBITRUM },
    { id: 137, name: 'Polygon', symbol: 'POL', rpcUrl: import.meta.env.VITE_RPC_POLYGON, explorer: 'https://polygonscan.com', bundlerUrl: import.meta.env.VITE_BUNDLER_POLYGON, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_POLYGON }
  ];

  const [CHAINS, setChains] = useState<Chain[]>(DEFAULT_CHAINS);
  const [activeChainId, setActiveChainId] = useState(1);

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch('/chainid.json');
        if (!response.ok) throw new Error('Failed to fetch chain data');
        const data = await response.json();
        
        // Map external chain data to our Chain interface
        const extraChains: Chain[] = data.map((c: any) => ({
          id: c.chainId,
          name: c.name,
          symbol: c.nativeCurrency?.symbol || 'ETH',
          rpcUrl: c.rpc && c.rpc.length > 0 ? c.rpc[0].replace('${INFURA_API_KEY}', import.meta.env.VITE_INFURA_API_KEY || '') : '',
          explorer: c.explorers && c.explorers.length > 0 ? c.explorers[0].url : '',
          // Bundler and other AA fields are undefined for these extra chains
        })).filter((c: Chain) => 
          c.rpcUrl && !c.rpcUrl.includes('${') && // Filter out RPCs that still have unreplaced variables
          !DEFAULT_CHAINS.some(dc => dc.id === c.id) // Filter out duplicates
        );

        setChains([...DEFAULT_CHAINS, ...extraChains]);
      } catch (error) {
        console.error('Error loading chains:', error);
      }
    };

    fetchChains();
  }, []);

  useEffect(() => {
    const savedLoginState = localStorage.getItem('wallet_login_state')

    const savedChainId = localStorage.getItem('active_chain_id');
    if (savedChainId) {
      setActiveChainId(parseInt(savedChainId, 10));
    }

    if (savedLoginState) {
      try {
        const loginData = JSON.parse(savedLoginState) as { isLoggedIn: boolean; user: UserData; timestamp: number }
        if (loginData.isLoggedIn && loginData.timestamp) {
          const isExpired = Date.now() - loginData.timestamp > 24 * 60 * 60 * 1000
          if (!isExpired) {
            if (loginData.user && loginData.user.publicKey) {
              const publicKey = loginData.user.publicKey;

              const isEmptyObject = typeof publicKey === 'object' && publicKey !== null &&
                !(publicKey instanceof Map) &&
                Object.keys(publicKey).length === 0;

              if (isEmptyObject) {
                console.warn('⚠️ Public Key 是空对象，尝试从 localStorage 重新获取');
                loginData.user.publicKey = null;
              } else {
                const normalizedPublicKey = CharUtils.normalizeCoseKey(publicKey as Map<number, Uint8Array>);
                if (normalizedPublicKey) {
                  loginData.user.publicKey = normalizedPublicKey;
                  DbgLog.log('✅ Public Key 已规范化并恢复为 Map 格式');
                } else {
                  console.warn('⚠️ Public Key 格式无效，无法恢复:', publicKey);
                  loginData.user.publicKey = null;
                }
              }

              if (!loginData.user.publicKey && loginData.user.id) {
                try {
                  const restored = CharUtils.findPublicKeyFromStorage(loginData.user.id);
                  if (restored) {
                    loginData.user.publicKey = restored;
                    DbgLog.log('✅ Public Key 从 localStorage 重新恢复成功');
                  } else {
                    console.warn('⚠️ 未在 localStorage 中找到 Public Key');
                  }
                } catch (e) {
                  console.warn('从 localStorage 恢复 publicKey 失败:', e);
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

              const savedIndex = localStorage.getItem('active_wallet_index')
              if (savedIndex !== null) {
                setActiveWalletIndex(parseInt(savedIndex, 10))
              }
            }
          } else {
            localStorage.removeItem('wallet_login_state')
            localStorage.removeItem('active_wallet_index')
          }
        }
      } catch (error) {
        console.error('Error parsing saved login state:', error)
        localStorage.removeItem('wallet_login_state')
        localStorage.removeItem('active_wallet_index')
      }
    }
  }, [])

  const login = async (userData: UserData) => {
    userData.accountType = WalletType.EOA

    setIsLoggedIn(true)
    setUser(userData)

    if (userData.masterSeed) {
      try {
        const derivedWallets = WalletService.deriveWallets(userData.masterSeed as Uint8Array, 5)
        setWallets(derivedWallets)
        setActiveWalletIndex(0)
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
    localStorage.setItem('wallet_login_state', JSON.stringify(loginState))
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUser(null)
    setWallets([])
    setActiveWalletIndex(0)
    localStorage.removeItem('wallet_login_state')
    localStorage.removeItem('active_wallet_index')
  }

  const switchWallet = (index: number) => {
    if (index >= 0 && index < wallets.length) {
      setActiveWalletIndex(index)
      localStorage.setItem('active_wallet_index', index.toString())
    }
  }

  const switchChain = (chainId: number) => {
    const chain = CHAINS.find(c => c.id === chainId);
    if (chain) {
      setActiveChainId(chainId);
      localStorage.setItem('active_chain_id', chainId.toString());
    }
  }

  const activeWallet = wallets.length > 0 ? wallets[activeWalletIndex] : null
  const activeChain = CHAINS.find(c => c.id === activeChainId) || CHAINS[0];

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
    switchChain
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
