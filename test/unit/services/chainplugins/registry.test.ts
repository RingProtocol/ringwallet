import { describe, it, expect } from 'vitest'
import {
  chainRegistry,
  BITCOIN_TESTNET_ACCOUNTS_KEY,
  DOGECOIN_TESTNET_ACCOUNTS_KEY,
  cosmosAccountsKey,
} from '@/services/chainplugins/index'
import { ChainFamily } from '@/models/ChainType'

const KNOWN_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

describe('ChainPluginRegistry — registration', () => {
  it('has all chain families registered', () => {
    expect(chainRegistry.has(ChainFamily.EVM)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Solana)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Bitcoin)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Tron)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Cosmos)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Dogecoin)).toBe(true)
    expect(chainRegistry.has(ChainFamily.Prisma)).toBe(true)
  })

  it('families() returns all registered families', () => {
    const families = chainRegistry.families()
    expect(families).toContain(ChainFamily.EVM)
    expect(families).toContain(ChainFamily.Solana)
    expect(families).toContain(ChainFamily.Bitcoin)
    expect(families).toContain(ChainFamily.Tron)
    expect(families).toContain(ChainFamily.Cosmos)
    expect(families).toContain(ChainFamily.Dogecoin)
    expect(families).toContain(ChainFamily.Prisma)
    expect(families.length).toBeGreaterThanOrEqual(7)
  })

  it('getAll() returns all plugins', () => {
    const plugins = chainRegistry.getAll()
    expect(plugins.length).toBeGreaterThanOrEqual(7)
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
    expect(all[ChainFamily.Dogecoin]).toHaveLength(3)
    expect(all[DOGECOIN_TESTNET_ACCOUNTS_KEY]).toHaveLength(3)
    expect(all[ChainFamily.Prisma]).toHaveLength(3)
    expect(all[cosmosAccountsKey('cosmos')]).toHaveLength(3)
    expect(all[cosmosAccountsKey('provenance')]).toHaveLength(3)
  })

  it('all families produce unique addresses (no cross-family collision)', () => {
    const all = chainRegistry.deriveAllAccounts(KNOWN_SEED, 1)

    const KNOWN_DUPLICATE_KEYS = new Set([
      cosmosAccountsKey('cosmos'),
      ChainFamily.Prisma as string,
    ])
    const deduped = Object.entries(all)
      .filter(([key]) => !KNOWN_DUPLICATE_KEYS.has(key))
      .map(([, arr]) => arr[0].address)
    const unique = new Set(deduped)
    expect(unique.size).toBe(deduped.length)
  })

  it('Prisma addresses match EVM (EVM-equivalent derivation)', () => {
    const all = chainRegistry.deriveAllAccounts(KNOWN_SEED, 1)
    expect(all[ChainFamily.Prisma][0].address).toBe(
      all[ChainFamily.EVM][0].address
    )
  })

  it('cosmos base matches cosmos_cosmos variant', () => {
    const all = chainRegistry.deriveAllAccounts(KNOWN_SEED, 1)
    expect(all[ChainFamily.Cosmos][0].address).toBe(
      all[cosmosAccountsKey('cosmos')][0].address
    )
  })

  it('each family uses the correct address format', () => {
    const all = chainRegistry.deriveAllAccounts(KNOWN_SEED, 1)
    expect(all[ChainFamily.EVM][0].address).toMatch(/^0x/)
    expect(all[ChainFamily.Prisma][0].address).toMatch(/^0x/)
    expect(all[ChainFamily.Solana][0].address).toMatch(
      /^[1-9A-HJ-NP-Za-km-z]+$/
    )
    expect(all[ChainFamily.Bitcoin][0].address).toMatch(/^bc1q/)
    expect(all[BITCOIN_TESTNET_ACCOUNTS_KEY][0].address).toMatch(/^tb1q/)
    expect(all[ChainFamily.Dogecoin][0].address).toMatch(/^D/)
    expect(all[DOGECOIN_TESTNET_ACCOUNTS_KEY][0].address).toMatch(/^n/)
    expect(all[ChainFamily.Tron][0].address).toMatch(/^T/)
    expect(all[ChainFamily.Cosmos][0].address).toMatch(/^cosmos1/)
    expect(all[cosmosAccountsKey('provenance')][0].address).toMatch(/^pb1/)
  })

  it('is deterministic across calls', () => {
    const first = chainRegistry.deriveAllAccounts(KNOWN_SEED, 2)
    const second = chainRegistry.deriveAllAccounts(KNOWN_SEED, 2)
    for (const family of chainRegistry.families()) {
      expect(first[family][0].address).toBe(second[family][0].address)
    }
  })
})
