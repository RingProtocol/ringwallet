import { ChainFamily, type Chain } from '../../models/ChainType'

export { ChainFamily }

/**
 * Unified account derived from masterSeed.
 * All chain plugins return this same shape.
 */
export interface DerivedAccount {
  index: number
  address: string
  /** Hex-encoded key material (typically 32 bytes). In-memory only — never persisted to server. */
  privateKey: string
  /** BIP derivation path, e.g. "m/44'/60'/0'/0/0" */
  path: string
  /** Chain-specific extras (e.g. Bitcoin publicKey, testnet flag). */
  meta?: Record<string, unknown>
}

export interface SignRequest {
  from: string
  to: string
  /** Human-readable amount (e.g. "0.1") */
  amount: string
  rpcUrl: string
  chainConfig: Chain
  /** Chain-specific options (token info, fee rate, etc.) */
  options?: Record<string, unknown>
}

export interface SignResult {
  /** Signed transaction payload (hex or serialized format) */
  rawTx: string
  txHash?: string
  meta?: Record<string, unknown>
}

/**
 * Every chain family implements this interface.
 * New chains are added by creating a plugin file and registering it.
 */
export interface ChainPlugin {
  readonly family: ChainFamily

  /** Derive N accounts from a 32-byte masterSeed. */
  deriveAccounts(masterSeed: Uint8Array, count: number): DerivedAccount[]

  /** Check whether an address string is valid for this chain. */
  isValidAddress(address: string): boolean

  /** Sign a transaction. The privateKey comes from DerivedAccount. */
  signTransaction(privateKey: string, request: SignRequest): Promise<SignResult>

  /** Broadcast an already-signed transaction. Returns tx hash / signature. */
  broadcastTransaction(signed: SignResult, rpcUrl: string): Promise<string>
}
