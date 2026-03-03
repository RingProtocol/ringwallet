import React, { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
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
  const { activeWallet, activeChain } = useAuth()
  const [tokens, setTokens] = useState<DisplayTokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedTokens, setImportedTokens] = useState<StoredTokenInfo[]>(() =>
    activeWallet && activeChain
      ? getTokenList(activeWallet.address, activeChain.id)
      : []
  )

  useEffect(() => {
    if (activeWallet && activeChain) {
      setImportedTokens(getTokenList(activeWallet.address, activeChain.id))
    }
  }, [activeWallet?.address, activeChain?.id])

  const handleImportToken = useCallback(
    (token: { address: string; symbol: string; name: string; decimals: number }) => {
      if (!activeWallet || !activeChain) return
      addToken(activeWallet.address, activeChain.id, token)
      setImportedTokens(getTokenList(activeWallet.address, activeChain.id))
    },
    [activeWallet, activeChain]
  )

  useEffect(() => {
    const fetchBalances = async () => {
      if (!activeWallet || !activeChain?.rpcUrl) return

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
  }, [activeWallet, activeChain, importedTokens])

  if (!activeWallet) return null

  return (
    <div className="token-balance-list">
      <div className="token-list-header">
        <span className="token-list-title">资产</span>
        <button
          type="button"
          className="token-import-btn"
          onClick={() => setShowImportDialog(true)}
        >
          导入
        </button>
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
      <ImportTokenDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportToken}
        rpcUrl={activeChain?.rpcUrl}
      />
    </div>
  )
}

export default TokenBalance
