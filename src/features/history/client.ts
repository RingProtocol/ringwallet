import { safeGetItem, safeSetItem } from '../../utils/safeStorage'
import {
  getTxRecordKey,
  type HistoryCacheEntry,
  type PendingTransactionEventDetail,
  type TxRecord,
} from './types'

export const HISTORY_EVENT_NAME = 'ring:pending-transaction'
export const HISTORY_LIMIT = 8
export const HISTORY_CACHE_TTL_MS = 60 * 60 * 1000

function getHistoryCacheKey(chainId: string, address: string): string {
  return `ring_history_v1:${chainId}:${address.toLowerCase()}`
}

export function readHistoryCache(
  chainId: string,
  address: string
): HistoryCacheEntry | null {
  const raw = safeGetItem(getHistoryCacheKey(chainId, address))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as HistoryCacheEntry
    if (
      !parsed ||
      !Array.isArray(parsed.transactions) ||
      typeof parsed.updatedAt !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeHistoryCache(
  chainId: string,
  address: string,
  transactions: TxRecord[]
): void {
  const payload: HistoryCacheEntry = {
    updatedAt: Date.now(),
    transactions,
  }
  safeSetItem(getHistoryCacheKey(chainId, address), JSON.stringify(payload))
}

export function isHistoryCacheExpired(cache: HistoryCacheEntry): boolean {
  return Date.now() - cache.updatedAt >= HISTORY_CACHE_TTL_MS
}

export function mergeTransactions(...groups: TxRecord[][]): TxRecord[] {
  const merged = new Map<string, TxRecord>()

  for (const group of groups) {
    for (const tx of group) {
      merged.set(getTxRecordKey(tx), tx)
    }
  }

  return [...merged.values()].sort((left, right) => {
    if (left.status === 'pending' && right.status !== 'pending') return -1
    if (left.status !== 'pending' && right.status === 'pending') return 1
    return right.timestamp - left.timestamp
  })
}

export function emitPendingTransaction(
  detail: PendingTransactionEventDetail
): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HISTORY_EVENT_NAME, { detail }))
}
