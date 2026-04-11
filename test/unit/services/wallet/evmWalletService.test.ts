import { describe, it, expect, vi } from 'vitest'
import { ethers } from 'ethers'
import EvmWalletService from '@/services/chainplugins/evm/evmPlugin'

vi.mock('@/utils/DbgLog', () => ({ log: vi.fn() }))

const KNOWN_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

function deriveEvmPrivateKey(index = 0): string {
  const root = ethers.HDNodeWallet.fromSeed(ethers.hexlify(KNOWN_SEED))
  return root.derivePath(`m/44'/60'/0'/0/${index}`).privateKey
}

// ─── deriveSmartAccount ─────────────────────────────────────────────────

describe('EvmWalletService.deriveSmartAccount', () => {
  const x = new Uint8Array(32).fill(0x11)
  const y = new Uint8Array(32).fill(0x22)

  function makeMapKey(): Map<number, Uint8Array> {
    const m = new Map<number, Uint8Array>()
    m.set(-2, x)
    m.set(-3, y)
    return m
  }

  it('derives a valid EVM address from a Map COSE key', () => {
    const addr = EvmWalletService.deriveSmartAccount(makeMapKey())
    expect(addr).not.toBeNull()
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('is deterministic — same key gives same address', () => {
    const a1 = EvmWalletService.deriveSmartAccount(makeMapKey())
    const a2 = EvmWalletService.deriveSmartAccount(makeMapKey())
    expect(a1).toBe(a2)
  })

  it('different salt produces different address', () => {
    const a0 = EvmWalletService.deriveSmartAccount(makeMapKey(), 0)
    const a1 = EvmWalletService.deriveSmartAccount(makeMapKey(), 1)
    expect(a0).not.toBe(a1)
  })

  it('returns null for null publicKey', () => {
    expect(EvmWalletService.deriveSmartAccount(null as never)).toBeNull()
  })

  it('returns null for empty Map (missing coordinates)', () => {
    expect(EvmWalletService.deriveSmartAccount(new Map())).toBeNull()
  })
})

// ─── buildInitCode ──────────────────────────────────────────────────────

describe('EvmWalletService.buildInitCode', () => {
  const dummyKey = new Map<number, Uint8Array>()
  dummyKey.set(-2, new Uint8Array(32))
  dummyKey.set(-3, new Uint8Array(32))

  it('returns 0x for zero address factory', () => {
    expect(EvmWalletService.buildInitCode(ethers.ZeroAddress, dummyKey)).toBe(
      '0x'
    )
  })

  it('returns 0x for empty string factory', () => {
    expect(EvmWalletService.buildInitCode('', dummyKey)).toBe('0x')
  })

  it('is deterministic — same inputs always produce same output', () => {
    const factoryAddr = ethers.getAddress(
      '0x1234567890abcdef1234567890abcdef12345678'
    )
    const a = EvmWalletService.buildInitCode(factoryAddr, dummyKey, 0)
    const b = EvmWalletService.buildInitCode(factoryAddr, dummyKey, 0)
    expect(a).toBe(b)
  })

  it('returns a hex string (0x or longer) for valid factory', () => {
    const factoryAddr = ethers.getAddress(
      '0x1234567890abcdef1234567890abcdef12345678'
    )
    const initCode = EvmWalletService.buildInitCode(factoryAddr, dummyKey, 0)
    expect(initCode).toMatch(/^0x/)
  })
})

// ─── signTransaction (offline branch — no rpcUrl) ───────────────────────

describe('EvmWalletService.signTransaction (offline, rpcUrl=null)', () => {
  it('returns a valid signed transaction hex', async () => {
    const pk = deriveEvmPrivateKey()
    const wallet = new ethers.Wallet(pk)
    const signed = await EvmWalletService.signTransaction(
      pk,
      wallet.address,
      '0.001',
      11155111
    )
    expect(signed).toMatch(/^0x/)
    expect(signed.length).toBeGreaterThan(100)
  })

  it('is deterministic for same inputs', async () => {
    const pk = deriveEvmPrivateKey()
    const wallet = new ethers.Wallet(pk)
    const a = await EvmWalletService.signTransaction(
      pk,
      wallet.address,
      '0.001',
      1
    )
    const b = await EvmWalletService.signTransaction(
      pk,
      wallet.address,
      '0.001',
      1
    )
    expect(a).toBe(b)
  })

  it('throws when privateKey is missing', async () => {
    await expect(
      EvmWalletService.signTransaction('', '0x' + '1'.repeat(40), '0.001', 1)
    ).rejects.toThrow(/Private key is required/)
  })

  it('throws when recipient address is missing', async () => {
    const pk = deriveEvmPrivateKey()
    await expect(
      EvmWalletService.signTransaction(pk, '', '0.001', 1)
    ).rejects.toThrow(/Recipient address is required/)
  })

  it('throws when amount is missing', async () => {
    const pk = deriveEvmPrivateKey()
    await expect(
      EvmWalletService.signTransaction(pk, '0x' + '1'.repeat(40), '', 1)
    ).rejects.toThrow(/Amount is required/)
  })

  it('encodes ERC-20 transfer when tokenOpts is provided', async () => {
    const pk = deriveEvmPrivateKey()
    const wallet = new ethers.Wallet(pk)
    const signed = await EvmWalletService.signTransaction(
      pk,
      wallet.address,
      '100',
      1,
      null,
      { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 }
    )
    expect(signed).toMatch(/^0x/)
    const parsed = ethers.Transaction.from(signed)
    expect(parsed.to?.toLowerCase()).toBe(
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()
    )
    expect(parsed.value).toBe(0n)
    expect(parsed.data.length).toBeGreaterThan(10)
  })
})
