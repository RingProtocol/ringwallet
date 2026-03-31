import { describe, it, expect } from 'vitest'
import { chainRegistry } from '@/services/chainplugins/registry'
import { ChainFamily } from '@/models/ChainType'
import '@/services/chainplugins/cosmos/cosmosPlugin'

const KNOWN_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

describe('CosmosPlugin — deriveAccounts (default coin type 118)', () => {
  const plugin = chainRegistry.get(ChainFamily.Cosmos)!

  it('is registered in the chain registry', () => {
    expect(plugin).toBeDefined()
    expect(plugin.family).toBe(ChainFamily.Cosmos)
  })

  it('derives the requested number of accounts', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 5)
    expect(accounts).toHaveLength(5)
  })

  it('produces valid bech32 addresses with "cosmos" prefix', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    for (const a of accounts) {
      expect(a.address).toMatch(/^cosmos1[a-z0-9]{38}$/)
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

  it("uses BIP44 m/44'/118'/0'/0/{i} derivation paths by default", () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3)
    accounts.forEach((a, i) => {
      expect(a.path).toBe(`m/44'/118'/0'/0/${i}`)
      expect(a.index).toBe(i)
    })
  })

  it('privateKey is a 0x-prefixed 32-byte hex string', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].privateKey).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('meta contains publicKey, coinType, and addressPrefix', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(accounts[0].meta).toBeDefined()
    expect(accounts[0].meta!.publicKey).toMatch(/^0x[0-9a-f]+$/)
    expect(accounts[0].meta!.coinType).toBe(118)
    expect(accounts[0].meta!.addressPrefix).toBe('cosmos')
  })

  it('throws on seed shorter than 16 bytes', () => {
    expect(() => plugin.deriveAccounts(new Uint8Array(8), 1)).toThrow()
  })
})

describe('CosmosPlugin — deriveAccounts with custom options (Provenance)', () => {
  const plugin = chainRegistry.get(ChainFamily.Cosmos)!

  it('derives Provenance addresses with coinType=505, prefix="pb"', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 3, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    for (const a of accounts) {
      expect(a.address).toMatch(/^pb1[a-z0-9]{38}$/)
    }
    expect(accounts[0].meta!.coinType).toBe(505)
    expect(accounts[0].meta!.addressPrefix).toBe('pb')
  })

  it('Provenance path uses coin type 505', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1, { coinType: 505 })
    expect(accounts[0].path).toBe("m/44'/505'/0'/0/0")
  })

  it('Provenance address differs from default Cosmos address', () => {
    const cosmos = plugin.deriveAccounts(KNOWN_SEED, 1)
    const provenance = plugin.deriveAccounts(KNOWN_SEED, 1, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    expect(cosmos[0].address).not.toBe(provenance[0].address)
  })
})

describe('CosmosPlugin — isValidAddress', () => {
  const plugin = chainRegistry.get(ChainFamily.Cosmos)!

  it('accepts an address derived from our plugin', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1)
    expect(plugin.isValidAddress(accounts[0].address)).toBe(true)
  })

  it('accepts a Provenance address derived with custom options', () => {
    const accounts = plugin.deriveAccounts(KNOWN_SEED, 1, {
      coinType: 505,
      addressPrefix: 'pb',
    })
    expect(plugin.isValidAddress(accounts[0].address)).toBe(true)
  })

  const invalid = [
    ['empty string', ''],
    ['EVM address', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['random string', 'not-an-address'],
    ['Tron address', 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW'],
    ['bad checksum', 'cosmos1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'],
  ]

  it.each(invalid)('rejects invalid address: %s', (_label, addr) => {
    expect(plugin.isValidAddress(addr)).toBe(false)
  })
})
