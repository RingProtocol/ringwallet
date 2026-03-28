export type TxStatus = 'confirmed' | 'pending' | 'failed'

export interface TxRecord {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  status: TxStatus
}

export interface HistoryApiResponse {
  transactions: TxRecord[]
  source: string
  cachedAt: number
}

export interface HistoryCacheEntry {
  updatedAt: number
  transactions: TxRecord[]
}

export interface PendingTransactionEventDetail extends TxRecord {
  chainId: string
  address: string
}
