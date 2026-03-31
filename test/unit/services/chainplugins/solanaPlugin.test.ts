import { describe, it, expect } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily } from '@/models/ChainType'
import '@/services/chainplugins/solana/solanaPlugin'

const KNOWN_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

describe('SolanaPlugin — deriveAccounts', () => {
  const plugin = chainRegistry.get(ChainFamily.Solana)!

  it('is registered in the chain registry', () => {
    expect(plugin).toBeDefined()
    expect(plugin.family).toBe(ChainFamily.Solana)
  })

  it('derives the requested number of accounts', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 5)
    expect(accounts).toHaveLength(5)
  })

  it('produces valid Base58 Solana addresses', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    for (const a of accounts) {
      expect(a.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
      expect(a.address).not.toMatch(/^0x/)
    }
  })

  it('matches the pre-computed reference address at index=0 (SLIP-0010 Test Vector 2)', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].address).toBe(
      '5B7yRcuHQggbidX5X3JiZjyaKgufvq8AhC9W7WRFZpQD'
    )
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

  it("uses SLIP-0010 m/44'/501'/{i}'/0' derivation paths", () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    accounts.forEach((a, i) => {
      expect(a.path).toBe(`m/44'/501'/${i}'/0'`)
      expect(a.index).toBe(i)
    })
  })

  it('privateKey is a 0x-prefixed 32-byte hex string', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].privateKey).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('throws on seed shorter than 16 bytes', () => {
    expect(() => plugin.deriveAccounts(new Uint8Array(8), 1)).toThrow()
  })

  it('Solana addresses are not EVM addresses', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].address).not.toMatch(/^0x/)
  })
})

describe('SolanaPlugin — isValidAddress', () => {
  const plugin = chainRegistry.get(ChainFamily.Solana)!

  const valid = [
    '11111111111111111111111111111111',
    'So11111111111111111111111111111111111111112',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ]

  const invalid = [
    '',
    '0x1234567890abcdef1234567890abcdef12345678',
    'not-valid',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  ]

  it.each(valid)('accepts valid Solana address: %s', (addr) => {
    expect(plugin.isValidAddress(addr)).toBe(true)
  })

  it.each(invalid)('rejects invalid address: %s', (addr) => {
    expect(plugin.isValidAddress(addr)).toBe(false)
  })
})
