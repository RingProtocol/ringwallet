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

// ─── Helpers ──────────────────────────────────────────

/** Simulate network latency between min and max ms. */
function delay(min = 100, max = 500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Generate a random 4-digit string. */
function randomLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/** Generate a random hex string of the given byte length. */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── localStorage Helpers ─────────────────────────────

const STORAGE_PREFIX = 'ucard_mock'

function storageKey(
  adapterId: string,
  walletAddress: string,
  suffix: string
): string {
  return `${STORAGE_PREFIX}_${adapterId}_${walletAddress.toLowerCase()}_${suffix}`
}

function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function setJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function removeKey(key: string): void {
  localStorage.removeItem(key)
}

// ─── Sample top-up assets (in-memory until issuer API) ─────────────────

const MOCK_TOP_UP_ASSETS: TopUpAsset[] = [
  {
    symbol: 'USDC',
    chain: 'ethereum',
    balance: '1500.00',
    decimals: 6,
    minAmount: '10',
    maxAmount: '10000',
    estimatedFee: '2.50',
    processingTime: '~2 min',
  },
  {
    symbol: 'USDC',
    chain: 'polygon',
    balance: '800.00',
    decimals: 6,
    minAmount: '5',
    maxAmount: '10000',
    estimatedFee: '0.10',
    processingTime: '~30 sec',
  },
  {
    symbol: 'ETH',
    chain: 'ethereum',
    balance: '2.5',
    decimals: 18,
    minAmount: '0.01',
    maxAmount: '10',
    estimatedFee: '3.00',
    processingTime: '~3 min',
  },
]

// ─── Memory-backed adapter (dev / sandbox parity) ───

export type MemoryBackedCardAdapterSpec = {
  id: string
  displayName: string
  supportedAssets: string[]
  supportedChains: string[]
  supportedCurrencies: string[]
  supportedRegions: string[]
  cardTypes: CardType[]
}

/** Persisted adapter state shape. */
type PersistedState = {
  linked: boolean
  kycStatus: KYCStatus
  cards: CardAccount[]
  transactions: Record<string, CardTransaction[]>
  spendingLimits: Record<string, SpendingLimits>
}

/**
 * In-memory implementation of {@link CardProviderAdapter}.
 * Used for automated tests and sandbox-style flows until a provider ships real APIs.
 *
 * On localhost, card data is persisted to localStorage and keyed by wallet address
 * so refreshing the page does not lose the user's cards or balance.
 */
export class MemoryBackedCardAdapter implements CardProviderAdapter {
  readonly id: string
  readonly displayName: string
  readonly supportedAssets: string[]
  readonly supportedChains: string[]
  readonly supportedCurrencies: string[]
  readonly supportedRegions: string[]
  readonly cardTypes: CardType[]

  // ─── Internal State ────────────────────────────────

  private config: ProviderConfig | null = null
  private linked = false
  private cards = new Map<string, CardAccount>()
  private transactions = new Map<string, CardTransaction[]>()
  private kycStatus: KYCStatus = 'not_started'
  private kycTimer: ReturnType<typeof setTimeout> | null = null
  private spendingLimits = new Map<string, SpendingLimits>()
  private txCallbacks: Array<(tx: CardTransaction) => void> = []

  constructor(spec: MemoryBackedCardAdapterSpec) {
    this.id = spec.id
    this.displayName = spec.displayName
    this.supportedAssets = spec.supportedAssets
    this.supportedChains = spec.supportedChains
    this.supportedCurrencies = spec.supportedCurrencies
    this.supportedRegions = spec.supportedRegions
    this.cardTypes = spec.cardTypes
  }

  // ─── Persistence ───────────────────────────────────

  private get walletAddress(): string | null {
    return this.config?.walletAddress ?? null
  }

  private get isLocalhost(): boolean {
    if (typeof window === 'undefined') return false
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    )
  }

  private storageKey(suffix: string): string | null {
    const addr = this.walletAddress
    if (!addr) return null
    return storageKey(this.id, addr, suffix)
  }

  private loadFromStorage(): void {
    if (!this.isLocalhost) return
    const key = this.storageKey('state')
    if (!key) return

    const state = getJSON<PersistedState | null>(key, null)
    if (!state) return

    this.linked = state.linked
    this.kycStatus = state.kycStatus

    this.cards.clear()
    for (const card of state.cards) {
      this.cards.set(card.id, card)
    }

    this.transactions.clear()
    for (const [cardId, txs] of Object.entries(state.transactions)) {
      this.transactions.set(cardId, txs)
    }

    this.spendingLimits.clear()
    for (const [cardId, limits] of Object.entries(state.spendingLimits)) {
      this.spendingLimits.set(cardId, limits)
    }
  }

  private saveToStorage(): void {
    if (!this.isLocalhost) return
    const key = this.storageKey('state')
    if (!key) return

    const state: PersistedState = {
      linked: this.linked,
      kycStatus: this.kycStatus,
      cards: [...this.cards.values()],
      transactions: Object.fromEntries(this.transactions),
      spendingLimits: Object.fromEntries(this.spendingLimits),
    }

    setJSON(key, state)
  }

  private clearStorage(): void {
    if (!this.isLocalhost) return
    const key = this.storageKey('state')
    if (key) removeKey(key)
  }

  // ─── Lifecycle ─────────────────────────────────────

  async initialize(config: ProviderConfig): Promise<void> {
    await delay()
    this.config = config
    this.linked = true
    this.loadFromStorage()
  }

  isLinked(): boolean {
    return this.linked
  }

  async disconnect(): Promise<void> {
    await delay()
    this.linked = false
    this.config = null
    this.cards.clear()
    this.transactions.clear()
    this.kycStatus = 'not_started'
    if (this.kycTimer) {
      clearTimeout(this.kycTimer)
      this.kycTimer = null
    }
    this.clearStorage()
  }

  async healthCheck(): Promise<boolean> {
    await delay(50, 150)
    return true
  }

  // ─── KYC & Card Creation ───────────────────────────

  async startKYC(): Promise<KYCSession> {
    await delay(200, 400)
    this.kycStatus = 'in_progress'

    // Auto-approve after 3 seconds
    if (this.kycTimer) clearTimeout(this.kycTimer)
    this.kycTimer = setTimeout(() => {
      this.kycStatus = 'approved'
      this.saveToStorage()
    }, 3000)

    this.saveToStorage()

    return {
      sessionId: `kyc_${randomHex(8)}`,
      // Placeholder until the real issuer returns a hosted KYC URL (no fake third-party domain).
      url: 'about:blank',
      expiresAt: Date.now() + 3600_000,
    }
  }

  async getKYCStatus(): Promise<KYCStatus> {
    await delay(100, 200)
    return this.kycStatus
  }

  async createCard(type: CardType): Promise<CardAccount> {
    await delay(300, 500)

    const now = Date.now()
    const card: CardAccount = {
      id: `card_${randomHex(8)}`,
      provider: this.id,
      status: 'active',
      type,
      last4: randomLast4(),
      balance: '0.00',
      currency: 'USD',
      createdAt: now,
      cardholderName: '',
    }

    this.cards.set(card.id, card)
    this.transactions.set(card.id, [])

    this.spendingLimits.set(card.id, {
      daily: '500.00',
      monthly: '5000.00',
      perTransaction: '200.00',
    })

    this.saveToStorage()

    return card
  }

  // ─── Card Management ───────────────────────────────

  async getCards(): Promise<CardAccount[]> {
    await delay(100, 300)
    return [...this.cards.values()]
  }

  async getCardBalance(cardId: string): Promise<string> {
    await delay(100, 200)
    const card = this.cards.get(cardId)
    if (!card) throw new Error(`Card not found: ${cardId}`)
    return card.balance
  }

  async freezeCard(cardId: string): Promise<void> {
    await delay(200, 400)
    const card = this.cards.get(cardId)
    if (!card) throw new Error(`Card not found: ${cardId}`)
    if (card.status !== 'active') {
      throw new Error(`Cannot freeze card in status: ${card.status}`)
    }
    card.status = 'frozen'
    this.saveToStorage()
  }

  async unfreezeCard(cardId: string): Promise<void> {
    await delay(200, 400)
    const card = this.cards.get(cardId)
    if (!card) throw new Error(`Card not found: ${cardId}`)
    if (card.status !== 'frozen') {
      throw new Error(`Cannot unfreeze card in status: ${card.status}`)
    }
    card.status = 'active'
    this.saveToStorage()
  }

  async getCardDetails(cardId: string): Promise<CardDetail> {
    await delay(200, 400)
    const card = this.cards.get(cardId)
    if (!card) throw new Error(`Card not found: ${cardId}`)

    return {
      ...card,
      cardNumber: `4242 4242 4242 ${card.last4}`,
      cvc: '123',
      expiryMonth: 12,
      expiryYear: 2028,
      spendingLimits: this.spendingLimits.get(cardId) ?? {
        daily: null,
        monthly: null,
        perTransaction: null,
      },
      contactlessEnabled: false,
    }
  }

  async updateSpendingLimit(
    cardId: string,
    limits: SpendingLimits
  ): Promise<void> {
    await delay(200, 400)
    if (!this.cards.has(cardId)) {
      throw new Error(`Card not found: ${cardId}`)
    }
    this.spendingLimits.set(cardId, limits)
    this.saveToStorage()
  }

  // ─── Top-up ────────────────────────────────────────

  async getSupportedTopUpAssets(): Promise<TopUpAsset[]> {
    await delay(100, 300)
    return [...MOCK_TOP_UP_ASSETS]
  }

  async createTopUp(params: TopUpParams): Promise<TopUpOrder> {
    await delay(200, 400)
    if (!this.cards.has(params.cardId)) {
      throw new Error(`Card not found: ${params.cardId}`)
    }

    return {
      id: `topup_${randomHex(8)}`,
      fromAddress: `0x${randomHex(20)}`,
      toAddress: `0x${randomHex(20)}`,
      asset: params.asset,
      chain: params.chain,
      amount: params.amount,
      gasEstimate: '0.002',
      expiresAt: Date.now() + 1800_000,
    }
  }

  async executeTopUp(
    order: TopUpOrder,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _signature: string
  ): Promise<TopUpResult> {
    await delay(300, 500)

    // Simulate balance update
    const card = this.cards.get(this.findCardIdByTopUpOrder())
    if (card) {
      const prev = parseFloat(card.balance)
      card.balance = (prev + parseFloat(order.amount)).toFixed(2)
      this.saveToStorage()
    }

    return {
      orderId: order.id,
      txHash: `0x${randomHex(32)}`,
      status: 'confirmed',
      estimatedArrival: Date.now() + 120_000,
    }
  }

  async getTopUpStatus(orderId: string): Promise<TopUpResult> {
    await delay(100, 200)
    return {
      orderId,
      txHash: `0x${randomHex(32)}`,
      status: 'confirmed',
      estimatedArrival: Date.now() + 120_000,
    }
  }

  // ─── Transactions ──────────────────────────────────

  async getTransactions(
    cardId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<CardTransaction>> {
    await delay(150, 350)
    const all = this.transactions.get(cardId) ?? []
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 20
    const start = (page - 1) * pageSize
    const items = all.slice(start, start + pageSize)

    return {
      items,
      total: all.length,
      hasMore: start + pageSize < all.length,
      nextCursor:
        start + pageSize < all.length ? String(start + pageSize) : undefined,
    }
  }

  // ─── Reserved Extensions ───────────────────────────

  async setupContactless(cardId: string): Promise<ContactlessConfig> {
    await delay(300, 500)
    if (!this.cards.has(cardId)) {
      throw new Error(`Card not found: ${cardId}`)
    }
    return {
      enabled: true,
      provisionUrl: 'https://mock-contactless.example.com/provision',
    }
  }

  async getMultiCurrencyAccounts(cardId: string): Promise<CurrencyAccount[]> {
    await delay(200, 400)
    if (!this.cards.has(cardId)) {
      throw new Error(`Card not found: ${cardId}`)
    }
    return [
      { currency: 'USD', balance: '100.00', isDefault: true },
      { currency: 'EUR', balance: '0.00', isDefault: false },
      { currency: 'GBP', balance: '0.00', isDefault: false },
    ]
  }

  async requestPhysicalCard(
    cardId: string,
    address: Record<string, string>
  ): Promise<PhysicalCardOrder> {
    await delay(300, 500)
    if (!this.cards.has(cardId)) {
      throw new Error(`Card not found: ${cardId}`)
    }
    void address // acknowledged
    return {
      orderId: `phys_${randomHex(8)}`,
      status: 'ordered',
      estimatedDelivery: new Date(Date.now() + 7 * 86400_000).toISOString(),
    }
  }

  onTransactionCallback(callback: (tx: CardTransaction) => void): void {
    this.txCallbacks.push(callback)
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    await delay(100, 200)
    if (from === to) return 1
    // Return a plausible mock rate
    const rates: Record<string, number> = {
      USD_EUR: 0.92,
      USD_GBP: 0.79,
      EUR_USD: 1.09,
      GBP_USD: 1.27,
    }
    return rates[`${from}_${to}`] ?? 1.0
  }

  async getCardImage(cardId: string): Promise<string> {
    await delay(100, 200)
    if (!this.cards.has(cardId)) {
      throw new Error(`Card not found: ${cardId}`)
    }
    // Return a placeholder SVG data-URI
    return (
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="214" viewBox="0 0 340 214">' +
          '<rect width="340" height="214" rx="16" fill="#6366f1"/>' +
          '<text x="24" y="40" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="14">CARD</text>' +
          '<text x="24" y="130" fill="white" font-family="monospace" font-size="20" letter-spacing="3">•••• •••• •••• ' +
          (this.cards.get(cardId)?.last4 ?? '0000') +
          '</text>' +
          '</svg>'
      )
    )
  }

  // ─── Private Helpers ───────────────────────────────

  /** Best-effort lookup of a cardId associated with a top-up order. */
  private findCardIdByTopUpOrder(): string {
    // In a real adapter this would be tracked; in-memory impl returns the first card.
    const first = this.cards.keys().next()
    return first.done ? '' : first.value
  }
}
