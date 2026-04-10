import * as bitcoin from 'bitcoinjs-lib'
import { BIP32Factory, type BIP32Interface } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { ethers } from 'ethers'
import { ChainFamily } from '../../../models/ChainType'
import type {
  ChainPlugin,
  DerivedAccount,
  SignRequest,
  SignResult,
} from '../types'
import { chainRegistry } from '../registry'

bitcoin.initEccLib(ecc)
const bip32 = BIP32Factory(ecc)

/** Dogecoin network parameters for bitcoinjs-lib. */
export const DOGECOIN_MAINNET: bitcoin.Network = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: '', // Dogecoin does not use bech32
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e, // D-prefix
  scriptHash: 0x16,
  wif: 0x9e,
}

export const DOGECOIN_TESTNET: bitcoin.Network = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: '',
  bip32: { public: 0x043587cf, private: 0x04358394 },
  pubKeyHash: 0x71, // n-prefix
  scriptHash: 0xc4,
  wif: 0xf1,
}

const MAINNET_PATH = "m/44'/3'/0'/0"
const TESTNET_PATH = "m/44'/1'/0'/0"

export function getNetwork(isTestnet: boolean): bitcoin.Network {
  return isTestnet ? DOGECOIN_TESTNET : DOGECOIN_MAINNET
}

function derivationPath(index: number, isTestnet: boolean): string {
  return `${isTestnet ? TESTNET_PATH : MAINNET_PATH}/${index}`
}

export function deriveNode(
  masterSeed: Uint8Array,
  isTestnet: boolean,
  index: number
): BIP32Interface {
  const network = getNetwork(isTestnet)
  const root = bip32.fromSeed(Buffer.from(masterSeed), network)
  return root.derivePath(derivationPath(index, isTestnet))
}

/** Validate a Dogecoin P2PKH address. */
export function isValidDogecoinAddress(
  address: string,
  isTestnet?: boolean
): boolean {
  if (!address) return false
  try {
    // Try decoding as base58check via bitcoinjs-lib
    const decoded = bitcoin.address.fromBase58Check(address)
    if (isTestnet === true) return decoded.version === 0x71
    if (isTestnet === false) return decoded.version === 0x1e
    return decoded.version === 0x1e || decoded.version === 0x71
  } catch {
    return false
  }
}

class DogecoinChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.Dogecoin

  deriveAccounts(
    masterSeed: Uint8Array,
    count: number,
    options?: Record<string, unknown>
  ): DerivedAccount[] {
    if (!masterSeed || masterSeed.length < 16) {
      throw new Error(
        '[DogecoinPlugin] Invalid masterSeed: must be at least 16 bytes'
      )
    }

    const isTestnet = options?.isTestnet === true
    const network = getNetwork(isTestnet)

    return Array.from({ length: count }, (_, i) => {
      const child = deriveNode(masterSeed, isTestnet, i)
      if (!child.privateKey) throw new Error('Missing private key')

      const { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network,
      })
      if (!address) throw new Error('Failed to derive P2PKH address')

      return {
        index: i,
        address,
        privateKey: ethers.hexlify(Buffer.from(child.privateKey)),
        path: derivationPath(i, isTestnet),
        meta: {
          publicKey: ethers.hexlify(Buffer.from(child.publicKey)),
          isTestnet,
        },
      }
    })
  }

  isValidAddress(address: string): boolean {
    return isValidDogecoinAddress(address)
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
        '[DogecoinPlugin] masterSeed required in options for Dogecoin signing'
      )
    }

    const { DogecoinService } = await import('../../dogecoinService')
    const service = new DogecoinService(req.rpcUrl, isTestnet)
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
    const { DogecoinService } = await import('../../dogecoinService')
    const isTestnet = rpcUrl.includes('testnet')
    const service = new DogecoinService(rpcUrl, isTestnet)
    return service.broadcast(signed.rawTx)
  }
}

chainRegistry.register(new DogecoinChainPlugin())
