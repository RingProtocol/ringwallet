// ─── Card Account ──────────────────────────────────────

/** Status of a card account in its lifecycle. */
export type CardStatus = 'pending_kyc' | 'active' | 'frozen' | 'closed'

/** Type of card issued to the user. */
export type CardType = 'virtual' | 'physical'

/** Represents a card account linked to the wallet. */
export interface CardAccount {
  id: string
  provider: string
  status: CardStatus
  type: CardType
  last4: string
  balance: string
  currency: string
  createdAt: number
  cardholderName: string
}

// ─── Card Transaction ─────────────────────────────────

/** Direction / nature of a card transaction. */
export type CardTransactionType = 'purchase' | 'topup' | 'refund' | 'fee'

/** Settlement status of a card transaction. */
export type CardTransactionStatus = 'pending' | 'completed' | 'failed'

/** A single transaction on a card. */
export interface CardTransaction {
  id: string
  cardId: string
  type: CardTransactionType
  amount: string
  currency: string
  merchant?: string
  status: CardTransactionStatus
  timestamp: number
}

// ─── KYC ──────────────────────────────────────────────

/** A KYC verification session returned by the provider. */
export interface KYCSession {
  sessionId: string
  url: string
  expiresAt: number
}

/** Current state of the user's KYC verification. */
export type KYCStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'rejected'

// ─── Top-up ───────────────────────────────────────────

/** Parameters required to initiate a crypto top-up. */
export interface TopUpParams {
  cardId: string
  asset: string
  chain: string
  amount: string
}

/** A top-up order awaiting on-chain execution. */
export interface TopUpOrder {
  id: string
  fromAddress: string
  toAddress: string
  asset: string
  chain: string
  amount: string
  gasEstimate?: string
  expiresAt: number
}

/** Result after a top-up transaction is submitted. */
export interface TopUpResult {
  orderId: string
  txHash: string
  status: TopUpStatus
  estimatedArrival: number
}

/** Lifecycle status of a top-up order. */
export type TopUpStatus = 'pending' | 'confirmed' | 'failed'

/** Metadata for an asset supported for top-up. */
export interface TopUpAsset {
  symbol: string
  chain: string
  balance: string
  decimals: number
  minAmount: string
  maxAmount: string
  estimatedFee: string
  processingTime: string
}

// ─── Card Detail ──────────────────────────────────────

/** Spending limit configuration for a card. */
export interface SpendingLimits {
  daily: string | null
  monthly: string | null
  perTransaction: string | null
}

/** Extended card information including sensitive details. */
export interface CardDetail extends CardAccount {
  cardNumber?: string
  cvc?: string
  expiryMonth?: number
  expiryYear?: number
  spendingLimits: SpendingLimits
  contactlessEnabled: boolean
}

// ─── Pagination ───────────────────────────────────────

/** Cursor-based pagination parameters. */
export interface PaginationParams {
  page: number
  pageSize: number
  cursor?: string
}

/** Generic paginated result wrapper. */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

// ─── Provider Config ──────────────────────────────────

/** Configuration needed to initialise a card provider. */
export interface ProviderConfig {
  apiKey: string
  apiSecret?: string
  environment: 'sandbox' | 'production'
  walletAddress: string
}

// ─── Reserved Extension Types ─────────────────────────

/** Contactless (NFC) payment configuration. */
export interface ContactlessConfig {
  enabled: boolean
  provisionUrl?: string
}

/** A multi-currency sub-account tied to a card. */
export interface CurrencyAccount {
  currency: string
  balance: string
  isDefault: boolean
}

/** Status of a physical card shipment. */
export interface PhysicalCardOrder {
  orderId: string
  status: 'ordered' | 'shipped' | 'delivered'
  trackingNumber?: string
  estimatedDelivery?: string
}
