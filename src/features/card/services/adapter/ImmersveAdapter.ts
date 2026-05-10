import type {
  CardAccount,
  CardDetail,
  CardTransaction,
  CardType,
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
import type { CardProviderAdapter } from './types'

/**
 * Stub implementation for the Immersve card provider.
 *
 * All methods currently throw — replace with real API calls
 * once the Immersve integration is ready.
 */
class ImmersveAdapter implements CardProviderAdapter {
  // ─── Identity ──────────────────────────────────────

  readonly id = 'immersve'
  readonly displayName = 'Immersve'
  readonly supportedAssets = ['USDC', 'ETH', 'USDT', 'DAI']
  readonly supportedChains = ['ethereum', 'polygon', 'arbitrum', 'optimism']
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP']
  readonly supportedRegions = ['Global']
  readonly cardTypes: CardType[] = ['virtual', 'physical']

  // ─── Internal State ────────────────────────────────

  private config: ProviderConfig | null = null
  private linked = false

  // ─── Lifecycle ─────────────────────────────────────

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config
    // TODO: perform real Immersve API authentication
    this.linked = true
  }

  isLinked(): boolean {
    return this.linked
  }

  async disconnect(): Promise<void> {
    this.linked = false
    this.config = null
  }

  async healthCheck(): Promise<boolean> {
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  // ─── KYC & Card Creation ───────────────────────────

  async startKYC(): Promise<KYCSession> {
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async getKYCStatus(): Promise<KYCStatus> {
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async createCard(type: CardType): Promise<CardAccount> {
    void type
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  // ─── Card Management ───────────────────────────────

  async getCards(): Promise<CardAccount[]> {
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async getCardBalance(cardId: string): Promise<string> {
    void cardId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async freezeCard(cardId: string): Promise<void> {
    void cardId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async unfreezeCard(cardId: string): Promise<void> {
    void cardId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async getCardDetails(cardId: string): Promise<CardDetail> {
    void cardId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async updateSpendingLimit(
    cardId: string,
    limits: SpendingLimits,
  ): Promise<void> {
    void cardId
    void limits
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  // ─── Top-up ────────────────────────────────────────

  async getSupportedTopUpAssets(): Promise<TopUpAsset[]> {
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async createTopUp(params: TopUpParams): Promise<TopUpOrder> {
    void params
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async executeTopUp(
    order: TopUpOrder,
    signature: string,
  ): Promise<TopUpResult> {
    void order
    void signature
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async getTopUpStatus(orderId: string): Promise<TopUpResult> {
    void orderId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  // ─── Transactions ──────────────────────────────────

  async getTransactions(
    cardId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<CardTransaction>> {
    void cardId
    void params
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  // ─── Reserved Extensions ───────────────────────────

  async setupContactless(
    cardId: string,
  ): Promise<ContactlessConfig> {
    void cardId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async getMultiCurrencyAccounts(
    cardId: string,
  ): Promise<CurrencyAccount[]> {
    void cardId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async requestPhysicalCard(
    cardId: string,
    address: Record<string, string>,
  ): Promise<PhysicalCardOrder> {
    void cardId
    void address
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  onTransactionCallback(callback: (tx: CardTransaction) => void): void {
    void callback
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    void from
    void to
    throw new Error('Not implemented: Immersve API not yet integrated')
  }

  async getCardImage(cardId: string): Promise<string> {
    void cardId
    throw new Error('Not implemented: Immersve API not yet integrated')
  }
}

export const immersveAdapter = new ImmersveAdapter()
