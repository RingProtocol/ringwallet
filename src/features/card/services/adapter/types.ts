import type {
  CardAccount,
  CardDetail,
  CardTransaction,
  ContactlessConfig,
  CurrencyAccount,
  KYCSession,
  KYCStatus,
  PaginatedResult,
  PaginationParams,
  PhysicalCardOrder,
  ProviderConfig,
  SpendingLimits,
  TopUpAsset,
  TopUpOrder,
  TopUpParams,
  TopUpResult,
} from '../../types'
import type { CardType } from '../../types'

/**
 * Unified interface for card provider integrations.
 * Each provider (Immersve, etc.) implements this interface.
 */
export interface CardProviderAdapter {
  // ─── Identity ──────────────────────────────────────

  /** Unique provider identifier (e.g. 'immersve'). */
  readonly id: string
  /** Human-readable provider name. */
  readonly displayName: string
  /** Asset symbols supported for top-up (e.g. ['USDC', 'ETH']). */
  readonly supportedAssets: string[]
  /** Chain identifiers supported for top-up (e.g. ['ethereum', 'polygon']). */
  readonly supportedChains: string[]
  /** Fiat currencies supported by the card (e.g. ['USD', 'EUR']). */
  readonly supportedCurrencies: string[]
  /** Geographic regions where the card is available. */
  readonly supportedRegions: string[]
  /** Card types this provider can issue. */
  readonly cardTypes: CardType[]

  // ─── Lifecycle ─────────────────────────────────────

  /** Initialise the adapter with provider-specific credentials. */
  initialize(config: ProviderConfig): Promise<void>
  /** Whether the adapter has an active, linked session. */
  isLinked(): boolean
  /** Disconnect and clear any cached credentials. */
  disconnect(): Promise<void>
  /** Returns true if the provider API is reachable. */
  healthCheck(): Promise<boolean>

  // ─── KYC & Card Creation ───────────────────────────

  /** Start a KYC verification flow; returns a redirect URL. */
  startKYC(): Promise<KYCSession>
  /** Poll the current KYC verification status. */
  getKYCStatus(): Promise<KYCStatus>
  /** Request a new card of the given type. */
  createCard(type: CardType): Promise<CardAccount>

  // ─── Card Management ───────────────────────────────

  /** List all cards owned by the current user. */
  getCards(): Promise<CardAccount[]>
  /** Fetch the current balance for a specific card. */
  getCardBalance(cardId: string): Promise<string>
  /** Temporarily disable a card. */
  freezeCard(cardId: string): Promise<void>
  /** Re-enable a frozen card. */
  unfreezeCard(cardId: string): Promise<void>
  /** Get full card details including sensitive data. */
  getCardDetails(cardId: string): Promise<CardDetail>
  /** Update spending limits for a card. */
  updateSpendingLimit(cardId: string, limits: SpendingLimits): Promise<void>

  // ─── Top-up ────────────────────────────────────────

  /** List assets available for crypto top-up. */
  getSupportedTopUpAssets(): Promise<TopUpAsset[]>
  /** Create a top-up order (does not execute on-chain). */
  createTopUp(params: TopUpParams): Promise<TopUpOrder>
  /** Execute a previously created top-up order with a user signature. */
  executeTopUp(order: TopUpOrder, signature: string): Promise<TopUpResult>
  /** Check the status of a top-up order. */
  getTopUpStatus(orderId: string): Promise<TopUpResult>

  // ─── Transactions ──────────────────────────────────

  /** List transactions for a card with optional pagination. */
  getTransactions(
    cardId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<CardTransaction>>

  // ─── Reserved Extensions ───────────────────────────

  /** Enable contactless (NFC) payments for a card. */
  setupContactless?(cardId: string): Promise<ContactlessConfig>
  /** Retrieve multi-currency sub-accounts. */
  getMultiCurrencyAccounts?(cardId: string): Promise<CurrencyAccount[]>
  /** Order a physical card to a shipping address. */
  requestPhysicalCard?(
    cardId: string,
    address: Record<string, string>,
  ): Promise<PhysicalCardOrder>
  /** Register a callback for real-time transaction notifications. */
  onTransactionCallback?(callback: (tx: CardTransaction) => void): void
  /** Get the current exchange rate between two currencies. */
  getExchangeRate?(from: string, to: string): Promise<number>
  /** Get a URL or data-URI for the card visual. */
  getCardImage?(cardId: string): Promise<string>
}

export type { CardType } from '../../types'
