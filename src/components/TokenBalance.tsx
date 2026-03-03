import React, { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import ImportTokenDialog, { type ImportedTokenInfo } from './ImportTokenDialog'
import './TokenBalance.css'

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
] as const

const IMPORTED_TOKENS_KEY = 'imported_tokens'

interface TokenInfo {
  symbol: string
  name: string
  balance: string
  isNative: boolean
  address?: string
  decimals?: number
}

function getImportedTokensStorageKey(chainId: number): string {
  return `${IMPORTED_TOKENS_KEY}_${chainId}`
}

function loadImportedTokens(chainId: number): ImportedTokenInfo[] {
  try {
    const raw = localStorage.getItem(getImportedTokensStorageKey(chainId))
    if (!raw) return []
    return JSON.parse(raw) as ImportedTokenInfo[]
  } catch {
    return []
  }
}

function saveImportedTokens(chainId: number, tokens: ImportedTokenInfo[]) {
  localStorage.setItem(getImportedTokensStorageKey(chainId), JSON.stringify(tokens))
}

const TokenBalance: React.FC = () => {
  const { activeWallet, activeChain } = useAuth()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedTokens, setImportedTokens] = useState<ImportedTokenInfo[]>(() =>
    activeChain ? loadImportedTokens(activeChain.id) : []
  )

  useEffect(() => {
    if (activeChain) {
      setImportedTokens(loadImportedTokens(activeChain.id))
    }
  }, [activeChain?.id])

  const handleImportToken = useCallback((token: ImportedTokenInfo) => {
    if (!activeChain) return
    const list = loadImportedTokens(activeChain.id)
    if (list.some((t) => t.address.toLowerCase() === token.address.toLowerCase())) return
    const next = [...list, token]
    saveImportedTokens(activeChain.id, next)
    setImportedTokens(next)
  }, [activeChain])

  useEffect(() => {
    const fetchBalances = async () => {
      if (!activeWallet || !activeChain?.rpcUrl) return

      setIsLoading(true)
      try {
        const provider = new ethers.JsonRpcProvider(activeChain.rpcUrl)
        const balanceWei = await provider.getBalance(activeWallet.address)
        const balanceEth = ethers.formatEther(balanceWei)

        const nativeToken: TokenInfo = {
          symbol: activeChain.symbol || 'ETH',
          name: activeChain.name,
          balance: parseFloat(balanceEth).toFixed(4),
          isNative: true,
        }

        const erc20Tokens: TokenInfo[] = await Promise.all(
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
