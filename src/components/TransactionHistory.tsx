import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './TransactionHistory.css'
import { useI18n } from '../i18n'
import {
  HISTORY_EVENT_NAME,
  HISTORY_LIMIT,
  isHistoryCacheExpired,
  mergeTransactions,
  readHistoryCache,
  writeHistoryCache,
} from '../features/history/client'
import type { HistoryApiResponse, PendingTransactionEventDetail, TxRecord } from '../features/history/types'

const PENDING_POLL_INTERVAL_MS = 15 * 1000

const TransactionHistory: React.FC = () => {
  const { activeAccount, activeChain } = useAuth()
  const { lang, t } = useI18n()
  const [transactions, setTransactions] = useState<TxRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const pendingHashesRef = useRef<string[]>([])

  const chainId = activeChain ? String(activeChain.id) : ''
  const address = activeAccount?.address ?? ''

  useEffect(() => {
    pendingHashesRef.current = transactions
      .filter(tx => tx.status === 'pending')
      .map(tx => tx.hash)
      .slice(0, 5)
  }, [transactions])

  const persistTransactions = useCallback((nextTransactions: TxRecord[]) => {
    if (!chainId || !address) return
    writeHistoryCache(chainId, address, nextTransactions)
  }, [address, chainId])

  const updateTransactions = useCallback((updater: (current: TxRecord[]) => TxRecord[]) => {
    setTransactions(current => {
      const next = updater(current).slice(0, HISTORY_LIMIT)
      persistTransactions(next)
      return next
    })
  }, [persistTransactions])

  const fetchHistory = useCallback(async (showLoading: boolean) => {
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

      if (pendingHashesRef.current.length > 0) {
        searchParams.set('pending', pendingHashesRef.current.join(','))
      }

      const response = await fetch(`/api/v1/history?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`)
      }

      const payload = await response.json() as HistoryApiResponse
      updateTransactions(current => mergeTransactions(payload.transactions, current.filter(tx => tx.status === 'pending')))
    } catch (error) {
      console.error('[TransactionHistory] Failed to fetch history:', error)
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [activeChain, address, chainId, updateTransactions])

  useEffect(() => {
    if (!activeChain || !address) {
      setTransactions([])
      setIsLoading(false)
      return
    }

    const cached = readHistoryCache(chainId, address)
    if (!cached) {
      setTransactions([])
      void fetchHistory(true)
      return
    }

    setTransactions(cached.transactions)

    if (cached.transactions.some(tx => tx.status === 'pending') || isHistoryCacheExpired(cached)) {
      void fetchHistory(false)
    }
  }, [activeChain, address, chainId, fetchHistory])

  useEffect(() => {
    if (!activeChain || !address) return
    if (!transactions.some(tx => tx.status === 'pending')) return

    const timer = window.setInterval(() => {
      void fetchHistory(false)
    }, PENDING_POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [activeChain, address, fetchHistory, transactions])

  useEffect(() => {
    if (!activeChain || !address) return

    const handlePendingTransaction = (event: Event) => {
      const detail = (event as CustomEvent<PendingTransactionEventDetail>).detail
      if (!detail) return
      if (detail.chainId !== chainId) return
      if (detail.address.toLowerCase() !== address.toLowerCase()) return

      updateTransactions(current => mergeTransactions([detail], current))
      void fetchHistory(false)
    }

    window.addEventListener(HISTORY_EVENT_NAME, handlePendingTransaction)
    return () => window.removeEventListener(HISTORY_EVENT_NAME, handlePendingTransaction)
  }, [activeChain, address, chainId, fetchHistory, updateTransactions])

  const formatAddress = (addr: string) =>
    addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : ''

  const explorerUrl = (hash: string) =>
    `${activeChain?.explorer || 'https://etherscan.io'}/tx/${hash}`

  if (!activeAccount) return null

  return (
    <div className="tx-history">
      {isLoading ? (
        <div className="tx-loading">{t('loading')}</div>
      ) : transactions.length === 0 ? (
        <div className="tx-empty">
          <span className="tx-empty-icon">📭</span>
          <span>{t('noTransactions')}</span>
        </div>
      ) : (
        transactions.map((tx) => (
          <a
            key={tx.hash}
            href={explorerUrl(tx.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-row"
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
                {new Date(tx.timestamp * 1000).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
              </span>
            </div>
            <div className="tx-value">
              {tx.from.toLowerCase() === activeAccount.address.toLowerCase()
                ? `-${tx.value}`
                : `+${tx.value}`}{' '}
              <span className="tx-symbol">{activeChain?.symbol || 'ETH'}</span>
            </div>
          </a>
        ))
      )}
    </div>
  )
}

export default TransactionHistory
