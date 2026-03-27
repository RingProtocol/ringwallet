import * as bitcoin from 'bitcoinjs-lib'
import { BIP32Factory, type BIP32Interface } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { ethers } from 'ethers'
import { ChainFamily } from '../../../models/ChainType'
import type { ChainPlugin, DerivedAccount, SignRequest, SignResult } from '../types'
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

function deriveNode(masterSeed: Uint8Array, isTestnet: boolean, index: number): BIP32Interface {
  const network = getNetwork(isTestnet)
  const root = bip32.fromSeed(Buffer.from(masterSeed), network)
  return root.derivePath(derivationPath(index, isTestnet))
}

class BitcoinChainPlugin implements ChainPlugin {
  readonly family = ChainFamily.Bitcoin

  deriveAccounts(masterSeed: Uint8Array, count: number, options?: Record<string, unknown>): DerivedAccount[] {
    if (!masterSeed || masterSeed.length < 16) {
      throw new Error('[BitcoinPlugin] Invalid masterSeed: must be at least 16 bytes')
    }

    const isTestnet = options?.isTestnet === true
    const network = getNetwork(isTestnet)

    return Array.from({ length: count }, (_, i) => {
      const child = deriveNode(masterSeed, isTestnet, i)
      if (!child.privateKey) throw new Error('Missing private key')

      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network,
      })
      if (!address) throw new Error('Failed to derive P2WPKH address')

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
    if (!address) return false
    try {
      const decoded = bitcoin.address.fromBech32(address)
      if (decoded.version !== 0 || decoded.data.length !== 20) return false
      return decoded.prefix === 'bc' || decoded.prefix === 'tb'
    } catch {
      return false
    }
  }

  async signTransaction(_privateKey: string, req: SignRequest): Promise<SignResult> {
    const opts = req.options ?? {}
    const masterSeed = opts.masterSeed as Uint8Array | undefined
    const addressIndex = (opts.addressIndex as number) ?? 0
    const isTestnet = req.chainConfig.network === 'testnet'

    if (!masterSeed) {
      throw new Error('[BitcoinPlugin] masterSeed required in options for Bitcoin signing')
    }

    const { BitcoinService } = await import('../../bitcoinService')

    const service = new BitcoinService(req.rpcUrl, isTestnet)
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

  async broadcastTransaction(signed: SignResult, rpcUrl: string): Promise<string> {
    const { BitcoinService } = await import('../../bitcoinService')
    const isTestnet = rpcUrl.includes('testnet')
    const service = new BitcoinService(rpcUrl, isTestnet)
    return service.broadcast(signed.rawTx)
  }
}

chainRegistry.register(new BitcoinChainPlugin())
