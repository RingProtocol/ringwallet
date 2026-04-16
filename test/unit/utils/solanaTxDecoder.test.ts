import { describe, it, expect } from 'vitest'
import {
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { decodeSolanaTx } from '@/utils/solanaTxDecoder'

function buildSignedSolTransfer(amount: number): {
  serialized: Buffer
  sender: string
  recipient: string
} {
  const sender = Keypair.generate()
  const recipient = Keypair.generate()

  const tx = new Transaction({
    recentBlockhash: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
    feePayer: sender.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient.publicKey,
      lamports: Math.round(amount * LAMPORTS_PER_SOL),
    })
  )

  tx.sign(sender)
  const serialized = Buffer.from(tx.serialize())

  return {
    serialized,
    sender: sender.publicKey.toBase58(),
    recipient: recipient.publicKey.toBase58(),
  }
}

describe('decodeSolanaTx', () => {
  it('decodes a simple SOL transfer', () => {
    const { serialized, sender, recipient } = buildSignedSolTransfer(1.5)
    const result = decodeSolanaTx(serialized, 'SOL')

    expect(result).not.toBeNull()
    expect(result!.from).toContain(sender.slice(0, 6))
    expect(result!.to).toContain(recipient.slice(0, 6))
    expect(result!.amount).toBe('1.5 SOL')
    expect(result!.program).toBe('System Program')
    expect(result!.estimatedFee).toContain('SOL')
    expect(result!.blockhash).toBeTruthy()
  })

  it('handles fractional amounts correctly', () => {
    const { serialized } = buildSignedSolTransfer(0.001)
    const result = decodeSolanaTx(serialized)

    expect(result).not.toBeNull()
    expect(result!.amount).toBe('0.001 SOL')
  })

  it('handles whole number amounts', () => {
    const { serialized } = buildSignedSolTransfer(5)
    const result = decodeSolanaTx(serialized)

    expect(result).not.toBeNull()
    expect(result!.amount).toBe('5 SOL')
  })

  it('uses custom nativeSymbol', () => {
    const { serialized } = buildSignedSolTransfer(2)
    const result = decodeSolanaTx(serialized, 'devSOL')

    expect(result).not.toBeNull()
    expect(result!.amount).toBe('2 devSOL')
    expect(result!.estimatedFee).toContain('devSOL')
  })

  it('returns null for invalid data', () => {
    expect(decodeSolanaTx(Buffer.from('deadbeef', 'hex'))).toBeNull()
    expect(decodeSolanaTx(Buffer.alloc(0))).toBeNull()
  })
})
