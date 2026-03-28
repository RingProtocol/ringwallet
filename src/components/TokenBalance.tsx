import React, { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import { type Chain } from '../models/ChainType'
import { SolanaService } from '../services/solanaService'
import { BitcoinService, bitcoinForkForChain } from '../services/bitcoinService'
import { getTokenList, addToken, type TokenInfo as StoredTokenInfo } from '../utils/tokenStorage'
import ImportTokenDialog from './ImportTokenDialog'
import './TokenBalance.css'
import { useI18n } from '../i18n'

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

function buildPlaceholderTokens(
  activeChain: Chain | null | undefined,
  isSolanaChain: boolean,
  isBitcoinChain: boolean,
): DisplayTokenInfo[] {
  if (!activeChain) return []

  if (isBitcoinChain) {
    return [{ symbol: activeChain.symbol || 'BTC', name: activeChain.name, balance: '--', isNative: true }]
  }

  if (isSolanaChain) {
    return [{ symbol: 'SOL', name: activeChain.name, balance: '--', isNative: true }]
  }

  return [{ symbol: activeChain.symbol || 'ETH', name: activeChain.name, balance: '--', isNative: true }]
}

const TokenBalance: React.FC = () => {
  const { activeWallet, activeSolanaWallet, activeBitcoinWallet, activeChain, isSolanaChain, isBitcoinChain } = useAuth()
  const { t } = useI18n()
  const isEvmChain = !isSolanaChain && !isBitcoinChain
  const displayWallet = isBitcoinChain ? activeBitcoinWallet : isSolanaChain ? activeSolanaWallet : activeWallet
  const [tokens, setTokens] = useState<DisplayTokenInfo[]>(() =>
    buildPlaceholderTokens(activeChain, isSolanaChain, isBitcoinChain)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedTokens, setImportedTokens] = useState<StoredTokenInfo[]>(() =>
    activeWallet && activeChain && isEvmChain
      ? getTokenList(activeWallet.address, activeChain.id)
      : []
  )

  useEffect(() => {
    if (activeWallet && activeChain && isEvmChain) {
      setImportedTokens(getTokenList(activeWallet.address, activeChain.id))
    } else {
      setImportedTokens([])
    }
  }, [activeWallet?.address, activeChain?.id, isEvmChain])

  useEffect(() => {
    if (!displayWallet) {
      setTokens([])
      return
    }

    setTokens(buildPlaceholderTokens(activeChain, isSolanaChain, isBitcoinChain))
  }, [
    activeChain?.id,
    activeChain?.name,
    activeChain?.symbol,
    displayWallet?.address,
    isBitcoinChain,
    isSolanaChain,
  ])

  const handleImportToken = useCallback(
    (token: { address: string; symbol: string; name: string; decimals: number }) => {
      if (!activeWallet || !activeChain || !isEvmChain) return
      addToken(activeWallet.address, activeChain.id, token)
      setImportedTokens(getTokenList(activeWallet.address, activeChain.id))
    },
    [activeWallet, activeChain, isEvmChain]
  )

  // Bitcoin balance fetching
  useEffect(() => {
    if (!isBitcoinChain) return
    if (!activeBitcoinWallet || !activeChain?.rpcUrl) return

    const fetchBitcoinBalances = async () => {
      setIsLoading(true)
      try {
        const service = new BitcoinService(
          activeChain.rpcUrl,
          activeChain.network === 'testnet',
          bitcoinForkForChain(activeChain),
        )
        const bal = await service.getBalance(activeBitcoinWallet.address)
        setTokens([
          {
            symbol: activeChain.symbol || 'BTC',
            name: activeChain.name,
            balance: bal.toFixed(8),
            isNative: true,
          },
        ])
      } catch (error) {
        console.error('Failed to fetch Bitcoin balances:', error)
        setTokens([{ symbol: activeChain.symbol || 'BTC', name: activeChain.name, balance: '0.00000000', isNative: true }])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBitcoinBalances()
    const interval = setInterval(fetchBitcoinBalances, 15000)
    return () => clearInterval(interval)
  }, [activeBitcoinWallet, activeChain, isBitcoinChain])

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
    if (!isEvmChain) return
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
  }, [activeWallet, activeChain, importedTokens, isEvmChain])

  if (!displayWallet) return null

  return (
    <div className="token-balance-list">
      <div className="token-list-header">
        <span className="token-list-title">{t('assets')}</span>
        {isEvmChain && (
          <button
            type="button"
            className="token-import-btn"
            onClick={() => setShowImportDialog(true)}
          >
            {t('importToken')}
          </button>
        )}
      </div>
      {tokens.length === 0 ? (
        <div className="token-empty">{t('noTokensFound')}</div>
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
      {isLoading && tokens.length > 0 && (
        <div className="token-loading token-loading-inline">{t('loading')}</div>
      )}
      {isEvmChain && (
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
