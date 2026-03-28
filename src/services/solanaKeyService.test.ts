import { describe, it, expect } from 'vitest'
import { ethers } from 'ethers'
import { SolanaKeyService } from './wallet/solanaKeyService'
import { WalletType } from '../models/WalletType'

// ─── Test seeds ──────────────────────────────────────────────────────────────

// SLIP-0010 Test Vector 2 (32 bytes, non-trivial pattern)
const KNOWN_SEED = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex',
)

// ─── TC-SOL-KEY-01 · Deterministic derivation ─────────────────────────────

describe('TC-SOL-KEY-01: deterministic address derivation', () => {
  it('returns a valid Base58 Solana address', () => {
    const keypair = SolanaKeyService.deriveKeypair(KNOWN_SEED, 0)
    const address = keypair.publicKey.toBase58()
    // Base58 alphabet, 32-44 characters, no 0x prefix
    expect(address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
    expect(address).not.toMatch(/^0x/)
  })

  it('always produces the same address for the same seed + index', () => {
    const a1 = SolanaKeyService.deriveKeypair(KNOWN_SEED, 0).publicKey.toBase58()
    const a2 = SolanaKeyService.deriveKeypair(KNOWN_SEED, 0).publicKey.toBase58()
    expect(a1).toBe(a2)
  })

  it('matches the pre-computed reference address (SLIP-0010 Test Vector 2)', () => {
    // Reference value computed with ed25519-hd-key + @solana/web3.js,
    // path m/44'/501'/0'/0'  — cross-check with Phantom wallet for extra confidence.
    const expected = '5B7yRcuHQggbidX5X3JiZjyaKgufvq8AhC9W7WRFZpQD'
    const address = SolanaKeyService.deriveKeypair(KNOWN_SEED, 0).publicKey.toBase58()
    expect(address).toBe(expected)
  })

  it('index=1 reference address is stable', () => {
    const expected = 'Gd9D9tDexM6UpsQqCwTyQKvSZdNCGFxNzPRGaxMn9hu9'
    expect(SolanaKeyService.deriveKeypair(KNOWN_SEED, 1).publicKey.toBase58()).toBe(expected)
  })
})

// ─── TC-SOL-KEY-02 · Multi-account isolation ──────────────────────────────

describe('TC-SOL-KEY-02: multi-account isolation', () => {
  it('derives 5 unique addresses from the same seed', () => {
    const wallets = SolanaKeyService.deriveWallets(KNOWN_SEED, 5)
    const addresses = wallets.map((w) => w.address)
    const unique = new Set(addresses)
    expect(unique.size).toBe(5)
  })

  it('index=0 address is reproducible after batch derivation', () => {
    const single = SolanaKeyService.deriveKeypair(KNOWN_SEED, 0).publicKey.toBase58()
    const batch = SolanaKeyService.deriveWallets(KNOWN_SEED, 5)
    expect(batch[0].address).toBe(single)
  })

  it('deriveWallets assigns correct metadata', () => {
    const wallets = SolanaKeyService.deriveWallets(KNOWN_SEED, 3)
    wallets.forEach((w, i) => {
      expect(w.index).toBe(i)
      expect(w.type).toBe(WalletType.EOA)
      expect(w.path).toBe(`m/44'/501'/${i}'/0'`)
      // privateKey is a 0x-prefixed 32-byte hex string
      expect(w.privateKey).toMatch(/^0x[0-9a-f]{64}$/)
    })
  })
})

// ─── TC-SOL-KEY-03 · EVM ≠ Solana key isolation ───────────────────────────

describe('TC-SOL-KEY-03: EVM and Solana keys are independent', () => {
  it('Solana privateKey differs from the EVM privateKey at the same account index', () => {
    const solWallets = SolanaKeyService.deriveWallets(KNOWN_SEED, 1)
    const solPrivKey = solWallets[0].privateKey

    // EVM derivation via ethers
    const seedHex = ethers.hexlify(KNOWN_SEED)
    const evmRoot = ethers.HDNodeWallet.fromSeed(seedHex)
    const evmChild = evmRoot.derivePath("m/44'/60'/0'/0/0")
    const evmPrivKey = evmChild.privateKey

    expect(solPrivKey).not.toBe(evmPrivKey)
    expect(solPrivKey.toLowerCase()).not.toBe(evmPrivKey.toLowerCase())
  })

  it('Solana address is never an EVM-style 0x address', () => {
    const { address } = SolanaKeyService.deriveWallets(KNOWN_SEED, 1)[0]
    expect(address).not.toMatch(/^0x/)
  })
})

// ─── TC-SOL-KEY-04 · Invalid seed handling ────────────────────────────────

describe('TC-SOL-KEY-04: invalid masterSeed handling', () => {
  it('throws on empty Uint8Array', () => {
    expect(() => SolanaKeyService.deriveKeypair(new Uint8Array(0), 0)).toThrow()
  })

  it('throws on seed shorter than 16 bytes', () => {
    expect(() => SolanaKeyService.deriveKeypair(new Uint8Array(8), 0)).toThrow()
  })

  it('accepts an all-zero 32-byte seed (technically valid)', () => {
    const zeroSeed = new Uint8Array(32)
    const address = SolanaKeyService.deriveKeypair(zeroSeed, 0).publicKey.toBase58()
    expect(address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  })
})

// ─── TC-SOL-KEY-05 · keypairFromStoredKey round-trip ─────────────────────

describe('keypairFromStoredKey: round-trip restore', () => {
  it('restores the same public key from the stored hex private key', () => {
    const original = SolanaKeyService.deriveKeypair(KNOWN_SEED, 0)
    const storedHex = ethers.hexlify(original.secretKey.slice(0, 32))
    const restored = SolanaKeyService.keypairFromStoredKey(storedHex)
    expect(restored.publicKey.toBase58()).toBe(original.publicKey.toBase58())
  })
})

// ─── TC-SOL-ADDR-01 · Address validation ─────────────────────────────────

describe('TC-SOL-ADDR-01: isValidAddress', () => {
  const valid = [
    ['System Program', '11111111111111111111111111111111'],
    ['Native SOL Token Mint', 'So11111111111111111111111111111111111111112'],
    ['USDC Mint', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
    ['derived address', SolanaKeyService.deriveKeypair(KNOWN_SEED, 0).publicKey.toBase58()],
  ]

  const invalid = [
    ['empty string', ''],
    ['EVM address', '0x1234567890abcdef1234567890abcdef12345678'],
    ['random string', 'invalid-address-string'],
    ['45-char too long', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    ['spaces', 'EPjFWdd5 AufqSSqeM2qN1xzybap'],
  ]

  it.each(valid)('accepts valid address: %s', (_label, addr) => {
    expect(SolanaKeyService.isValidAddress(addr)).toBe(true)
  })

  it.each(invalid)('rejects invalid address: %s', (_label, addr) => {
    expect(SolanaKeyService.isValidAddress(addr)).toBe(false)
  })
})
