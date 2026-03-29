export type TxStatus = 'confirmed' | 'pending' | 'failed'

export interface TxRecord {
  id?: string
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  status: TxStatus
  assetSymbol?: string
  assetName?: string
  assetAddress?: string
  assetType?: 'native' | 'token'
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

export function getTxRecordKey(tx: TxRecord): string {
  return tx.id?.trim() || tx.hash.toLowerCase()
}
