import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SolanaService } from './solanaService'
import { SolanaKeyService } from './wallet/solanaKeyService'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetBalance = vi.fn()
const mockGetLatestBlockhash = vi.fn()
const mockSendTransaction = vi.fn()
const mockConfirmTransaction = vi.fn()
const mockGetEstimatedFee = vi.fn()
const mockRequestAirdrop = vi.fn()

// Mock @solana/web3.js Connection without replacing the whole module.
// We intercept at the class level so Transaction / PublicKey etc. still work.
vi.mock('@solana/web3.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/web3.js')>()
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getBalance: mockGetBalance,
      getLatestBlockhash: mockGetLatestBlockhash,
      sendTransaction: mockSendTransaction,
      confirmTransaction: mockConfirmTransaction,
      requestAirdrop: mockRequestAirdrop,
    })),
  }
})

// Transaction.getEstimatedFee is called on an instance; mock the prototype.
vi.mock('@solana/web3.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/web3.js')>()
  class MockTransaction {
    recentBlockhash?: string
    feePayer?: unknown
    constructor(opts?: { recentBlockhash?: string; feePayer?: unknown }) {
      if (opts) Object.assign(this, opts)
    }
    add() { return this }
    async getEstimatedFee() { return mockGetEstimatedFee() }
  }
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getBalance: mockGetBalance,
      getLatestBlockhash: mockGetLatestBlockhash,
      sendTransaction: mockSendTransaction,
      confirmTransaction: mockConfirmTransaction,
      requestAirdrop: mockRequestAirdrop,
    })),
    Transaction: MockTransaction,
  }
})

// ─── Shared test data ─────────────────────────────────────────────────────

const DEVNET_RPC = 'https://api.devnet.solana.com'
const TEST_SEED = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex',
)
const keypair = SolanaKeyService.deriveKeypair(TEST_SEED, 0)
const address = keypair.publicKey.toBase58()

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLatestBlockhash.mockResolvedValue({
    blockhash: 'mock-blockhash-123',
    lastValidBlockHeight: 9999,
  })
  mockConfirmTransaction.mockResolvedValue({ value: { err: null } })
})

// ─── TC-SOL-BAL-02 · Zero-balance address ─────────────────────────────────

describe('TC-SOL-BAL-02: getBalance', () => {
  it('returns 0 for a brand-new address (0 lamports)', async () => {
    mockGetBalance.mockResolvedValue(0)
    const service = new SolanaService(DEVNET_RPC)
    const balance = await service.getBalance(address)
    expect(balance).toBe(0)
  })

  it('converts lamports to SOL correctly (1 SOL = 1_000_000_000 lamports)', async () => {
    mockGetBalance.mockResolvedValue(1_000_000_000)
    const service = new SolanaService(DEVNET_RPC)
    const balance = await service.getBalance(address)
    expect(balance).toBeCloseTo(1.0)
  })

  it('handles fractional SOL (0.5 SOL = 500_000_000 lamports)', async () => {
    mockGetBalance.mockResolvedValue(500_000_000)
    const service = new SolanaService(DEVNET_RPC)
    const balance = await service.getBalance(address)
    expect(balance).toBeCloseTo(0.5)
  })

  it('does not throw for a new address (returns 0, never throws)', async () => {
    mockGetBalance.mockResolvedValue(0)
    const service = new SolanaService(DEVNET_RPC)
    await expect(service.getBalance(address)).resolves.toBe(0)
  })
})

// ─── TC-SOL-TX-01 · sendSOL happy path ────────────────────────────────────

describe('TC-SOL-TX-01: sendSOL', () => {
  it('returns a transaction signature on success', async () => {
    const expectedSig = 'MOCK_SIGNATURE_BASE58_STRING_123'
    mockSendTransaction.mockResolvedValue(expectedSig)

    const service = new SolanaService(DEVNET_RPC)
    const sig = await service.sendSOL(keypair, address, 0.001)
    expect(sig).toBe(expectedSig)
  })

  it('calls sendTransaction with the keypair as signer', async () => {
    mockSendTransaction.mockResolvedValue('sig')
    const service = new SolanaService(DEVNET_RPC)
    await service.sendSOL(keypair, address, 0.001)
    expect(mockSendTransaction).toHaveBeenCalledOnce()
    // second arg is the signers array
    const [, signers] = mockSendTransaction.mock.calls[0]
    expect(signers[0].publicKey.toBase58()).toBe(keypair.publicKey.toBase58())
  })
})

// ─── TC-SOL-TX-02 · sendSOL error propagation ─────────────────────────────

describe('TC-SOL-TX-02: sendSOL error handling', () => {
  it('throws when the RPC rejects (simulated insufficient funds)', async () => {
    mockSendTransaction.mockRejectedValue(
      new Error('Transaction simulation failed: insufficient lamports'),
    )
    const service = new SolanaService(DEVNET_RPC)
    await expect(service.sendSOL(keypair, address, 99999)).rejects.toThrow(
      /insufficient/i,
    )
  })

  it('throws when confirmTransaction reports an on-chain error', async () => {
    mockSendTransaction.mockResolvedValue('sig')
    mockConfirmTransaction.mockResolvedValue({
      value: { err: { InstructionError: [0, 'InsufficientFunds'] } },
    })
    const service = new SolanaService(DEVNET_RPC)
    await expect(service.sendSOL(keypair, address, 0.001)).rejects.toThrow(
      /Transaction failed/,
    )
  })
})

// ─── TC-SOL-TX-03 · estimateFee ───────────────────────────────────────────

describe('TC-SOL-TX-03: estimateFee', () => {
  it('returns a positive fee estimate in SOL', async () => {
    mockGetEstimatedFee.mockResolvedValue(5000) // 5000 lamports ≈ 0.000005 SOL
    const service = new SolanaService(DEVNET_RPC)
    const fee = await service.estimateFee(keypair.publicKey, address, 0.001)
    expect(fee).toBeGreaterThan(0)
    expect(fee).toBeLessThan(0.01) // sanity: SOL tx fee << 0.01 SOL
  })

  it('falls back to 5000 lamports when estimation fails', async () => {
    mockGetLatestBlockhash.mockRejectedValue(new Error('RPC timeout'))
    const service = new SolanaService(DEVNET_RPC)
    const fee = await service.estimateFee(keypair.publicKey, address, 0.001)
    expect(fee).toBeCloseTo(5000 / 1e9)
  })
})

// ─── TC-SOL-RPC-02 · requestAirdrop ───────────────────────────────────────

describe('TC-SOL-RPC-02: requestAirdrop', () => {
  it('calls requestAirdrop with the correct lamport amount', async () => {
    mockRequestAirdrop.mockResolvedValue('airdrop-sig')
    const service = new SolanaService(DEVNET_RPC)
    await service.requestAirdrop(address, 1)
    expect(mockRequestAirdrop).toHaveBeenCalledWith(
      expect.objectContaining({ toBase58: expect.any(Function) }),
      1_000_000_000,
    )
  })
})
