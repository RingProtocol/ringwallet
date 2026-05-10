'use client'

import React from 'react'
import { AuthContext__TEST_ONLY } from '@/contexts/AuthContext'
import type { Chain, Wallet, UserData } from '@/contexts/AuthContext'
import { WalletType } from '@/models/WalletType'
import DAppsPage from '@/features/dapps/components/DAppsPage'
import '@/features/dapps/components/DApps.css'

const MOCK_CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: ['https://eth.llamarpc.com'],
    explorer: 'https://etherscan.io',
  },
  {
    id: 11155111,
    name: 'Sepolia',
    symbol: 'SepoliaETH',
    rpcUrl: ['https://rpc.sepolia.org'],
    explorer: 'https://sepolia.etherscan.io',
  },
]

const MOCK_WALLET: Wallet = {
  index: 0,
  address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  privateKey: null,
  type: WalletType.EOA,
}

const MOCK_USER: UserData = {
  id: 'test-user',
  name: 'Test User',
  loginTime: new Date().toISOString(),
  accountType: WalletType.EOA,
}

const mockAuth = {
  isLoggedIn: true,
  user: MOCK_USER,
  wallets: [MOCK_WALLET],
  activeWallet: MOCK_WALLET,
  activeWalletIndex: 0,
  switchWallet: () => {},
  login: async () => {},
  logout: () => {},
  CHAINS: MOCK_CHAINS,
  activeChainId: 1,
  activeChain: MOCK_CHAINS[0],
  switchChain: () => {},
  solanaWallets: [],
  activeSolanaWallet: null,
  isSolanaChain: false,
  bitcoinWallets: [],
  activeBitcoinWallet: null,
  isBitcoinChain: false,
  dogecoinWallets: [],
  activeDogecoinWallet: null,
  isDogecoinChain: false,
  accountsByFamily: {},
  activeAccount: null,
  addCustomChain: () => {},
  removeCustomChain: () => {},
}

export default function TestDAppsPage() {
  return (
    <AuthContext__TEST_ONLY.Provider value={mockAuth}>
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '8px 16px',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>DApps Test Mode</span>
          <span style={{ opacity: 0.5, fontSize: 11 }}>
            mock auth · 0xd8dA...6045
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <DAppsPage />
        </div>
      </div>
    </AuthContext__TEST_ONLY.Provider>
  )
}
