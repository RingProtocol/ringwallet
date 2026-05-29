/**
 * Test-only helpers for deriving private keys from masterSeed.
 *
 * These are intentionally kept in the test suite so that production code
 * never exposes privateKey, while integration tests can still verify
 * end-to-end signing by deriving the key locally in the test process.
 */

import { ethers } from 'ethers'
import { derivePath } from 'ed25519-hd-key'
import { Keypair } from '@solana/web3.js'

export function deriveEvmPrivateKey(
  masterSeed: Uint8Array,
  path: string
): string {
  const seedHex = ethers.hexlify(masterSeed)
  const root = ethers.HDNodeWallet.fromSeed(seedHex)
  return root.derivePath(path).privateKey
}

export function deriveSolanaPrivateKey(
  masterSeed: Uint8Array,
  path: string
): string {
  const { key } = derivePath(path, Buffer.from(masterSeed).toString('hex'))
  const kp = Keypair.fromSeed(key.slice(0, 32))
  return ethers.hexlify(kp.secretKey.slice(0, 32))
}
