import React, { useState, useEffect, useCallback } from 'react'
import { Connection } from '@solana/web3.js'
import { useAuth } from '../contexts/AuthContext'
import { BALANCE_POLL_INTERVAL_MS } from '../config/uiTiming'
import { ChainFamily, getPrimaryRpcUrl, type Chain } from '../models/ChainType'
import { SolanaService } from '../services/solanaService'
import { SolanaTokenService } from '../services/solanaTokenService'
import { BitcoinService, bitcoinForkForChain } from '../services/bitcoinService'
import { tronAddressToHex } from '../services/chainplugins/tron/tronPlugin'
import RpcService from '../services/rpc/rpcService'
import {
  getTokenList,
  addToken,
  type TokenInfo as StoredTokenInfo,
} from '../utils/tokenStorage'
import ImportTokenDialog from './ImportTokenDialog'
import ChainIcon from './ChainIcon'
import './TokenBalance.css'
import { useI18n } from '../i18n'

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
  isBitcoinChain: boolean
): DisplayTokenInfo[] {
  if (!activeChain) return []

  if (isBitcoinChain) {
    return [
      {
        symbol: activeChain.symbol || 'BTC',
        name: activeChain.name,
        balance: '--',
        isNative: true,
      },
    ]
  }

  if (isSolanaChain) {
    return [
      { symbol: 'SOL', name: activeChain.name, balance: '--', isNative: true },
    ]
  }

  return [
    {
      symbol: activeChain.symbol || 'ETH',
      name: activeChain.name,
      balance: '--',
      isNative: true,
    },
  ]
}

interface TokenBalanceProps {
  onTokenSend?: (token: DisplayTokenInfo) => void
}

const TokenBalance: React.FC<TokenBalanceProps> = ({ onTokenSend }) => {
  const {
    activeWallet,
    activeSolanaWallet,
    activeBitcoinWallet,
    activeChain,
    activeAccount,
    isSolanaChain,
    isBitcoinChain,
  } = useAuth()
  const { t } = useI18n()
  const isEvmChain =
    activeChain?.family === ChainFamily.EVM || !activeChain?.family
  const [tokens, setTokens] = useState<DisplayTokenInfo[]>(() =>
    buildPlaceholderTokens(activeChain, isSolanaChain, isBitcoinChain)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const supportsTokens = !isBitcoinChain
  const [importedTokens, setImportedTokens] = useState<StoredTokenInfo[]>(() =>
    activeAccount && activeChain && supportsTokens
      ? getTokenList(activeAccount.address, activeChain.id)
      : []
  )

  useEffect(() => {
    if (activeAccount && activeChain && supportsTokens) {
      setImportedTokens(getTokenList(activeAccount.address, activeChain.id))
    } else {
      setImportedTokens([])
    }
  }, [activeAccount?.address, activeChain?.id, supportsTokens])

  useEffect(() => {
    if (!activeAccount || !activeChain || !supportsTokens) return

    const handleTokensUpdated = () => {
      setImportedTokens(getTokenList(activeAccount.address, activeChain.id))
    }

    window.addEventListener('ring:tokens-updated', handleTokensUpdated)
    return () =>
      window.removeEventListener('ring:tokens-updated', handleTokensUpdated)
  }, [activeAccount?.address, activeChain?.id, supportsTokens])

  useEffect(() => {
    if (!activeAccount) {
      setTokens([])
      return
    }

    setTokens(
      buildPlaceholderTokens(activeChain, isSolanaChain, isBitcoinChain)
    )
  }, [
    activeChain?.id,
    activeChain?.name,
    activeChain?.symbol,
    activeAccount?.address,
    isBitcoinChain,
    isSolanaChain,
  ])

  const handleImportToken = useCallback(
    (token: {
      address: string
      symbol: string
      name: string
      decimals: number
    }) => {
      if (!activeAccount || !activeChain || !supportsTokens) return
      addToken(activeAccount.address, activeChain.id, token)
      setImportedTokens(getTokenList(activeAccount.address, activeChain.id))
    },
    [activeAccount, activeChain, supportsTokens]
  )

  // Bitcoin balance fetching
  useEffect(() => {
    if (!isBitcoinChain) return
    const rpcUrl = getPrimaryRpcUrl(activeChain)
    if (!activeBitcoinWallet || !rpcUrl) return

    const fetchBitcoinBalances = async () => {
      setIsLoading(true)
      try {
        const service = new BitcoinService(
          rpcUrl,
          activeChain.network === 'testnet',
          bitcoinForkForChain(activeChain)
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
        setTokens([
          {
            symbol: activeChain.symbol || 'BTC',
            name: activeChain.name,
            balance: '0.00000000',
            isNative: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBitcoinBalances()
    const interval = setInterval(fetchBitcoinBalances, BALANCE_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeBitcoinWallet, activeChain, isBitcoinChain])

  // Solana balance fetching
  useEffect(() => {
    if (!isSolanaChain) return
    const rpcUrl = getPrimaryRpcUrl(activeChain)
    if (!activeSolanaWallet || !rpcUrl) return

    const fetchSolanaBalances = async () => {
      setIsLoading(true)
      try {
        const solService = new SolanaService(rpcUrl)
        const bal = await solService.getBalance(activeSolanaWallet.address)

        const nativeToken: DisplayTokenInfo = {
          symbol: 'SOL',
          name: activeChain.name,
          balance: bal.toFixed(4),
          isNative: true,
        }

        const splTokens: DisplayTokenInfo[] = await Promise.all(
          importedTokens.map(async (t) => {
            try {
              const connection = new Connection(rpcUrl, 'confirmed')
              const tokenService = new SolanaTokenService(connection)
              const balance = await tokenService.getTokenBalance(
                activeSolanaWallet.address,
                t.address
              )
              return {
                symbol: t.symbol,
                name: t.name,
                balance: parseFloat(balance).toFixed(4),
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

        setTokens([nativeToken, ...splTokens])
      } catch (error) {
        console.error('Failed to fetch Solana balances:', error)
        setTokens([
          {
            symbol: 'SOL',
            name: activeChain.name,
            balance: '0.0000',
            isNative: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSolanaBalances()
    const interval = setInterval(fetchSolanaBalances, BALANCE_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeSolanaWallet, activeChain, importedTokens, isSolanaChain])

  // EVM balance fetching
  useEffect(() => {
    if (!isEvmChain) return
    const rpcUrl = getPrimaryRpcUrl(activeChain)
    if (!activeWallet || !rpcUrl) return

    const fetchEVMBalances = async () => {
      setIsLoading(true)
      try {
        const evmRpcService = RpcService.fromChain(activeChain).getEvmService()
        const balanceEth = await evmRpcService.getFormattedBalance(
          activeWallet.address
        )

        const nativeToken: DisplayTokenInfo = {
          symbol: activeChain.symbol || 'ETH',
          name: activeChain.name,
          balance: parseFloat(balanceEth).toFixed(4),
          isNative: true,
        }

        const erc20Tokens: DisplayTokenInfo[] = await Promise.all(
          importedTokens.map(async (t) => {
            try {
              const formatted = await evmRpcService.getFormattedTokenBalance(
                t.address,
                activeWallet.address,
                t.decimals
              )
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
    const interval = setInterval(fetchEVMBalances, BALANCE_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeWallet, activeChain, importedTokens, isEvmChain])

  // Tron balance fetching (TronGrid /jsonrpc is EVM-compatible)
  const isTronChain = activeChain?.family === ChainFamily.Tron
  useEffect(() => {
    if (!isTronChain) return
    if (!activeAccount || !activeChain) return

    const fetchTronBalances = async () => {
      setIsLoading(true)
      try {
        const evmRpcService = RpcService.fromChain(activeChain).getEvmService()
        const hexWallet = tronAddressToHex(activeAccount.address)
        const balanceRaw = await evmRpcService.getFormattedBalance(hexWallet)

        const nativeToken: DisplayTokenInfo = {
          symbol: activeChain.symbol || 'TRX',
          name: activeChain.name,
          balance: parseFloat(balanceRaw).toFixed(4),
          isNative: true,
        }

        const trc20Tokens: DisplayTokenInfo[] = await Promise.all(
          importedTokens.map(async (t) => {
            try {
              const hexToken = tronAddressToHex(t.address)
              const formatted = await evmRpcService.getFormattedTokenBalance(
                hexToken,
                hexWallet,
                t.decimals
              )
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

        setTokens([nativeToken, ...trc20Tokens])
      } catch (error) {
        console.error('Failed to fetch Tron token balances:', error)
        setTokens([
          {
            symbol: activeChain.symbol || 'TRX',
            name: activeChain.name,
            balance: '0.0000',
            isNative: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTronBalances()
    const interval = setInterval(fetchTronBalances, BALANCE_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeAccount, activeChain, importedTokens, isTronChain])

  // Cosmos: show discovered tokens with placeholder balance (no balance service yet)
  const isCosmosChain = activeChain?.family === ChainFamily.Cosmos
  useEffect(() => {
    if (!isCosmosChain) return
    if (!activeAccount || !activeChain) return
    if (importedTokens.length === 0) return

    setTokens((current) => {
      const nativeToken =
        current.find((t) => t.isNative) ??
        buildPlaceholderTokens(activeChain, false, false)[0]
      if (!nativeToken) return current

      const tokenEntries: DisplayTokenInfo[] = importedTokens.map((t) => ({
        symbol: t.symbol,
        name: t.name,
        balance: '--',
        isNative: false,
        address: t.address,
        decimals: t.decimals,
      }))
      return [nativeToken, ...tokenEntries]
    })
  }, [activeAccount, activeChain, importedTokens, isCosmosChain])

  if (!activeAccount) return null

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
            className={`token-row${!token.isNative && onTokenSend ? ' token-row--clickable' : ''}`}
            onClick={
              !token.isNative && onTokenSend
                ? () => onTokenSend(token)
                : undefined
            }
          >
            <div className="token-icon-wrap">
              {token.isNative && activeChain?.icon ? (
                <ChainIcon
                  icon={activeChain.icon}
                  symbol={token.symbol}
                  size={38}
                />
              ) : (
                <span className="token-icon-placeholder">
                  {token.symbol.charAt(0)}
                </span>
              )}
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
          chain={activeChain}
        />
      )}
    </div>
  )
}

export default TokenBalance
