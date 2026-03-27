import { describe, it, expect } from 'vitest'
import { ethers } from 'ethers'
import { BitcoinKeyService } from './bitcoinKeyService'
import { BitcoinService } from './bitcoinService'
import { SolanaKeyService } from './solanaKeyService'
import { WalletType } from '../models/WalletType'

// ─── Test seeds ──────────────────────────────────────────────────────────────

const KNOWN_SEED = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex',
)

const TEST_SEED = new Uint8Array(32).fill(1)

// ─── TC-BTC-KEY-01 · Standard path derivation ───────────────────────────────

describe('TC-BTC-KEY-01: standard BIP44 path P2WPKH address derivation', () => {
  it('returns a Bech32 address starting with bc1q (mainnet)', () => {
    const { address } = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0)
    expect(address).toMatch(/^bc1q/)
  })

  it('always produces the same address for the same seed + index', () => {
    const a1 = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0).address
    const a2 = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0).address
    expect(a1).toBe(a2)
  })

  it('matches pre-computed reference address at index 0', () => {
    const { address } = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0)
    expect(address).toBe('bc1q67ngcrqr76xxusp5fksmnxqq8cvxcx68eg9zqx')
  })

  it('matches pre-computed reference address at index 1', () => {
    const { address } = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 1)
    expect(address).toBe('bc1q8507dt06tldnpapj9mv9k0mxjyvldpgve8qsq3')
  })

  it('derives valid private and public keys', () => {
    const { privateKey, publicKey } = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0)
    expect(privateKey).toBeInstanceOf(Buffer)
    expect(privateKey.length).toBe(32)
    expect(publicKey).toBeInstanceOf(Buffer)
    expect(publicKey.length).toBe(33) // compressed secp256k1 public key
  })
})

// ─── TC-BTC-KEY-02 · Multi-account isolation ────────────────────────────────

describe('TC-BTC-KEY-02: multi-account derivation isolation', () => {
  it('derives 5 unique addresses from the same seed', () => {
    const wallets = BitcoinKeyService.deriveWallets(KNOWN_SEED, 5, false)
    const addresses = wallets.map(w => w.address)
    const unique = new Set(addresses)
    expect(unique.size).toBe(5)
  })

  it('index=0 is reproducible after batch derivation', () => {
    const single = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0).address
    const batch = BitcoinKeyService.deriveWallets(KNOWN_SEED, 5, false)
    expect(batch[0].address).toBe(single)
  })

  it('deriveWallets assigns correct metadata', () => {
    const wallets = BitcoinKeyService.deriveWallets(KNOWN_SEED, 3, false)
    wallets.forEach((w, i) => {
      expect(w.index).toBe(i)
      expect(w.type).toBe(WalletType.EOA)
      expect(w.path).toBe(`m/44'/0'/0'/0/${i}`)
      expect(w.isTestnet).toBe(false)
      expect(w.privateKey).toMatch(/^0x[0-9a-f]{64}$/)
      expect(w.publicKey).toMatch(/^0x[0-9a-f]+$/)
      expect(w.address).toMatch(/^bc1q/)
    })
  })

  it('derives all 5 known addresses', () => {
    const expected = [
      'bc1q67ngcrqr76xxusp5fksmnxqq8cvxcx68eg9zqx',
      'bc1q8507dt06tldnpapj9mv9k0mxjyvldpgve8qsq3',
      'bc1qmtcdm5z2u5haf29u58mzkuenwrq6acpxuggj0w',
      'bc1qkpf3598jrq32gzjtwlrq88ygushytler84804c',
      'bc1qpkgplpzcswc5g7upsz7g5q4amn8yehq26znz3x',
    ]
    const wallets = BitcoinKeyService.deriveWallets(KNOWN_SEED, 5, false)
    wallets.forEach((w, i) => {
      expect(w.address).toBe(expected[i])
    })
  })
})

// ─── TC-BTC-KEY-03 · EVM / Solana / Bitcoin key isolation ───────────────────

describe('TC-BTC-KEY-03: cross-chain key isolation', () => {
  it('Bitcoin privateKey differs from EVM privateKey at the same account index', () => {
    const btcWallets = BitcoinKeyService.deriveWallets(KNOWN_SEED, 1, false)
    const btcPrivKey = btcWallets[0].privateKey

    const evmRoot = ethers.HDNodeWallet.fromSeed(ethers.hexlify(KNOWN_SEED))
    const evmChild = evmRoot.derivePath("m/44'/60'/0'/0/0")
    const evmPrivKey = evmChild.privateKey

    expect(btcPrivKey).not.toBe(evmPrivKey)
    expect(btcPrivKey.toLowerCase()).not.toBe(evmPrivKey.toLowerCase())
  })

  it('Bitcoin privateKey differs from Solana privateKey', () => {
    const btcWallets = BitcoinKeyService.deriveWallets(KNOWN_SEED, 1, false)
    const solWallets = SolanaKeyService.deriveWallets(KNOWN_SEED, 1)

    expect(btcWallets[0].privateKey).not.toBe(solWallets[0].privateKey)
  })

  it('all three addresses are in different formats', () => {
    const btcAddr = BitcoinKeyService.deriveWallets(KNOWN_SEED, 1, false)[0].address
    const solAddr = SolanaKeyService.deriveWallets(KNOWN_SEED, 1)[0].address

    const evmRoot = ethers.HDNodeWallet.fromSeed(ethers.hexlify(KNOWN_SEED))
    const evmAddr = evmRoot.derivePath("m/44'/60'/0'/0/0").address

    expect(btcAddr).toMatch(/^bc1q/)
    expect(solAddr).not.toMatch(/^bc1/)
    expect(solAddr).not.toMatch(/^0x/)
    expect(evmAddr).toMatch(/^0x/)
  })
})

// ─── TC-BTC-KEY-04 · Invalid seed handling ──────────────────────────────────

describe('TC-BTC-KEY-04: invalid masterSeed handling', () => {
  it('throws on empty Uint8Array', () => {
    expect(() => BitcoinKeyService.deriveAccountNode(new Uint8Array(0), false, 0)).toThrow()
  })

  it('throws on seed shorter than 16 bytes', () => {
    expect(() => BitcoinKeyService.deriveAccountNode(new Uint8Array(8), false, 0)).toThrow()
  })

  it('accepts an all-zero 32-byte seed (BIP32 allows it)', () => {
    const zeroSeed = new Uint8Array(32)
    const { address } = BitcoinKeyService.deriveAccountNode(zeroSeed, false, 0)
    expect(address).toMatch(/^bc1q/)
    expect(address).toBe('bc1qpjrgeazc0p73zp22zel776j2j4g5t02c67wp2g')
  })
})

// ─── TC-BTC-KEY-05 · Testnet vs Mainnet isolation ──────────────────────────

describe('TC-BTC-KEY-05: testnet vs mainnet address isolation', () => {
  it('testnet address differs from mainnet address', () => {
    const mainnet = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0).address
    const testnet = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, true, 0).address
    expect(mainnet).not.toBe(testnet)
  })

  it('mainnet address starts with bc1q', () => {
    const { address } = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0)
    expect(address).toMatch(/^bc1q/)
  })

  it('testnet address starts with tb1q', () => {
    const { address } = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, true, 0)
    expect(address).toMatch(/^tb1q/)
  })

  it('testnet reference address matches', () => {
    const { address } = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, true, 0)
    expect(address).toBe('tb1qrl7az7l9gwsnaz2hwsytzygxe7x4phm3ghecq4')
  })

  it('testnet wallets have correct path with coin_type=1', () => {
    const wallets = BitcoinKeyService.deriveWallets(KNOWN_SEED, 2, true)
    expect(wallets[0].path).toBe("m/44'/1'/0'/0/0")
    expect(wallets[1].path).toBe("m/44'/1'/0'/0/1")
    expect(wallets[0].isTestnet).toBe(true)
  })
})

// ─── TC-BTC-ADDR · Address validation ───────────────────────────────────────

describe('TC-BTC-ADDR-01: isValidAddress', () => {
  const validAddresses: [string, string][] = [
    ['BIP173 test vector', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
    ['derived mainnet', BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0).address],
    ['testnet P2WPKH', 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'],
    ['derived testnet', BitcoinKeyService.deriveAccountNode(KNOWN_SEED, true, 0).address],
  ]

  const invalidAddresses: [string, string][] = [
    ['P2PKH (legacy)', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
    ['P2SH (legacy)', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'],
    ['EVM address', '0x1234567890abcdef1234567890abcdef12345678'],
    ['Solana address', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
    ['random string', 'invalid-address-string'],
    ['empty string', ''],
  ]

  it.each(validAddresses)('accepts valid: %s', (_label, addr) => {
    expect(BitcoinKeyService.isValidAddress(addr)).toBe(true)
  })

  it.each(invalidAddresses)('rejects invalid: %s', (_label, addr) => {
    expect(BitcoinKeyService.isValidAddress(addr)).toBe(false)
  })

  it('rejects mainnet address when isTestnet=true', () => {
    expect(BitcoinKeyService.isValidAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', true)).toBe(false)
  })

  it('rejects testnet address when isTestnet=false', () => {
    expect(BitcoinKeyService.isValidAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', false)).toBe(false)
  })

  it('accepts both prefixes when isTestnet is undefined', () => {
    expect(BitcoinKeyService.isValidAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true)
    expect(BitcoinKeyService.isValidAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx')).toBe(true)
  })
})

// ─── TC-BTC-FEE · Unit conversion ───────────────────────────────────────────

describe('TC-BTC-FEE: satoshi / BTC unit conversion', () => {
  it('satsToBtc converts correctly', () => {
    expect(BitcoinService.satsToBtc(100_000_000)).toBe('1.00000000')
    expect(BitcoinService.satsToBtc(50_000)).toBe('0.00050000')
    expect(BitcoinService.satsToBtc(1)).toBe('0.00000001')
    expect(BitcoinService.satsToBtc(0)).toBe('0.00000000')
  })

  it('btcToSats converts correctly', () => {
    expect(BitcoinService.btcToSats(1)).toBe(100_000_000)
    expect(BitcoinService.btcToSats(0.001)).toBe(100_000)
    expect(BitcoinService.btcToSats(0.00000001)).toBe(1)
    expect(BitcoinService.btcToSats(0)).toBe(0)
  })

  it('round-trip: btcToSats(satsToBtc(n)) === n', () => {
    const values = [1, 546, 10_000, 50_000, 100_000_000, 2_100_000_000_000_000]
    for (const v of values) {
      expect(BitcoinService.btcToSats(parseFloat(BitcoinService.satsToBtc(v)))).toBe(v)
    }
  })
})

// ─── TC-BTC-UTXO · Coin selection (unit-level) ─────────────────────────────

describe('TC-BTC-UTXO: coin selection logic', () => {
  // These tests exercise the coin-selection and change logic by mocking fetch
  // inside BitcoinService.buildAndSignTransaction.

  const MOCK_SEED = KNOWN_SEED
  const address = BitcoinKeyService.deriveAccountNode(MOCK_SEED, false, 0).address

  const makeMockService = (utxos: { txid: string; vout: number; value: number }[], feeRate = 5) => {
    const service = new BitcoinService('https://mock.api', false)

    // Mock fetch for UTXOs and fee estimates
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('/utxo')) {
        return { ok: true, json: async () => utxos.map(u => ({ ...u, status: { confirmed: true } })) } as Response
      }
      if (urlStr.includes('/fee-estimates')) {
        return { ok: true, json: async () => ({ '3': feeRate, '6': feeRate }) } as Response
      }
      return originalFetch(url as RequestInfo)
    }) as typeof fetch

    return { service, cleanup: () => { globalThis.fetch = originalFetch } }
  }

  it('selects single UTXO when it covers the amount', async () => {
    const { service, cleanup } = makeMockService([
      { txid: 'a'.repeat(64), vout: 0, value: 50_000 },
      { txid: 'b'.repeat(64), vout: 1, value: 30_000 },
    ])

    try {
      const targetAddr = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
      const { txHex, fee } = await service.buildAndSignTransaction({
        fromAddress: address,
        toAddress: targetAddr,
        amountSats: 10_000,
        masterSeed: MOCK_SEED,
        addressIndex: 0,
        feeRate: 2,
      })
      expect(txHex).toBeTruthy()
      expect(typeof txHex).toBe('string')
      expect(fee).toBeGreaterThan(0)
      expect(fee).toBeLessThan(5000) // reasonable for 2 sat/vB
    } finally {
      cleanup()
    }
  })

  it('throws on insufficient balance', async () => {
    const { service, cleanup } = makeMockService([
      { txid: 'a'.repeat(64), vout: 0, value: 1_000 },
    ])

    try {
      await expect(
        service.buildAndSignTransaction({
          fromAddress: address,
          toAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          amountSats: 50_000,
          masterSeed: MOCK_SEED,
          addressIndex: 0,
          feeRate: 2,
        }),
      ).rejects.toThrow(/Insufficient balance/)
    } finally {
      cleanup()
    }
  })

  it('throws on empty UTXO set', async () => {
    const { service, cleanup } = makeMockService([])

    try {
      await expect(
        service.buildAndSignTransaction({
          fromAddress: address,
          toAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          amountSats: 10_000,
          masterSeed: MOCK_SEED,
          addressIndex: 0,
        }),
      ).rejects.toThrow(/No UTXOs/)
    } finally {
      cleanup()
    }
  })

  it('change below dust threshold is folded into fee', async () => {
    // 10_600 sats UTXO, send 10_000 sats — change would be tiny
    const { service, cleanup } = makeMockService([
      { txid: 'c'.repeat(64), vout: 0, value: 10_600 },
    ])

    try {
      const { txHex, fee } = await service.buildAndSignTransaction({
        fromAddress: address,
        toAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        amountSats: 10_000,
        masterSeed: MOCK_SEED,
        addressIndex: 0,
        feeRate: 1,
      })
      expect(txHex).toBeTruthy()
      // Fee should be close to 600 sats (the remainder), since change < dust
      expect(fee).toBe(600)
    } finally {
      cleanup()
    }
  })

  it('produces change output when remainder is above dust threshold', async () => {
    const { service, cleanup } = makeMockService([
      { txid: 'd'.repeat(64), vout: 0, value: 100_000 },
    ])

    try {
      const { txHex, fee } = await service.buildAndSignTransaction({
        fromAddress: address,
        toAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        amountSats: 50_000,
        masterSeed: MOCK_SEED,
        addressIndex: 0,
        feeRate: 2,
      })
      expect(txHex).toBeTruthy()
      // With 100k input, 50k send, and ~220 sats fee at 2 sat/vB,
      // the change (~49780) is well above 546 dust
      expect(fee).toBeLessThan(1000)
      expect(fee).toBeGreaterThan(0)
    } finally {
      cleanup()
    }
  })

  it('rejects invalid recipient address', async () => {
    const { service, cleanup } = makeMockService([
      { txid: 'e'.repeat(64), vout: 0, value: 100_000 },
    ])

    try {
      await expect(
        service.buildAndSignTransaction({
          fromAddress: address,
          toAddress: '0xinvalid',
          amountSats: 10_000,
          masterSeed: MOCK_SEED,
          addressIndex: 0,
        }),
      ).rejects.toThrow(/Invalid recipient/)
    } finally {
      cleanup()
    }
  })
})

// ─── TC-BTC-PSBT · Signed transaction structure ────────────────────────────

describe('TC-BTC-PSBT: PSBT signature verification', () => {
  const address = BitcoinKeyService.deriveAccountNode(KNOWN_SEED, false, 0).address

  it('produces a valid hex-encoded transaction', async () => {
    const service = new BitcoinService('https://mock.api', false)
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      if (urlStr.includes('/utxo')) {
        return {
          ok: true,
          json: async () => [{ txid: 'f'.repeat(64), vout: 0, value: 100_000, status: { confirmed: true } }],
        } as Response
      }
      if (urlStr.includes('/fee-estimates')) {
        return { ok: true, json: async () => ({ '3': 5 }) } as Response
      }
      return originalFetch(url as RequestInfo)
    }) as typeof fetch

    try {
      const { txHex } = await service.buildAndSignTransaction({
        fromAddress: address,
        toAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        amountSats: 30_000,
        masterSeed: KNOWN_SEED,
        addressIndex: 0,
        feeRate: 5,
      })

      // Valid hex string
      expect(txHex).toMatch(/^[0-9a-f]+$/i)
      // Minimum realistic raw tx length
      expect(txHex.length).toBeGreaterThan(100)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
