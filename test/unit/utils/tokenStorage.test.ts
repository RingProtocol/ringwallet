import { describe, it, expect, beforeEach, vi } from 'vitest'
import { addToken, getTokenList, removeToken } from '@/utils/tokenStorage'

// ─── Mock safeStorage ────────────────────────────────────────────────────

const store: Record<string, string> = {}

vi.mock('@/utils/safeStorage', () => ({
  safeGetItem: (key: string) => store[key] ?? null,
  safeSetItem: (key: string, value: string) => {
    store[key] = value
  },
  safeRemoveItem: (key: string) => {
    delete store[key]
  },
}))

const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const USDC = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
}
const DAI = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  symbol: 'DAI',
  name: 'Dai',
  decimals: 18,
}

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
})

// ─── EVM chain (numeric ID) ───────────────────────────────────────────────

describe('tokenStorage with numeric chainId (EVM)', () => {
  it('returns empty array when no tokens saved', () => {
    expect(getTokenList(WALLET, 1)).toEqual([])
  })

  it('adds and retrieves a token', () => {
    addToken(WALLET, 1, USDC)
    const list = getTokenList(WALLET, 1)
    expect(list).toHaveLength(1)
    expect(list[0].symbol).toBe('USDC')
  })

  it('does not add duplicates', () => {
    addToken(WALLET, 1, USDC)
    addToken(WALLET, 1, USDC)
    expect(getTokenList(WALLET, 1)).toHaveLength(1)
  })

  it('adds multiple different tokens', () => {
    addToken(WALLET, 1, USDC)
    addToken(WALLET, 1, DAI)
    expect(getTokenList(WALLET, 1)).toHaveLength(2)
  })

  it('removes a token', () => {
    addToken(WALLET, 1, USDC)
    addToken(WALLET, 1, DAI)
    removeToken(WALLET, 1, USDC.address)
    const list = getTokenList(WALLET, 1)
    expect(list).toHaveLength(1)
    expect(list[0].symbol).toBe('DAI')
  })

  it('chains with different numeric IDs have separate lists', () => {
    addToken(WALLET, 1, USDC) // Ethereum
    addToken(WALLET, 137, DAI) // Polygon
    expect(getTokenList(WALLET, 1)).toHaveLength(1)
    expect(getTokenList(WALLET, 137)).toHaveLength(1)
    expect(getTokenList(WALLET, 1)[0].symbol).toBe('USDC')
    expect(getTokenList(WALLET, 137)[0].symbol).toBe('DAI')
  })
})

// ─── Solana chain (string ID) — TC-SOL-CHAIN compatibility ───────────────

describe('tokenStorage with string chainId (Solana)', () => {
  const SOL_ADDR = '5B7yRcuHQggbidX5X3JiZjyaKgufvq8AhC9W7WRFZpQD'
  const SPL_TOKEN = {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  }

  it('returns empty array for a fresh Solana address', () => {
    expect(getTokenList(SOL_ADDR, 'solana-mainnet')).toEqual([])
  })

  it('stores and retrieves tokens keyed by string chainId', () => {
    addToken(SOL_ADDR, 'solana-mainnet', SPL_TOKEN)
    expect(getTokenList(SOL_ADDR, 'solana-mainnet')).toHaveLength(1)
  })

  it('string and numeric chainIds are stored separately', () => {
    addToken(WALLET, 1, USDC) // EVM Ethereum
    addToken(SOL_ADDR, 'solana-mainnet', SPL_TOKEN) // Solana
    expect(getTokenList(WALLET, 1)).toHaveLength(1)
    expect(getTokenList(SOL_ADDR, 'solana-mainnet')).toHaveLength(1)
    // Cross-check: no bleed between chains
    expect(getTokenList(WALLET, 'solana-mainnet' as never)).toHaveLength(0)
    expect(getTokenList(SOL_ADDR, 1)).toHaveLength(0)
  })

  it('removes a token from a Solana chain', () => {
    addToken(SOL_ADDR, 'solana-mainnet', SPL_TOKEN)
    removeToken(SOL_ADDR, 'solana-mainnet', SPL_TOKEN.address)
    expect(getTokenList(SOL_ADDR, 'solana-mainnet')).toHaveLength(0)
  })
})
