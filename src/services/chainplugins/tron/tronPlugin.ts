import { ethers } from 'ethers'
import { ChainFamily } from '../../../models/ChainType'
import type { ChainPlugin, DerivedAccount, SignRequest, SignResult } from '../types'
import { chainRegistry } from '../registry'

const TRON_ADDRESS_PREFIX = 0x41
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function encodeBase58(data: Uint8Array): string {
  const digits = [0]
  for (const byte of data) {
    let carry = byte
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let result = ''
  for (const byte of data) {
    if (byte !== 0) break
    result += BASE58_ALPHABET[0]
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]]
  }
  return result
}

function toBase58Check(payload: Uint8Array): string {
  const hash1 = ethers.getBytes(ethers.sha256(payload))
  const hash2 = ethers.getBytes(ethers.sha256(hash1))
  const checksum = hash2.slice(0, 4)
  const full = new Uint8Array(payload.length + 4)
  full.set(payload)
  full.set(checksum, payload.length)
  return encodeBase58(full)
}

function decodeBase58(str: string): Uint8Array {
  const bytes: number[] = []
  for (const char of str) {
    const idx = BASE58_ALPHABET.indexOf(char)
    if (idx < 0) throw new Error('Invalid Base58 character')
    let carry = idx
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (const char of str) {
    if (char !== BASE58_ALPHABET[0]) break
    bytes.push(0)
  }
  return new Uint8Array(bytes.reverse())
}

function isValidBase58Check(address: string): boolean {
  try {
    const decoded = decodeBase58(address)
    if (decoded.length !== 25) return false
    if (decoded[0] !== TRON_ADDRESS_PREFIX) return false
    const payload = decoded.slice(0, 21)
    const checksum = decoded.slice(21)
    const hash1 = ethers.getBytes(ethers.sha256(payload))
    const hash2 = ethers.getBytes(ethers.sha256(hash1))
    return (
      checksum[0] === hash2[0] &&
      checksum[1] === hash2[1] &&
      checksum[2] === hash2[2] &&
      checksum[3] === hash2[3]
    )
  } catch {
    return false
  }
}

function publicKeyToTronAddress(compressedPubKey: string): string {
  const uncompressed = ethers.SigningKey.computePublicKey(compressedPubKey, false)
  const pubBytes = ethers.getBytes(uncompressed)
  const hash = ethers.keccak256(pubBytes.slice(1))
  const addressBytes = ethers.getBytes(hash).slice(12)
  const payload = new Uint8Array(21)
  payload[0] = TRON_ADDRESS_PREFIX
  payload.set(addressBytes, 1)
  return toBase58Check(payload)
}

/**
 * Convert a Tron Base58Check address (T-prefix) to a 0x-prefixed hex address
 * usable with EVM-compatible JSON-RPC endpoints.
 */
export function tronAddressToHex(tronAddress: string): string {
  const decoded = decodeBase58(tronAddress)
  // 21 bytes payload (0x41 + 20-byte address) + 4 bytes checksum = 25 bytes
  const addressBytes = decoded.slice(1, 21)
  return '0x' + Array.from(addressBytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

class TronChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.Tron

  deriveAccounts(masterSeed: Uint8Array, count: number): DerivedAccount[] {
    if (!masterSeed || masterSeed.length !== 32) {
      console.error('[TronPlugin] Invalid master seed: expected 32 bytes')
      return []
    }

    const seedHex = ethers.hexlify(masterSeed)
    const rootNode = ethers.HDNodeWallet.fromSeed(seedHex)
    const basePath = "m/44'/195'/0'/0"
    const accounts: DerivedAccount[] = []

    for (let i = 0; i < count; i++) {
      const path = `${basePath}/${i}`
      const child = rootNode.derivePath(path)
      const address = publicKeyToTronAddress(child.publicKey)
      accounts.push({
        index: i,
        address,
        privateKey: child.privateKey,
        path,
      })
    }

    return accounts
  }

  isValidAddress(address: string): boolean {
    if (!address || !address.startsWith('T')) return false
    return isValidBase58Check(address)
  }

  async signTransaction(_privateKey: string, _req: SignRequest): Promise<SignResult> {
    // Tron transaction signing requires TronWeb or manual protobuf encoding.
    // Deferred to future implementation — the plugin framework is in place.
    throw new Error('[TronPlugin] signTransaction not yet implemented')
  }

  async broadcastTransaction(_signed: SignResult, _rpcUrl: string): Promise<string> {
    throw new Error('[TronPlugin] broadcastTransaction not yet implemented')
  }
}

chainRegistry.register(new TronChainPlugin())
