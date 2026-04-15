import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './TransactionHistory.css'
import { useI18n } from '../i18n'
import { TESTID } from './testids'
import { ChainFamily } from '../models/ChainType'
import {
  HISTORY_EVENT_NAME,
  HISTORY_LIMIT,
  mergeTransactions,
  readHistoryCache,
  writeHistoryCache,
} from '../features/history/client'
import {
  getTxRecordKey,
  type HistoryApiResponse,
  type PendingTransactionEventDetail,
  type TxRecord,
} from '../features/history/types'
import RpcService from '../services/rpc/rpcService'
import { resolveClientApiUrl } from '../utils/apiUrl'
import { addToken, getTokenList } from '../utils/tokenStorage'
import { resolveTokenMetadata } from '../services/rpc/tokenMetadataResolver'

export type TransactionHistoryAssetFilter =
  | { kind: 'native' }
  | { kind: 'erc20'; address: string }

const PENDING_POLL_INTERVAL_MS = 8 * 1000
const HISTORY_POLL_INTERVAL_MS = 15 * 1000

function logError(...args: unknown[]): void {
  globalThis.console.error(...args)
}

async function discoverTokensFromHistory(
  transactions: TxRecord[],
  chainId: string | number,
  walletAddress: string,
  chain: { family?: ChainFamily; rpcUrl: string[] }
): Promise<void> {
  if (
    chain.family === ChainFamily.Bitcoin ||
    chain.family === ChainFamily.Dogecoin
  )
    return

  const tokenTxs = transactions.filter(
    (tx) => tx.assetType === 'token' && tx.assetAddress
  )
  if (tokenTxs.length === 0) return

  const knownAddresses = new Set(
    getTokenList(walletAddress, chainId).map((t) => t.address.toLowerCase())
  )

  // Collect unique new token addresses with their best-available hints
  const newTokenMap = new Map<
    string,
    { symbol?: string; name?: string; decimals?: number }
  >()
  for (const tx of tokenTxs) {
    const addr = tx.assetAddress!.toLowerCase()
    if (knownAddresses.has(addr) || newTokenMap.has(addr)) continue
    newTokenMap.set(addr, {
      symbol: tx.assetSymbol,
      name: tx.assetName,
      decimals: tx.assetDecimals,
    })
  }
  if (newTokenMap.size === 0) return

  const results = await Promise.allSettled(
    [...newTokenMap.entries()].map(async ([addr, hints]) => {
      const meta = await resolveTokenMetadata(
        chain.family,
        addr,
        chain.rpcUrl,
        hints
      )
      if (!meta) return false
      addToken(walletAddress, chainId, {
        address: addr,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
      })
      return true
    })
  )

  if (results.some((r) => r.status === 'fulfilled' && r.value)) {
    window.dispatchEvent(new CustomEvent('ring:tokens-updated'))
  }
}

function transactionMatchesAssetFilter(
  tx: TxRecord,
  filter: TransactionHistoryAssetFilter
): boolean {
  if (filter.kind === 'native') {
    return tx.assetType !== 'token'
  }
  const want = filter.address.toLowerCase()
  return tx.assetType === 'token' && tx.assetAddress?.toLowerCase() === want
}

interface TransactionHistoryProps {
  /** When set, only rows for this asset (e.g. token detail activity). */
  assetFilter?: TransactionHistoryAssetFilter
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  assetFilter,
}) => {
  const { activeAccount, activeChain } = useAuth()
  const { lang, t } = useI18n()
  const [transactions, setTransactions] = useState<TxRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const pendingHashesRef = useRef<string[]>([])

  const chainId = activeChain ? String(activeChain.id) : ''
  const address = activeAccount?.address ?? ''

  useEffect(() => {
    pendingHashesRef.current = transactions
      .filter((tx) => tx.status === 'pending')
      .map((tx) => tx.hash)
      .slice(0, 5)
  }, [transactions])

  const persistTransactions = useCallback(
    (nextTransactions: TxRecord[]) => {
      if (!chainId || !address) return
      writeHistoryCache(chainId, address, nextTransactions)
    },
    [address, chainId]
  )

  const updateTransactions = useCallback(
    (updater: (current: TxRecord[]) => TxRecord[]) => {
      setTransactions((current) => {
        const next = updater(current).slice(0, HISTORY_LIMIT)
        persistTransactions(next)
        return next
      })
    },
    [persistTransactions]
  )

  //if activity is empty, search one time from etherscan;
  //otherwise, poll from blockchain every 8 seconds
  const fetchHistoryFromAPI = useCallback(
    async (showLoading: boolean) => {
      if (!activeChain || !address) return

      if (showLoading) {
        setIsLoading(true)
      }

      try {
        const searchParams = new URLSearchParams({
          chainId,
          address,
          limit: String(HISTORY_LIMIT),
        })

        const url = resolveClientApiUrl('/api/v1/history')
        url.search = searchParams.toString()

        const response = await fetch(url.toString())
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.status}`)
        }

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          const body = await response.text()
          throw new Error(
            `Expected JSON but received ${contentType || 'unknown'}: ${body.slice(0, 120)}`
          )
        }

        const payload = (await response.json()) as HistoryApiResponse
        updateTransactions((current) =>
          mergeTransactions(current, payload.transactions)
        )
        void discoverTokensFromHistory(
          payload.transactions,
          chainId,
          address,
          activeChain
        )
      } catch (error) {
        logError('[TransactionHistory] Failed to fetch history:', error)
      } finally {
        if (showLoading) {
          setIsLoading(false)
        }
      }
    },
    [activeChain, address, chainId, updateTransactions]
  )

  const fetchHistoryFromChain = useCallback(async () => {
    if (!activeChain || !address) return
    if (activeChain.family !== ChainFamily.EVM) return
    if (pendingHashesRef.current.length === 0) return

    try {
      const evmRpcService = RpcService.fromChain(activeChain).getEvmService()
      const payload = await evmRpcService.fetchHistoryFromChain(
        pendingHashesRef.current
      )
      updateTransactions((current) => mergeTransactions(current, payload))
    } catch (error) {
      logError(
        '[TransactionHistory] Failed to fetch history from chain:',
        error
      )
    }
  }, [activeChain, address, updateTransactions])

  useEffect(() => {
    if (!activeChain || !address) {
      setTransactions([])
      setIsLoading(false)
      return
    }

    const cached = readHistoryCache(chainId, address)
    if (!cached) {
      setTransactions([])
      void fetchHistoryFromAPI(true)
      return
    }

    setTransactions(cached.transactions)

    if (cached.transactions.length === 0) {
      void fetchHistoryFromAPI(false)
      return
    }

    if (cached.transactions.some((tx) => tx.status === 'pending')) {
      void fetchHistoryFromChain()
    }
  }, [
    activeChain,
    address,
    chainId,
    fetchHistoryFromAPI,
    fetchHistoryFromChain,
  ])

  useEffect(() => {
    if (!activeChain || !address) return
    if (!transactions.some((tx) => tx.status === 'pending')) return

    const timer = window.setInterval(() => {
      void fetchHistoryFromChain()
    }, PENDING_POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [activeChain, address, fetchHistoryFromChain, transactions])

  // Poll history API: immediately on mount, then every 15s
  useEffect(() => {
    if (!activeChain || !address) return

    void fetchHistoryFromAPI(false)

    const timer = window.setInterval(() => {
      void fetchHistoryFromAPI(false)
    }, HISTORY_POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [activeChain, address, fetchHistoryFromAPI])

  useEffect(() => {
    if (!activeChain || !address) return

    const handlePendingTransaction = (event: Event) => {
      const detail = (event as CustomEvent<PendingTransactionEventDetail>)
        .detail
      if (!detail) return
      if (detail.chainId !== chainId) return
      if (detail.address.toLowerCase() !== address.toLowerCase()) return

      updateTransactions((current) => mergeTransactions([detail], current))
      void fetchHistoryFromChain()
    }

    window.addEventListener(HISTORY_EVENT_NAME, handlePendingTransaction)
    return () =>
      window.removeEventListener(HISTORY_EVENT_NAME, handlePendingTransaction)
  }, [activeChain, address, chainId, fetchHistoryFromChain, updateTransactions])

  const formatAddress = (addr: string) =>
    addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : ''

  const formatAssetLabel = (tx: TxRecord) => {
    if (tx.assetType !== 'token') {
      return activeChain?.symbol || 'ETH'
    }

    const symbol = tx.assetSymbol?.trim()
    if (symbol) return symbol

    return tx.assetAddress ? formatAddress(tx.assetAddress) : 'Token'
  }

  const formatAssetMeta = (tx: TxRecord) => {
    if (tx.assetType !== 'token') return ''
    if (tx.assetName?.trim()) return tx.assetName
    if (tx.assetAddress) return formatAddress(tx.assetAddress)
    return 'ERC20'
  }

  const formatDisplayValue = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return value

    const [integerPart, fractionPart] = trimmed.split('.')
    if (!fractionPart || fractionPart.length <= 4) return trimmed

    return `${integerPart}.${fractionPart.slice(0, 4)}`
  }

  const explorerUrl = (hash: string) =>
    `${activeChain?.explorer || 'https://etherscan.io'}/tx/${hash}`

  if (!activeAccount) return null

  const visibleTransactions = assetFilter
    ? transactions.filter((tx) =>
        transactionMatchesAssetFilter(tx, assetFilter)
      )
    : transactions

  return (
    <div className="tx-history" data-testid={TESTID.TX_HISTORY}>
      {isLoading ? (
        <div className="tx-loading" data-testid={TESTID.TX_LOADING}>
          {t('loading')}
        </div>
      ) : visibleTransactions.length === 0 ? (
        <div className="tx-empty" data-testid={TESTID.TX_EMPTY}>
          <span className="tx-empty-icon">📭</span>
          <span>{t('noTransactions')}</span>
        </div>
      ) : (
        visibleTransactions.map((tx) => (
          <a
            key={getTxRecordKey(tx)}
            href={explorerUrl(tx.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-row"
            data-testid={TESTID.TX_ROW}
          >
            <div className="tx-direction">
              {tx.from.toLowerCase() === activeAccount.address.toLowerCase()
                ? '📤'
                : '📥'}
            </div>
            <div className="tx-detail">
              <span className="tx-peer">
                {tx.from.toLowerCase() === activeAccount.address.toLowerCase()
                  ? `To ${formatAddress(tx.to)}`
                  : `From ${formatAddress(tx.from)}`}
              </span>
              <span className="tx-time">
                {new Date(tx.timestamp * 1000).toLocaleString(
                  lang === 'zh' ? 'zh-CN' : 'en-US'
                )}
              </span>
              {formatAssetMeta(tx) && (
                <span className="tx-asset">{formatAssetMeta(tx)}</span>
              )}
            </div>
            <div className="tx-value">
              {tx.from.toLowerCase() === activeAccount.address.toLowerCase()
                ? `-${formatDisplayValue(tx.value)}`
                : `+${formatDisplayValue(tx.value)}`}{' '}
              <span className="tx-symbol">{formatAssetLabel(tx)}</span>
            </div>
          </a>
        ))
      )}
    </div>
  )
}

export default TransactionHistory
