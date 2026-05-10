import React from 'react'
import type { CardTransaction } from '../../types'
import CurrencyAmount from '../shared/CurrencyAmount'
import EmptyCardState from '../shared/EmptyCardState'
import '../Card.css'

interface Props {
  transactions: CardTransaction[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

const TRANSACTION_ICONS: Record<string, string> = {
  purchase: '\uD83D\uDED2',
  topup: '\u2B06\uFE0F',
  refund: '\uD83D\uDCB0',
  fee: '\uD83D\uDCB3',
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupByDate(
  transactions: CardTransaction[],
): Record<string, CardTransaction[]> {
  const groups: Record<string, CardTransaction[]> = {}
  for (const tx of transactions) {
    const key = formatDate(tx.timestamp)
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return groups
}

const TransactionList: React.FC<Props> = ({
  transactions,
  loading = false,
  hasMore = false,
  onLoadMore,
}) => {
  if (loading && transactions.length === 0) {
    return (
      <div className="transaction-list">
        <div className="transaction-list__loading">
          <div className="transaction-list__spinner" />
          <span>Loading transactions...</span>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="transaction-list">
        <EmptyCardState
          title="No Transactions"
          description="Your card transactions will appear here."
        />
      </div>
    )
  }

  const grouped = groupByDate(transactions)

  return (
    <div className="transaction-list">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date} className="transaction-list__group">
          <span className="transaction-list__group-date">{date}</span>
          <div className="transaction-list__group-items">
            {txs.map((tx) => {
              const isPositive = tx.type === 'topup' || tx.type === 'refund'
              const icon = TRANSACTION_ICONS[tx.type] || '\uD83D\uDCCB'
              const displayAmount = isPositive
                ? tx.amount
                : tx.amount

              return (
                <div key={tx.id} className="transaction-list__item">
                  <span className="transaction-list__item-icon">{icon}</span>
                  <div className="transaction-list__item-info">
                    <span className="transaction-list__item-merchant">
                      {tx.merchant || tx.type}
                    </span>
                    <span className="transaction-list__item-time">
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>
                  <CurrencyAmount
                    amount={displayAmount}
                    currency={tx.currency}
                    className={`transaction-list__item-amount ${
                      isPositive
                        ? 'transaction-list__item-amount--positive'
                        : 'transaction-list__item-amount--negative'
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {hasMore && onLoadMore && (
        <button
          type="button"
          className="transaction-list__load-more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}

export default TransactionList
