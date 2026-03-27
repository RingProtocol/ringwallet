import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './TransactionHistory.css'
import { useI18n } from '../i18n'

interface TxRecord {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  status: 'confirmed' | 'pending' | 'failed'
}

const TransactionHistory: React.FC = () => {
  const { activeWallet, activeChain } = useAuth()
  const { lang, t } = useI18n()
  const [transactions, setTransactions] = useState<TxRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!activeWallet || !activeChain) return

    setIsLoading(true)
    const timer = setTimeout(() => {
      setTransactions([])
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [activeWallet, activeChain])

  const formatAddress = (addr: string) =>
    addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : ''

  const explorerUrl = (hash: string) =>
    `${activeChain?.explorer || 'https://etherscan.io'}/tx/${hash}`

  if (!activeWallet) return null

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
              {tx.from.toLowerCase() === activeWallet.address.toLowerCase()
                ? '📤'
                : '📥'}
            </div>
            <div className="tx-detail">
              <span className="tx-peer">
                {tx.from.toLowerCase() === activeWallet.address.toLowerCase()
                  ? `To ${formatAddress(tx.to)}`
                  : `From ${formatAddress(tx.from)}`}
              </span>
              <span className="tx-time">
                {new Date(tx.timestamp * 1000).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
              </span>
            </div>
            <div className="tx-value">
              {tx.from.toLowerCase() === activeWallet.address.toLowerCase()
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
