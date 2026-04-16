import { describe, it, expect } from 'vitest'
import {
  chainRegistry,
  BITCOIN_TESTNET_ACCOUNTS_KEY,
} from '@/services/chainplugins/index'
import { ChainFamily } from '@/models/ChainType'

const KNOWN_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

describe('ChainPluginRegistry — registration', () => {
  it('has all 5 chain families registered', () => {
    expect(chainRegistry.has(ChainFamily.EVM)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Solana)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Bitcoin)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Tron)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Cosmos)).toBe(true)
  })

  it('families() returns all registered families', () => {
    const families = chainRegistry.families()
    expect(families).toContain(ChainFamily.EVM)
    expect(families).toContain(ChainFamily.Solana)
    expect(families).toContain(ChainFamily.Bitcoin)
    expect(families).toContain(ChainFamily.Tron)
    expect(families).toContain(ChainFamily.Cosmos)
    expect(families.length).toBeGreaterThanOrEqual(5)
  })

  it('getAll() returns all plugins', () => {
    const plugins = chainRegistry.getAll()
    expect(plugins.length).toBeGreaterThanOrEqual(5)
  })
})

describe('ChainPluginRegistry — deriveAllAccounts', () => {
  it('derives accounts for every registered family in one call', () => {
    const all = chainRegistry.deriveAllAccounts(KNOWN_SEED, 3)
    expect(all[ChainFamily.EVM]).toHaveLength(3)
    expect(all[ChainFamily.Solana]).toHaveLength(3)
    expect(all[ChainFamily.Bitcoin]).toHaveLength(3)
    expect(all[BITCOIN_TESTNET_ACCOUNTS_KEY]).toHaveLength(3)
    expect(all[ChainFamily.Tron]).toHaveLength(3)
    expect(all[ChainFamily.Cosmos]).toHaveLength(3)
  })

  it('all families produce unique addresses (no cross-family collision)', () => {
    const all = chainRegistry.deriveAllAccounts(KNOWN_SEED, 1)

    // Prisma intentionally shares EVM derivation (BIP44 coin 60),
    // and the base 'cosmos' slot uses the same params as 'cosmos_cosmos'.
    const KNOWN_ALIASES = new Set(['prisma', 'cosmos'])
    const filtered = Object.entries(all)
      .filter(([key]) => !KNOWN_ALIASES.has(key))
      .map(([, arr]) => arr[0].address)

    const unique = new Set(filtered)
    expect(unique.size).toBe(filtered.length)
  })

  it('each family uses the correct address format', () => {
    const all = chainRegistry.deriveAllAccounts(KNOWN_SEED, 1)
    expect(all[ChainFamily.EVM][0].address).toMatch(/^0x/)
    expect(all[ChainFamily.Solana][0].address).toMatch(
      /^[1-9A-HJ-NP-Za-km-z]+$/
    )
    expect(all[ChainFamily.Bitcoin][0].address).toMatch(/^bc1q/)
    expect(all[BITCOIN_TESTNET_ACCOUNTS_KEY][0].address).toMatch(/^tb1q/)
    expect(all[ChainFamily.Tron][0].address).toMatch(/^T/)
    expect(all[ChainFamily.Cosmos][0].address).toMatch(/^cosmos1/)
  })

  it('is deterministic across calls', () => {
    const first = chainRegistry.deriveAllAccounts(KNOWN_SEED, 2)
    const second = chainRegistry.deriveAllAccounts(KNOWN_SEED, 2)
    for (const family of chainRegistry.families()) {
      expect(first[family][0].address).toBe(second[family][0].address)
    }
  })
})
