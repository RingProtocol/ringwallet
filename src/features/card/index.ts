// ─── Types ────────────────────────────────────────────

export type {
  CardAccount,
  CardStatus,
  CardType,
  CardTransaction,
  CardTransactionType,
  CardTransactionStatus,
  KYCSession,
  KYCStatus,
  TopUpParams,
  TopUpOrder,
  TopUpResult,
  TopUpStatus,
  TopUpAsset,
  CardDetail,
  SpendingLimits,
  PaginationParams,
  PaginatedResult,
  ProviderConfig,
  ContactlessConfig,
  CurrencyAccount,
  PhysicalCardOrder,
} from './types'

// ─── Services ─────────────────────────────────────────

export { cardProviderRegistry } from './services/registry'
export {
  getCardAccounts,
  setCardAccounts,
  removeCardAccounts,
  getCardTransactions,
  setCardTransactions,
  removeCardTransactions,
  getProviderState,
  setProviderState,
  removeProviderState,
  getCardSettings,
  setCardSettings,
  removeCardSettings,
} from './services/cardStorage'
export type { ProviderState, CardSettings } from './services/cardStorage'
export { immersveAdapter } from './services/adapter'
export type { CardProviderAdapter } from './services/adapter'
