import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

export interface DecodedSolanaTx {
  from: string
  to: string
  amount: string
  estimatedFee: string
  blockhash: string
  program: string
}

function truncAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58()

function identifyProgram(programId: string): string {
  if (programId === SYSTEM_PROGRAM_ID) return 'System Program'
  if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    return 'SPL Token'
  if (programId === 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    return 'Associated Token'
  return truncAddr(programId)
}

export function decodeSolanaTx(
  serializedTx: Buffer,
  nativeSymbol = 'SOL'
): DecodedSolanaTx | null {
  try {
    const tx = Transaction.from(serializedTx)

    const feePayer = tx.feePayer?.toBase58() || '(Unknown)'
    const blockhash = tx.recentBlockhash || '(Unknown)'

    let to = '(Unknown)'
    let amount = `0 ${nativeSymbol}`
    let program = 'System Program'

    if (tx.instructions.length > 0) {
      const ix = tx.instructions[0]
      program = identifyProgram(ix.programId.toBase58())

      if (
        ix.programId.equals(SystemProgram.programId) &&
        ix.data.length >= 12
      ) {
        const type = ix.data.readUInt32LE(0)
        if (type === 2 && ix.keys.length >= 2) {
          to = truncAddr(ix.keys[1].pubkey.toBase58())
          const lamports = Number(ix.data.readBigUInt64LE(4))
          const sol = lamports / LAMPORTS_PER_SOL
          const solStr =
            sol % 1 === 0
              ? String(sol)
              : sol.toFixed(9).replace(/0+$/, '').replace(/\.$/, '')
          amount = `${solStr} ${nativeSymbol}`
        }
      }
    }

    return {
      from: truncAddr(feePayer),
      to,
      amount,
      estimatedFee: `~0.000005 ${nativeSymbol}`,
      blockhash: truncAddr(blockhash),
      program,
    }
  } catch {
    return null
  }
}
