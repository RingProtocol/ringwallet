import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { BALANCE_POLL_INTERVAL_MS } from '../config/uiTiming'
import { ChainFamily, getPrimaryRpcUrl } from '../models/ChainType'
import { SolanaService } from '../services/solanaService'
import { BitcoinService, bitcoinForkForChain } from '../services/bitcoinService'
import { tronAddressToHex } from '../services/chainplugins/tron/tronPlugin'
import { RpcService } from '../services/rpc/rpcService'
import { notifyBalanceChange } from '../services/devices/notificationService'
import ChainIcon from './ChainIcon'
import './BalanceDisplay.css'

function getEmptyBalance(isBitcoinChain: boolean): string {
  return isBitcoinChain ? '0.00000000' : '0.0000'
}

function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const BalanceDisplay: React.FC = () => {
  const {
    activeWallet,
    activeSolanaWallet,
    activeBitcoinWallet,
    activeChain,
    activeAccount,
    isSolanaChain,
    isBitcoinChain,
  } = useAuth()
  const isEvmChain =
    activeChain?.family === ChainFamily.EVM || !activeChain?.family
  const isTronChain = activeChain?.family === ChainFamily.Tron
  const [balance, setBalance] = useState('0.0000')
  const observedBalanceRef = useRef<string | null>(null)

  useEffect(() => {
    setBalance(getEmptyBalance(isBitcoinChain))
    observedBalanceRef.current = null
  }, [activeChain?.id, activeAccount?.address, isBitcoinChain])

  useEffect(() => {
    const commitBalance = (
      next: string,
      {
        notifyOnChange = false,
        recordObserved = true,
      }: { notifyOnChange?: boolean; recordObserved?: boolean } = {}
    ) => {
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

      setBalance((prev) => (prev === next ? prev : next))
    }

    const fetchBalance = async () => {
      const rpcUrl = getPrimaryRpcUrl(activeChain)
      if (!rpcUrl) return

      if (isBitcoinChain) {
        if (!activeBitcoinWallet) return
        try {
          const service = new BitcoinService(
            rpcUrl,
            activeChain.network === 'testnet',
            bitcoinForkForChain(activeChain)
          )
          const bal = await service.getBalance(activeBitcoinWallet.address)
          commitBalance(bal.toFixed(8), { notifyOnChange: true })
        } catch (error) {
          console.error('Failed to fetch Bitcoin balance:', error)
          commitBalance('0.00000000', { recordObserved: false })
        }
      } else if (isSolanaChain) {
        if (!activeSolanaWallet) return
        try {
          const service = new SolanaService(rpcUrl)
          const bal = await service.getBalance(activeSolanaWallet.address)
          commitBalance(bal.toFixed(4), { notifyOnChange: true })
        } catch (error) {
          console.error('Failed to fetch Solana balance:', error)
          commitBalance('0.0000', { recordObserved: false })
        }
      } else if (isEvmChain) {
        if (!activeWallet) return
        try {
          const evmService = RpcService.fromChain(activeChain).getEvmService()
          const bal = await evmService.getFormattedBalance(activeWallet.address)
          commitBalance(parseFloat(bal).toFixed(4), {
            notifyOnChange: true,
          })
        } catch (error) {
          console.error('Failed to fetch EVM balance:', error)
          commitBalance('0.0000', { recordObserved: false })
        }
      } else if (isTronChain) {
        if (!activeAccount) return
        try {
          const evmService = RpcService.fromChain(activeChain).getEvmService()
          const hexAddr = tronAddressToHex(activeAccount.address)
          const bal = await evmService.getFormattedBalance(hexAddr)
          commitBalance(parseFloat(bal).toFixed(4), {
            notifyOnChange: true,
          })
        } catch (error) {
          console.error('Failed to fetch Tron balance:', error)
          commitBalance('0.0000', { recordObserved: false })
        }
      } else {
        commitBalance('0.0000', { recordObserved: false })
      }
    }

    if (isBitcoinChain || isSolanaChain || isEvmChain || isTronChain) {
      fetchBalance()
      const interval = setInterval(fetchBalance, BALANCE_POLL_INTERVAL_MS)
      return () => clearInterval(interval)
    }

    void fetchBalance()
  }, [
    activeWallet,
    activeSolanaWallet,
    activeBitcoinWallet,
    activeAccount,
    activeChain,
    isSolanaChain,
    isBitcoinChain,
    isEvmChain,
    isTronChain,
  ])

  if (!activeAccount) return null

  return (
    <div className="balance-display">
      <div className="balance-amount">
        {balance}{' '}
        <span className="currency-symbol">
          <ChainIcon
            icon={activeChain.icon}
            symbol={activeChain.symbol || 'ETH'}
            size={20}
          />
          {activeChain.symbol || 'ETH'}
        </span>
      </div>
      {activeAccount?.address && (
        <div className="wallet-address">
          {shortenAddress(activeAccount.address)}
        </div>
      )}
    </div>
  )
}

export default BalanceDisplay
