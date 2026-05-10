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
import { WalletType } from '../../../models/WalletType'
import type {
  ChainPlugin,
  DerivedAccount,
  SignRequest,
  SignResult,
} from '../types'
import { chainRegistry } from '../registry'

const DERIVATION_BASE = "m/44'/501'"

function solanaDerivationPath(index: number): string {
  // All nodes hardened (Ed25519 SLIP-0010 requirement)
  // Compatible with Phantom / Solflare default path
  return `${DERIVATION_BASE}/${index}'/0'`
}

function keypairFromSeed(masterSeed: Uint8Array, index: number): Keypair {
  if (!masterSeed || masterSeed.length < 16) {
    throw new Error('Invalid masterSeed: must be at least 16 bytes')
  }
  const seedHex = Buffer.from(masterSeed).toString('hex')
  const path = solanaDerivationPath(index)
  const { key } = derivePath(path, seedHex)
  return Keypair.fromSeed(Uint8Array.from(key))
}

function keypairFromHexKey(hexPrivateKey: string): Keypair {
  return Keypair.fromSeed(ethers.getBytes(hexPrivateKey))
}

function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// ── Public API (formerly SolanaKeyService) ───────────────────────────────────

export interface DerivedSolanaWallet {
  index: number
  address: string
  /** Hex-encoded 32-byte Ed25519 seed. In-memory only — never persisted. */
  privateKey: string
  type: WalletType
  path: string
}

export class SolanaKeyService {
  static derivationPath(index: number): string {
    return solanaDerivationPath(index)
  }

  static deriveKeypair(masterSeed: Uint8Array, index = 0): Keypair {
    return keypairFromSeed(masterSeed, index)
  }

  static keypairFromStoredKey(hexPrivateKey: string): Keypair {
    return keypairFromHexKey(hexPrivateKey)
  }

  static deriveWallets(
    masterSeed: Uint8Array,
    count = 5
  ): DerivedSolanaWallet[] {
    return Array.from({ length: count }, (_, i) => {
      const keypair = keypairFromSeed(masterSeed, i)
      return {
        index: i,
        address: keypair.publicKey.toBase58(),
        // Keypair.secretKey is 64 bytes (seed || publicKey); only the first 32 are the seed.
        privateKey: ethers.hexlify(keypair.secretKey.slice(0, 32)),
        type: WalletType.EOA,
        path: solanaDerivationPath(i),
      }
    })
  }

  static isValidAddress(address: string): boolean {
    return isValidAddress(address)
  }
}

// ── Chain Plugin ─────────────────────────────────────────────────────────────

class SolanaChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.Solana

  deriveAccounts(masterSeed: Uint8Array, count: number): DerivedAccount[] {
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
    return isValidAddress(address)
  }

  async signTransaction(
    privateKey: string,
    req: SignRequest
  ): Promise<SignResult> {
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
      })
    )

    const signature = await connection.sendTransaction(tx, [keypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )

    return { rawTx: signature, txHash: signature }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async broadcastTransaction(
    _signed: SignResult,
    _rpcUrl: string
  ): Promise<string> {
    return _signed.txHash ?? _signed.rawTx
  }
}

chainRegistry.register(new SolanaChainPlugin())
