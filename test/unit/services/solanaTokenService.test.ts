import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Connection } from '@solana/web3.js'
import {
  SolanaTokenService,
  ATA_CREATION_FEE_SOL,
} from '@/services/solanaTokenService'
import { SolanaKeyService } from '@/services/wallet/solanaKeyService'

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetTokenAccountBalance = vi.fn()
const mockSendTransaction = vi.fn()
const mockConfirmTransaction = vi.fn()
const mockGetLatestBlockhash = vi.fn()

// Mock @solana/spl-token so we control ATA lookup results
vi.mock('@solana/spl-token', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/spl-token')>()
  return {
    ...actual,
    getAccount: vi.fn(),
    getAssociatedTokenAddress: vi.fn().mockResolvedValue({
      toBase58: () => 'MOCK_ATA_ADDRESS',
      toString: () => 'MOCK_ATA_ADDRESS',
    }),
    createTransferInstruction: vi
      .fn()
      .mockReturnValue({ programId: 'TOKEN_PROGRAM' }),
    createAssociatedTokenAccountInstruction: vi
      .fn()
      .mockReturnValue({ programId: 'ASSOC_TOKEN_PROGRAM' }),
  }
})

// ─── Shared test data ─────────────────────────────────────────────────────

const TEST_SEED = Buffer.from(
  'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  'hex'
)
const keypair = SolanaKeyService.deriveKeypair(TEST_SEED, 0)
const ownerAddress = keypair.publicKey.toBase58()
const USDC_DEVNET_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'

function makeConnection(): Connection {
  return {
    getTokenAccountBalance: mockGetTokenAccountBalance,
    sendTransaction: mockSendTransaction,
    confirmTransaction: mockConfirmTransaction,
    getLatestBlockhash: mockGetLatestBlockhash,
  } as unknown as Connection
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLatestBlockhash.mockResolvedValue({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 9999,
  })
  mockConfirmTransaction.mockResolvedValue({ value: { err: null } })
})

// ─── TC-SOL-BAL-03 · SPL Token balance ────────────────────────────────────

describe('TC-SOL-BAL-03 / TC-SOL-BAL-04: getTokenBalance', () => {
  it('returns the formatted UI balance when ATA exists', async () => {
    mockGetTokenAccountBalance.mockResolvedValue({
      value: { uiAmountString: '10.5' },
    })
    const service = new SolanaTokenService(makeConnection())
    const balance = await service.getTokenBalance(
      ownerAddress,
      USDC_DEVNET_MINT
    )
    expect(balance).toBe('10.5')
  })

  it('TC-SOL-BAL-04: returns "0" when the ATA does not exist (no throw)', async () => {
    mockGetTokenAccountBalance.mockRejectedValue(new Error('Account not found'))
    const service = new SolanaTokenService(makeConnection())
    await expect(
      service.getTokenBalance(ownerAddress, USDC_DEVNET_MINT)
    ).resolves.toBe('0')
  })

  it('returns "0" when uiAmountString is null', async () => {
    mockGetTokenAccountBalance.mockResolvedValue({
      value: { uiAmountString: null },
    })
    const service = new SolanaTokenService(makeConnection())
    const balance = await service.getTokenBalance(
      ownerAddress,
      USDC_DEVNET_MINT
    )
    expect(balance).toBe('0')
  })
})

// ─── TC-SOL-TX-04 · SPL Token transfer (ATA already exists) ──────────────

describe('TC-SOL-TX-04: sendToken when recipient ATA exists', () => {
  it('sends token without creating ATA, returns signature', async () => {
    const { getAccount } = await import('@solana/spl-token')
    vi.mocked(getAccount).mockResolvedValue({} as never) // ATA exists

    mockSendTransaction.mockResolvedValue('TOKEN_TX_SIGNATURE')
    const service = new SolanaTokenService(makeConnection())
    const sig = await service.sendToken(
      keypair,
      ownerAddress,
      USDC_DEVNET_MINT,
      1_000_000n
    )
    expect(sig).toBe('TOKEN_TX_SIGNATURE')
  })

  it('does NOT add createAssociatedTokenAccountInstruction when ATA exists', async () => {
    const { getAccount, createAssociatedTokenAccountInstruction } =
      await import('@solana/spl-token')
    vi.mocked(getAccount).mockResolvedValue({} as never)
    mockSendTransaction.mockResolvedValue('sig')

    const service = new SolanaTokenService(makeConnection())
    await service.sendToken(keypair, ownerAddress, USDC_DEVNET_MINT, 100n)
    expect(createAssociatedTokenAccountInstruction).not.toHaveBeenCalled()
  })
})

// ─── TC-SOL-TX-05 · SPL Token transfer (ATA must be created) ─────────────

describe('TC-SOL-TX-05: sendToken when recipient ATA is missing', () => {
  it('adds createAssociatedTokenAccountInstruction before transfer', async () => {
    const {
      getAccount,
      createAssociatedTokenAccountInstruction,
      TokenAccountNotFoundError,
    } = await import('@solana/spl-token')
    vi.mocked(getAccount).mockRejectedValue(new TokenAccountNotFoundError())
    mockSendTransaction.mockResolvedValue('sig-with-ata-creation')

    const service = new SolanaTokenService(makeConnection())
    await service.sendToken(keypair, ownerAddress, USDC_DEVNET_MINT, 500_000n)
    expect(createAssociatedTokenAccountInstruction).toHaveBeenCalledOnce()
  })
})

// ─── recipientNeedsATA ────────────────────────────────────────────────────

describe('recipientNeedsATA', () => {
  it('returns false when ATA exists', async () => {
    const { getAccount } = await import('@solana/spl-token')
    vi.mocked(getAccount).mockResolvedValue({} as never)

    const service = new SolanaTokenService(makeConnection())
    const needs = await service.recipientNeedsATA(
      ownerAddress,
      USDC_DEVNET_MINT
    )
    expect(needs).toBe(false)
  })

  it('returns true when ATA does not exist', async () => {
    const { getAccount, TokenAccountNotFoundError } =
      await import('@solana/spl-token')
    vi.mocked(getAccount).mockRejectedValue(new TokenAccountNotFoundError())

    const service = new SolanaTokenService(makeConnection())
    const needs = await service.recipientNeedsATA(
      ownerAddress,
      USDC_DEVNET_MINT
    )
    expect(needs).toBe(true)
  })
})

// ─── ATA_CREATION_FEE_SOL constant ───────────────────────────────────────

describe('ATA_CREATION_FEE_SOL', () => {
  it('is approximately 0.002 SOL', () => {
    expect(ATA_CREATION_FEE_SOL).toBeGreaterThan(0.001)
    expect(ATA_CREATION_FEE_SOL).toBeLessThan(0.005)
  })
})
