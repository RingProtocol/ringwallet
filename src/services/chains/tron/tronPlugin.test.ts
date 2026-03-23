import { describe, it, expect } from 'vitest'
import { chainRegistry } from '../registry'
import { ChainFamily } from '../../../models/ChainType'
import '../evm/evmPlugin'
import './tronPlugin'

const KNOWN_SEED = new Uint8Array(
  Buffer.from('fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2', 'hex'),
)

describe('TronPlugin — deriveAccounts', () => {
  const plugin = chainRegistry.get(ChainFamily.Tron)!

  it('is registered in the chain registry', () => {
    expect(plugin).toBeDefined()
    expect(plugin.family).toBe(ChainFamily.Tron)
  })

  it('derives the requested number of accounts', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 5)
    expect(accounts).toHaveLength(5)
  })

  it('produces valid Tron addresses (T-prefixed Base58Check, 34 chars)', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    for (const a of accounts) {
      expect(a.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)
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

  it('uses BIP44 m/44\'/195\'/0\'/0/{i} derivation paths', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    accounts.forEach((a, i) => {
      expect(a.path).toBe(`m/44'/195'/0'/0/${i}`)
      expect(a.index).toBe(i)
    })
  })

  it('privateKey is a 0x-prefixed 32-byte hex string', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].privateKey).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('Tron address is NOT the same as EVM address for same seed', () => {
    const tron = plugin.deriveAccounts(KNOWN_SEED, 1)
    const evm = chainRegistry.get(ChainFamily.EVM)!.deriveAccounts(KNOWN_SEED, 1)
    expect(tron[0].address).not.toBe(evm[0].address)
  })

  it('returns empty array for invalid (non-32-byte) seed', () => {
    const result = plugin.deriveAccounts(new Uint8Array(16), 1)
    expect(result).toEqual([])
  })
})

describe('TronPlugin — isValidAddress', () => {
  const plugin = chainRegistry.get(ChainFamily.Tron)!

  it('accepts an address derived from our plugin', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(plugin.isValidAddress(accounts[0].address)).toBe(true)
  })

  const invalid = [
    ['empty string', ''],
    ['EVM address', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['Solana address', '5B7yRcuHQggbidX5X3JiZjyaKgufvq8AhC9W7WRFZpQD'],
    ['random string', 'not-an-address'],
    ['Bitcoin address', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
    ['no T prefix', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
  ]

  it.each(invalid)('rejects invalid address: %s', (_label, addr) => {
    expect(plugin.isValidAddress(addr)).toBe(false)
  })
})
