import { describe, it, expect } from 'vitest'
import { chainRegistry } from '../registry'
import { ChainFamily } from '../../../models/ChainType'
import './bitcoinPlugin'

const KNOWN_SEED = new Uint8Array(
  Buffer.from('fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2', 'hex'),
)

describe('BitcoinPlugin — deriveAccounts', () => {
  const plugin = chainRegistry.get(ChainFamily.Bitcoin)!

  it('is registered in the chain registry', () => {
    expect(plugin).toBeDefined()
    expect(plugin.family).toBe(ChainFamily.Bitcoin)
  })

  it('derives the requested number of accounts', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 5)
    expect(accounts).toHaveLength(5)
  })

  it('produces valid P2WPKH (bc1q) addresses', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    for (const a of accounts) {
      expect(a.address).toMatch(/^bc1q[a-z0-9]{38,42}$/)
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
    const unique = new Set(accounts.map(a => a.address))
    expect(unique.size).toBe(5)
  })

  it('uses BIP44 m/44\'/0\'/0\'/0/{i} derivation paths (mainnet)', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    accounts.forEach((a, i) => {
      expect(a.path).toBe(`m/44'/0'/0'/0/${i}`)
      expect(a.index).toBe(i)
    })
  })

  it('privateKey is a 0x-prefixed 32-byte hex string', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].privateKey).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('meta contains publicKey and isTestnet flag', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].meta).toBeDefined()
    expect(accounts[0].meta!.publicKey).toMatch(/^0x[0-9a-f]+$/)
    expect(accounts[0].meta!.isTestnet).toBe(false)
  })

  it('throws on seed shorter than 16 bytes', () => {
    expect(() => plugin.deriveAccounts(new Uint8Array(8), 1)).toThrow()
  })
})

describe('BitcoinPlugin — isValidAddress', () => {
  const plugin = chainRegistry.get(ChainFamily.Bitcoin)!

  const valid = [
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  ]

  const invalid = [
    '',
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    'not-valid',
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  ]

  it.each(valid)('accepts valid Bitcoin bech32 address: %s', (addr) => {
    expect(plugin.isValidAddress(addr)).toBe(true)
  })

  it.each(invalid)('rejects invalid address: %s', (addr) => {
    expect(plugin.isValidAddress(addr)).toBe(false)
  })
})
