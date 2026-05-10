import { describe, it, expect } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily } from '@/models/ChainType'
import '@/services/chainplugins/evm/evmPlugin'

const KNOWN_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

describe('EvmPlugin — deriveAccounts', () => {
  const plugin = chainRegistry.get(ChainFamily.EVM)!

  it('is registered in the chain registry', () => {
    expect(plugin).toBeDefined()
    expect(plugin.family).toBe(ChainFamily.EVM)
  })

  it('derives the requested number of accounts', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 5)
    expect(accounts).toHaveLength(5)
  })

  it('produces valid EVM addresses (0x-prefixed, 42 chars)', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    for (const a of accounts) {
      expect(a.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    }
  })

  it('is deterministic — same seed always gives same addresses', () => {
    const first = plugin.deriveAccounts(KNOWN_SEED, 3)
    const second = plugin.deriveAccounts(KNOWN_SEED, 3)
    for (let i = 0; i < 3; i++) {
      expect(first[i].address).toBe(second[i].address)
      expect(first[i].privateKey).toBe(second[i].privateKey)
    }
  })

  it('different indices produce different addresses', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 5)
    const unique = new Set(accounts.map((a) => a.address))
    expect(unique.size).toBe(5)
  })

  it("uses BIP44 m/44'/60'/0'/0/{i} derivation paths", () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    accounts.forEach((a, i) => {
      expect(a.path).toBe(`m/44'/60'/0'/0/${i}`)
      expect(a.index).toBe(i)
    })
  })

  it('privateKey is a 0x-prefixed 32-byte hex string', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].privateKey).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('returns empty array for invalid seed', () => {
    const result = plugin.deriveAccounts(new Uint8Array(16), 1)
    expect(result).toEqual([])
  })
})

describe('EvmPlugin — isValidAddress', () => {
  const plugin = chainRegistry.get(ChainFamily.EVM)!

  const valid = [
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    '0x0000000000000000000000000000000000000000',
    '0xdead000000000000000000000000000000000000',
  ]

  const invalid = [
    '',
    '0x123',
    'not-an-address',
    'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
    '5B7yRcuHQggbidX5X3JiZjyaKgufvq8AhC9W7WRFZpQD',
  ]

  it.each(valid)('accepts valid EVM address: %s', (addr) => {
    expect(plugin.isValidAddress(addr)).toBe(true)
  })

  it.each(invalid)('rejects invalid address: %s', (addr) => {
    expect(plugin.isValidAddress(addr)).toBe(false)
  })
})
