import type {
  CardAccount,
  CardTransaction,
} from '../types'

// ─── Storage Keys ─────────────────────────────────────

const STORAGE_PREFIX = 'ucard'

const KEYS = {
  cardAccounts: `${STORAGE_PREFIX}_cardAccounts`,
  cardTransactions: `${STORAGE_PREFIX}_cardTransactions`,
  providerState: `${STORAGE_PREFIX}_providerState`,
  cardSettings: `${STORAGE_PREFIX}_cardSettings`,
} as const

// ─── Stored Shapes ────────────────────────────────────

/** Persisted provider connection state. */
export interface ProviderState {
  providerId: string
  isLinked: boolean
  kycStatus: string
  linkedAt: number
}

/** User-level card settings. */
export interface CardSettings {
  defaultCardId: string | null
  lastUsedAsset: string | null
}

// ─── Generic Helpers ──────────────────────────────────

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

// ─── Card Accounts ────────────────────────────────────

/** Retrieve all cached card accounts. */
export function getCardAccounts(): CardAccount[] {
  return getJSON<CardAccount[]>(KEYS.cardAccounts, [])
}

/** Persist the full list of card accounts (replaces previous data). */
export function setCardAccounts(accounts: CardAccount[]): void {
  setJSON(KEYS.cardAccounts, accounts)
}

/** Remove cached card accounts. */
export function removeCardAccounts(): void {
  removeKey(KEYS.cardAccounts)
}

// ─── Card Transactions ────────────────────────────────

/** Retrieve all cached card transactions. */
export function getCardTransactions(): CardTransaction[] {
  return getJSON<CardTransaction[]>(KEYS.cardTransactions, [])
}

/** Persist the full list of card transactions (replaces previous data). */
export function setCardTransactions(transactions: CardTransaction[]): void {
  setJSON(KEYS.cardTransactions, transactions)
}

/** Remove cached card transactions. */
export function removeCardTransactions(): void {
  removeKey(KEYS.cardTransactions)
}

// ─── Provider State ───────────────────────────────────

/** Retrieve the persisted provider connection state. */
export function getProviderState(): ProviderState | null {
  return getJSON<ProviderState | null>(KEYS.providerState, null)
}

/** Persist provider connection state. */
export function setProviderState(state: ProviderState): void {
  setJSON(KEYS.providerState, state)
}

/** Remove persisted provider state. */
export function removeProviderState(): void {
  removeKey(KEYS.providerState)
}

// ─── Card Settings ────────────────────────────────────

/** Retrieve user card settings. */
export function getCardSettings(): CardSettings {
  return getJSON<CardSettings>(KEYS.cardSettings, {
    defaultCardId: null,
    lastUsedAsset: null,
  })
}

/** Persist user card settings. */
export function setCardSettings(settings: CardSettings): void {
  setJSON(KEYS.cardSettings, settings)
}

/** Remove persisted card settings. */
export function removeCardSettings(): void {
  removeKey(KEYS.cardSettings)
}
