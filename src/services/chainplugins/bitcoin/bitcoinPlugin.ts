import * as bitcoin from 'bitcoinjs-lib'
import { BIP32Factory, type BIP32Interface } from 'bip32'
import * as ecc from 'tiny-secp256k1'
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

bitcoin.initEccLib(ecc)
const bip32 = BIP32Factory(ecc)

const MAINNET_BASE = "m/44'/0'/0'/0"
const TESTNET_BASE = "m/44'/1'/0'/0"

function getNetwork(isTestnet: boolean): bitcoin.Network {
  return isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
}

function derivationPath(index: number, isTestnet: boolean): string {
  return `${isTestnet ? TESTNET_BASE : MAINNET_BASE}/${index}`
}

function deriveNode(
  masterSeed: Uint8Array,
  isTestnet: boolean,
  index: number
): BIP32Interface {
  if (!masterSeed || masterSeed.length < 16) {
    throw new Error('Invalid masterSeed: must be at least 16 bytes')
  }
  const network = getNetwork(isTestnet)
  const root = bip32.fromSeed(Buffer.from(masterSeed), network)
  return root.derivePath(derivationPath(index, isTestnet))
}

function deriveAccountNode(
  masterSeed: Uint8Array,
  isTestnet: boolean,
  addressIndex = 0
): { privateKey: Buffer; publicKey: Buffer; address: string } {
  const network = getNetwork(isTestnet)
  const child = deriveNode(masterSeed, isTestnet, addressIndex)
  if (!child.privateKey) throw new Error('Missing private key')

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network,
  })
  if (!address) throw new Error('Failed to derive P2WPKH address')

  return {
    privateKey: Buffer.from(child.privateKey),
    publicKey: Buffer.from(child.publicKey),
    address,
  }
}

function isValidAddress(addr: string, isTestnet?: boolean): boolean {
  if (!addr) return false
  try {
    const decoded = bitcoin.address.fromBech32(addr)
    if (decoded.version !== 0 || decoded.data.length !== 20) return false
    if (isTestnet === true) return decoded.prefix === 'tb'
    if (isTestnet === false) return decoded.prefix === 'bc'
    return decoded.prefix === 'bc' || decoded.prefix === 'tb'
  } catch {
    return false
  }
}

// ── Public API (formerly BitcoinKeyService) ──────────────────────────────────

export interface DerivedBitcoinWallet {
  index: number
  address: string
  /** Hex-encoded 32-byte secp256k1 private key. In-memory only — never persisted. */
  privateKey: string
  publicKey: string
  type: WalletType
  path: string
  isTestnet: boolean
}

export class BitcoinKeyService {
  static getNetwork(isTestnet: boolean): bitcoin.Network {
    return getNetwork(isTestnet)
  }

  static derivationPath(index: number, isTestnet: boolean): string {
    return derivationPath(index, isTestnet)
  }

  static deriveNode(
    masterSeed: Uint8Array,
    isTestnet: boolean,
    addressIndex = 0
  ): BIP32Interface {
    return deriveNode(masterSeed, isTestnet, addressIndex)
  }

  static deriveAccountNode(
    masterSeed: Uint8Array,
    isTestnet: boolean,
    addressIndex = 0
  ) {
    return deriveAccountNode(masterSeed, isTestnet, addressIndex)
  }

  static getSigner(
    masterSeed: Uint8Array,
    isTestnet: boolean,
    addressIndex = 0
  ): BIP32Interface {
    return deriveNode(masterSeed, isTestnet, addressIndex)
  }

  static deriveWallets(
    masterSeed: Uint8Array,
    count = 5,
    isTestnet = false
  ): DerivedBitcoinWallet[] {
    return Array.from({ length: count }, (_, i) => {
      const { privateKey, publicKey, address } = deriveAccountNode(
        masterSeed,
        isTestnet,
        i
      )
      return {
        index: i,
        address,
        privateKey: ethers.hexlify(privateKey),
        publicKey: ethers.hexlify(publicKey),
        type: WalletType.EOA,
        path: derivationPath(i, isTestnet),
        isTestnet,
      }
    })
  }

  static isValidAddress(addr: string, isTestnet?: boolean): boolean {
    return isValidAddress(addr, isTestnet)
  }
}

// ── Chain Plugin ─────────────────────────────────────────────────────────────

class BitcoinChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.Bitcoin

  deriveAccounts(
    masterSeed: Uint8Array,
    count: number,
    options?: Record<string, unknown>
  ): DerivedAccount[] {
    const isTestnet = options?.isTestnet === true

    return Array.from({ length: count }, (_, i) => {
      const { privateKey, publicKey, address } = deriveAccountNode(
        masterSeed,
        isTestnet,
        i
      )
      return {
        index: i,
        address,
        privateKey: ethers.hexlify(privateKey),
        path: derivationPath(i, isTestnet),
        meta: {
          publicKey: ethers.hexlify(publicKey),
          isTestnet,
        },
      }
    })
  }

  isValidAddress(address: string): boolean {
    return isValidAddress(address)
  }

  async signTransaction(
    _privateKey: string,
    req: SignRequest
  ): Promise<SignResult> {
    const opts = req.options ?? {}
    const masterSeed = opts.masterSeed as Uint8Array | undefined
    const addressIndex = (opts.addressIndex as number) ?? 0
    const isTestnet = req.chainConfig.network === 'testnet'

    if (!masterSeed) {
      throw new Error(
        '[BitcoinPlugin] masterSeed required in options for Bitcoin signing'
      )
    }

    const { BitcoinService, bitcoinForkForChain } =
      await import('../../rpc/bitcoinService')

    const service = new BitcoinService(
      req.rpcUrl,
      isTestnet,
      bitcoinForkForChain(req.chainConfig)
    )
    const amountSats = Math.round(parseFloat(req.amount) * 1e8)
    const feeRate = opts.feeRate as number | undefined

    const { txHex, fee } = await service.buildAndSignTransaction({
      fromAddress: req.from,
      toAddress: req.to,
      amountSats,
      masterSeed,
      addressIndex,
      feeRate,
    })

    return { rawTx: txHex, meta: { fee } }
  }

  async broadcastTransaction(
    signed: SignResult,
    rpcUrl: string
  ): Promise<string> {
    const { BitcoinService, inferBitcoinForkFromRpcUrl } =
      await import('../../rpc/bitcoinService')
    const isTestnet = rpcUrl.includes('testnet')
    const service = new BitcoinService(
      rpcUrl,
      isTestnet,
      inferBitcoinForkFromRpcUrl(rpcUrl)
    )
    return service.broadcast(signed.rawTx)
  }
}

chainRegistry.register(new BitcoinChainPlugin())
