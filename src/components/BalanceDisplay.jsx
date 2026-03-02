import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import './BalanceDisplay.css'

const BalanceDisplay = () => {
  const { activeWallet, activeChain } = useAuth()
  const [balance, setBalance] = useState('0.0000')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeWallet || !activeChain || !activeChain.rpcUrl) return
      
      setIsLoading(true)
      try {
        const provider = new ethers.JsonRpcProvider(activeChain.rpcUrl)
        const balanceWei = await provider.getBalance(activeWallet.address)
        const balanceEth = ethers.formatEther(balanceWei)
        // Format to 4 decimal places
        const formatted = parseFloat(balanceEth).toFixed(4)
        setBalance(formatted)
      } catch (error) {
        console.error('Failed to fetch balance:', error)
        setBalance('0.0000')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
    // Poll every 15 seconds
    const interval = setInterval(fetchBalance, 15000)
    return () => clearInterval(interval)
  }, [activeWallet, activeChain])

  if (!activeWallet) return null

  return (
    <div className="balance-display">
      <div className="balance-amount">
        {isLoading && balance === '0.0000' ? (
          <span className="loading-text">...</span>
        ) : (
          <>
            {balance} <span className="currency-symbol">{activeChain.symbol || 'ETH'}</span>
          </>
        )}
      </div>
      <div className="balance-label">Total Balance</div>
    </div>
  )
}

export default BalanceDisplay
