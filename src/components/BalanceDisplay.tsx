import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import { SolanaService } from '../services/solanaService'
import { BitcoinService, bitcoinForkForChain } from '../services/bitcoinService'
import './BalanceDisplay.css'

function getEmptyBalance(isBitcoinChain: boolean): string {
  return isBitcoinChain ? '0.00000000' : '0.0000'
}

const BalanceDisplay: React.FC = () => {
  const { activeWallet, activeSolanaWallet, activeBitcoinWallet, activeChain, isSolanaChain, isBitcoinChain } = useAuth()
  const [balance, setBalance] = useState('0.0000')
  const [isLoading, setIsLoading] = useState(false)
  const displayWallet = isBitcoinChain ? activeBitcoinWallet : isSolanaChain ? activeSolanaWallet : activeWallet

  useEffect(() => {
    setBalance(getEmptyBalance(isBitcoinChain))
  }, [activeChain?.id, displayWallet?.address, isBitcoinChain])

  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeChain?.rpcUrl) return

      if (isBitcoinChain) {
        if (!activeBitcoinWallet) return
        setIsLoading(true)
        try {
          const service = new BitcoinService(
            activeChain.rpcUrl,
            activeChain.network === 'testnet',
            bitcoinForkForChain(activeChain),
          )
          const bal = await service.getBalance(activeBitcoinWallet.address)
          setBalance(bal.toFixed(8))
        } catch (error) {
          console.error('Failed to fetch Bitcoin balance:', error)
          setBalance('0.00000000')
        } finally {
          setIsLoading(false)
        }
      } else if (isSolanaChain) {
        if (!activeSolanaWallet) return
        setIsLoading(true)
        try {
          const service = new SolanaService(activeChain.rpcUrl)
          const bal = await service.getBalance(activeSolanaWallet.address)
          setBalance(bal.toFixed(4))
        } catch (error) {
          console.error('Failed to fetch Solana balance:', error)
          setBalance('0.0000')
        } finally {
          setIsLoading(false)
        }
      } else {
        if (!activeWallet) return
        setIsLoading(true)
        try {
          const provider = new ethers.JsonRpcProvider(activeChain.rpcUrl)
          const balanceWei = await provider.getBalance(activeWallet.address)
          const balanceEth = ethers.formatEther(balanceWei)
          setBalance(parseFloat(balanceEth).toFixed(4))
        } catch (error) {
          console.error('Failed to fetch EVM balance:', error)
          setBalance('0.0000')
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 15000)
    return () => clearInterval(interval)
  }, [activeWallet, activeSolanaWallet, activeBitcoinWallet, activeChain, isSolanaChain, isBitcoinChain])

  if (!displayWallet) return null

  return (
    <div className="balance-display">
      <div className="balance-amount">
        <>
          {balance} <span className="currency-symbol">{activeChain.symbol || 'ETH'}</span>
        </>
      </div>
      <div className="balance-label">
        Total Balance
        {isLoading && <span className="loading-text">...</span>}
      </div>
    </div>
  )
}

export default BalanceDisplay
