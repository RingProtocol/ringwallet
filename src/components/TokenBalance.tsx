import React, { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import { ChainFamily } from '../models/ChainType'
import { SolanaService } from '../services/solanaService'
import { getTokenList, addToken, type TokenInfo as StoredTokenInfo } from '../utils/tokenStorage'
import ImportTokenDialog from './ImportTokenDialog'
import './TokenBalance.css'

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
] as const

interface DisplayTokenInfo {
  symbol: string
  name: string
  balance: string
  isNative: boolean
  address?: string
  decimals?: number
}

const TokenBalance: React.FC = () => {
  const { activeWallet, activeSolanaWallet, activeChain, isSolanaChain } = useAuth()
  const [tokens, setTokens] = useState<DisplayTokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedTokens, setImportedTokens] = useState<StoredTokenInfo[]>(() =>
    activeWallet && activeChain && !isSolanaChain
      ? getTokenList(activeWallet.address, activeChain.id)
      : []
  )

  useEffect(() => {
    if (activeWallet && activeChain && !isSolanaChain) {
      setImportedTokens(getTokenList(activeWallet.address, activeChain.id))
    } else {
      setImportedTokens([])
    }
  }, [activeWallet?.address, activeChain?.id, isSolanaChain])

  const handleImportToken = useCallback(
    (token: { address: string; symbol: string; name: string; decimals: number }) => {
      if (!activeWallet || !activeChain || isSolanaChain) return
      addToken(activeWallet.address, activeChain.id, token)
      setImportedTokens(getTokenList(activeWallet.address, activeChain.id))
    },
    [activeWallet, activeChain, isSolanaChain]
  )

  // Solana balance fetching
  useEffect(() => {
    if (!isSolanaChain) return
    if (!activeSolanaWallet || !activeChain?.rpcUrl) return

    const fetchSolanaBalances = async () => {
      setIsLoading(true)
      try {
        const service = new SolanaService(activeChain.rpcUrl)
        const bal = await service.getBalance(activeSolanaWallet.address)
        setTokens([
          {
            symbol: 'SOL',
            name: activeChain.name,
            balance: bal.toFixed(4),
            isNative: true,
          },
        ])
      } catch (error) {
        console.error('Failed to fetch Solana balances:', error)
        setTokens([{ symbol: 'SOL', name: activeChain.name, balance: '0.0000', isNative: true }])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSolanaBalances()
    const interval = setInterval(fetchSolanaBalances, 15000)
    return () => clearInterval(interval)
  }, [activeSolanaWallet, activeChain, isSolanaChain])

  // EVM balance fetching
  useEffect(() => {
    if (isSolanaChain) return
    if (!activeWallet || !activeChain?.rpcUrl) return

    const fetchEVMBalances = async () => {
      setIsLoading(true)
      try {
        const provider = new ethers.JsonRpcProvider(activeChain.rpcUrl)
        const balanceWei = await provider.getBalance(activeWallet.address)
        const balanceEth = ethers.formatEther(balanceWei)

        const nativeToken: DisplayTokenInfo = {
          symbol: activeChain.symbol || 'ETH',
          name: activeChain.name,
          balance: parseFloat(balanceEth).toFixed(4),
          isNative: true,
        }

        const erc20Tokens: DisplayTokenInfo[] = await Promise.all(
          importedTokens.map(async (t) => {
            try {
              const contract = new ethers.Contract(t.address, ERC20_ABI, provider)
              const bal = await contract.balanceOf(activeWallet.address)
              const formatted = ethers.formatUnits(bal, t.decimals)
              return {
                symbol: t.symbol,
                name: t.name,
                balance: parseFloat(formatted).toFixed(4),
                isNative: false,
                address: t.address,
                decimals: t.decimals,
              }
            } catch {
              return {
                symbol: t.symbol,
                name: t.name,
                balance: '0.0000',
                isNative: false,
                address: t.address,
                decimals: t.decimals,
              }
            }
          })
        )

        setTokens([nativeToken, ...erc20Tokens])
      } catch (error) {
        console.error('Failed to fetch EVM token balances:', error)
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

    fetchEVMBalances()
    const interval = setInterval(fetchEVMBalances, 15000)
    return () => clearInterval(interval)
  }, [activeWallet, activeChain, importedTokens, isSolanaChain])

  const displayWallet = isSolanaChain ? activeSolanaWallet : activeWallet
  if (!displayWallet) return null

  return (
    <div className="token-balance-list">
      <div className="token-list-header">
        <span className="token-list-title">资产</span>
        {!isSolanaChain && (
          <button
            type="button"
            className="token-import-btn"
            onClick={() => setShowImportDialog(true)}
          >
            导入
          </button>
        )}
      </div>
      {isLoading && tokens.length === 0 ? (
        <div className="token-loading">Loading...</div>
      ) : tokens.length === 0 ? (
        <div className="token-empty">No tokens found</div>
      ) : (
        tokens.map((token) => (
          <div
            key={token.isNative ? 'native' : token.address}
            className="token-row"
          >
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
      {!isSolanaChain && (
        <ImportTokenDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportToken}
          rpcUrl={activeChain?.rpcUrl}
        />
      )}
    </div>
  )
}

export default TokenBalance
