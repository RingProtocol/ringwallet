import React, { createContext, useContext, useState, useEffect } from 'react'
import WalletService from '../services/walletService'
import CharUtils from '../utils/CharUtils'

const AuthContext = createContext(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [wallets, setWallets] = useState([])
  const [activeWalletIndex, setActiveWalletIndex] = useState(0)
  
  // 默认链配置
  const CHAINS = [
    { id: 1, name: 'Ethereum Mainnet', symbol: 'ETH', rpcUrl: import.meta.env.VITE_RPC_ETH_MAINNET, explorer: 'https://etherscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_ETH_MAINNET, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_ETH_MAINNET },
    { id: 11155111, name: 'Sepolia Testnet', symbol: 'SepoliaETH', rpcUrl: import.meta.env.VITE_RPC_SEPOLIA, explorer: 'https://sepolia.etherscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_SEPOLIA, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_SEPOLIA },
    { id: 10, name: 'Optimism', symbol: 'ETH', rpcUrl: import.meta.env.VITE_RPC_OPTIMISM, explorer: 'https://optimistic.etherscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_OPTIMISM, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_OPTIMISM },
    { id: 42161, name: 'Arbitrum One', symbol: 'ETH', rpcUrl: import.meta.env.VITE_RPC_ARBITRUM, explorer: 'https://arbiscan.io', bundlerUrl: import.meta.env.VITE_BUNDLER_ARBITRUM, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_ARBITRUM },
    { id: 137, name: 'Polygon', symbol: 'POL', rpcUrl: import.meta.env.VITE_RPC_POLYGON, explorer: 'https://polygonscan.com', bundlerUrl: import.meta.env.VITE_BUNDLER_POLYGON, entryPoint: import.meta.env.VITE_ENTRYPOINT_4337, factoryAddress: import.meta.env.VITE_FACTORY_POLYGON }
  ];
  const [activeChainId, setActiveChainId] = useState(1);

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedLoginState = localStorage.getItem('wallet_login_state')
    
    // 恢复链状态
    const savedChainId = localStorage.getItem('active_chain_id');
    if (savedChainId) {
      setActiveChainId(parseInt(savedChainId, 10));
    }

    if (savedLoginState) {
      try {
        const loginData = JSON.parse(savedLoginState)
        if (loginData.isLoggedIn && loginData.timestamp) {
          // 检查登录状态是否过期（24小时）
          const isExpired = Date.now() - loginData.timestamp > 24 * 60 * 60 * 1000
          if (!isExpired) {
            // 恢复 publicKey 格式（如果存在）
            if (loginData.user && loginData.user.publicKey) {
              const publicKey = loginData.user.publicKey;

              // 检查是否是空对象（JSON.stringify Map 的结果）
              const isEmptyObject = typeof publicKey === 'object' && publicKey !== null &&
                !(publicKey instanceof Map) &&
                Object.keys(publicKey).length === 0;

              if (isEmptyObject) {
                console.warn('⚠️ Public Key 是空对象，尝试从 localStorage 重新获取');
                loginData.user.publicKey = null; // 清除空对象
              } else {
                // 使用 CharUtils 规范化 COSE 密钥格式（支持多种格式）
                const normalizedPublicKey = CharUtils.normalizeCoseKey(publicKey);
                if (normalizedPublicKey) {
                  loginData.user.publicKey = normalizedPublicKey;
                  console.log('✅ Public Key 已规范化并恢复为 Map 格式');
                } else {
                  console.warn('⚠️ Public Key 格式无效，无法恢复:', publicKey);
                  loginData.user.publicKey = null; // 清除无效数据
                }
              }

              // 如果 publicKey 被清除或无效，尝试从 localStorage 重新获取
              if (!loginData.user.publicKey && loginData.user.id) {
                try {
                  // 使用 CharUtils 的辅助方法查找 publicKey
                  const restored = CharUtils.findPublicKeyFromStorage(loginData.user.id);
                  if (restored) {
                    loginData.user.publicKey = restored;
                    console.log('✅ Public Key 从 localStorage 重新恢复成功');
                  } else {
                    console.warn('⚠️ 未在 localStorage 中找到 Public Key');
                  }
                } catch (e) {
                  console.warn('从 localStorage 恢复 publicKey 失败:', e);
                }
              }
            }

            setIsLoggedIn(true)
            setUser(loginData.user)
            
            // 恢复钱包状态
            if (loginData.user) {
              if (loginData.user.publicKey) {
                 // EIP-7951 模式
                 const wallets = [];
                 for (let i = 0; i < 5; i++) {
                   const address = WalletService.deriveSmartAccount(loginData.user.publicKey, i);
                   if (address) {
                     wallets.push({
                       index: i,
                       address: address,
                       privateKey: null,
                       type: loginData.user.accountType === '4337' ? '4337' : 'eip-7951',
                       credentialId: loginData.user.id
                     });
                   }
                 }
                 setWallets(wallets);
              } else if (loginData.user.masterSeed) {
                 // 传统模式
                 // 注意：从 JSON 恢复的 masterSeed 可能是普通数组，需要转回 Uint8Array
                 const seed = new Uint8Array(Object.values(loginData.user.masterSeed));
                 const derivedWallets = WalletService.deriveWallets(seed, 5)
                 setWallets(derivedWallets)
              }
              
              // 恢复选中的钱包索引
              const savedIndex = localStorage.getItem('active_wallet_index')
              if (savedIndex !== null) {
                setActiveWalletIndex(parseInt(savedIndex, 10))
              }
            }
          } else {
            // 清除过期的登录状态
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

  const login = async (userData) => {
    setIsLoggedIn(true)
    setUser(userData)
    
    // 生成钱包
    if (userData.publicKey) {
      // EIP-7951 模式
      try {
        const wallets = [];
        for (let i = 0; i < 5; i++) {
          const address = WalletService.deriveSmartAccount(userData.publicKey, i);
          if (address) {
            wallets.push({
              index: i,
              address: address,
              privateKey: null,
              type: userData.accountType === '4337' ? '4337' : 'eip-7951',
              credentialId: userData.id
            });
          }
        }
        setWallets(wallets)
        setActiveWalletIndex(0)
      } catch (e) {
        console.error('Failed to derive smart accounts:', e)
      }
    } else if (userData.masterSeed) {
      try {
        const derivedWallets = WalletService.deriveWallets(userData.masterSeed, 5)
        setWallets(derivedWallets)
        setActiveWalletIndex(0) // 默认选中第一个
      } catch (e) {
        console.error('Failed to derive wallets during login:', e)
      }
    }

    // 保存登录状态到本地存储
    // 使用 CharUtils 将 Map 对象转换为可序列化的格式
    const userDataForStorage = { ...userData };
    if (userDataForStorage.publicKey) {
      // 如果 publicKey 是 Map 或对象，需要转换为存储格式
      // 如果已经是存储格式（有 _type: 'Map'），可以直接使用
      if (userDataForStorage.publicKey instanceof Map ||
        (typeof userDataForStorage.publicKey === 'object' &&
          userDataForStorage.publicKey !== null &&
          !userDataForStorage.publicKey._type)) {
        const storageFormat = CharUtils.coseKeyToStorage(userDataForStorage.publicKey);
        if (storageFormat) {
          userDataForStorage.publicKey = storageFormat;
          console.log('✅ Public Key 已转换为存储格式');
        } else {
          // 如果转换失败，移除 publicKey 避免序列化错误（Map 序列化为 {}）
          console.warn('⚠️ 无法转换 publicKey 为存储格式，将跳过保存以避免序列化错误');
          delete userDataForStorage.publicKey;
        }
      } else {
        // 已经是存储格式，可以直接保存
        console.log('✅ Public Key 已经是存储格式');
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

  const switchWallet = (index) => {
    if (index >= 0 && index < wallets.length) {
      setActiveWalletIndex(index)
      localStorage.setItem('active_wallet_index', index.toString())
    }
  }

  const switchChain = (chainId) => {
    const chain = CHAINS.find(c => c.id === chainId);
    if (chain) {
      setActiveChainId(chainId);
      localStorage.setItem('active_chain_id', chainId.toString());
    }
  }

  const activeWallet = wallets.length > 0 ? wallets[activeWalletIndex] : null
  const activeChain = CHAINS.find(c => c.id === activeChainId) || CHAINS[0];

  const value = {
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
