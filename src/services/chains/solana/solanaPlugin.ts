import { derivePath } from 'ed25519-hd-key'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { ethers } from 'ethers'
import { ChainFamily } from '../../../models/ChainType'
import type { ChainPlugin, DerivedAccount, SignRequest, SignResult } from '../types'
import { chainRegistry } from '../registry'

const DERIVATION_BASE = "m/44'/501'"

function solanaDerivationPath(index: number): string {
  return `${DERIVATION_BASE}/${index}'/0'`
}

function keypairFromSeed(masterSeed: Uint8Array, index: number): Keypair {
  const seedHex = Buffer.from(masterSeed).toString('hex')
  const path = solanaDerivationPath(index)
  const { key } = derivePath(path, seedHex)
  return Keypair.fromSeed(Uint8Array.from(key))
}

function keypairFromHexKey(hexPrivateKey: string): Keypair {
  return Keypair.fromSeed(ethers.getBytes(hexPrivateKey))
}

class SolanaChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.Solana

  deriveAccounts(masterSeed: Uint8Array, count: number): DerivedAccount[] {
    if (!masterSeed || masterSeed.length < 16) {
      throw new Error('[SolanaPlugin] Invalid masterSeed: must be at least 16 bytes')
    }

    return Array.from({ length: count }, (_, i) => {
      const keypair = keypairFromSeed(masterSeed, i)
      return {
        index: i,
        address: keypair.publicKey.toBase58(),
        privateKey: ethers.hexlify(keypair.secretKey.slice(0, 32)),
        path: solanaDerivationPath(i),
      }
    })
  }

  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  async signTransaction(privateKey: string, req: SignRequest): Promise<SignResult> {
    const keypair = keypairFromHexKey(privateKey)
    const connection = new Connection(req.rpcUrl, 'confirmed')
    const recipient = new PublicKey(req.to)
    const lamports = Math.round(parseFloat(req.amount) * LAMPORTS_PER_SOL)

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed')

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: keypair.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports,
      }),
    )

    const signature = await connection.sendTransaction(tx, [keypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    )

    return { rawTx: signature, txHash: signature }
  }

  async broadcastTransaction(_signed: SignResult, _rpcUrl: string): Promise<string> {
    // Solana sends + broadcasts in one step via signTransaction above
    return _signed.txHash ?? _signed.rawTx
  }
}

chainRegistry.register(new SolanaChainPlugin())
