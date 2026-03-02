import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import './TokenBalance.css'

interface TokenInfo {
  symbol: string
  name: string
  balance: string
  isNative: boolean
}

const TokenBalance: React.FC = () => {
  const { activeWallet, activeChain } = useAuth()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchBalances = async () => {
      if (!activeWallet || !activeChain?.rpcUrl) return

      setIsLoading(true)
      try {
        const provider = new ethers.JsonRpcProvider(activeChain.rpcUrl)
        const balanceWei = await provider.getBalance(activeWallet.address)
        const balanceEth = ethers.formatEther(balanceWei)

        setTokens([
          {
            symbol: activeChain.symbol || 'ETH',
            name: activeChain.name,
            balance: parseFloat(balanceEth).toFixed(4),
            isNative: true,
          },
        ])
      } catch (error) {
        console.error('Failed to fetch token balances:', error)
        setTokens([
          {
            symbol: activeChain.symbol || 'ETH',
            name: activeChain.name,
            balance: '0.0000',
            isNative: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, 15000)
    return () => clearInterval(interval)
  }, [activeWallet, activeChain])

  if (!activeWallet) return null

  return (
    <div className="token-balance-list">
      {isLoading && tokens.length === 0 ? (
        <div className="token-loading">Loading...</div>
      ) : tokens.length === 0 ? (
        <div className="token-empty">No tokens found</div>
      ) : (
        tokens.map((token) => (
          <div key={token.symbol} className="token-row">
            <div className="token-icon-wrap">
              <span className="token-icon-placeholder">
                {token.symbol.charAt(0)}
              </span>
            </div>
            <div className="token-info">
              <span className="token-symbol">{token.symbol}</span>
              <span className="token-name">{token.name}</span>
            </div>
            <div className="token-amount">{token.balance}</div>
          </div>
        ))
      )}
    </div>
  )
}

export default TokenBalance
