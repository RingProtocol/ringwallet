import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory, type BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { ethers } from 'ethers';
import { WalletType } from '../models/WalletType';

bitcoin.initEccLib(ecc);

const bip32 = BIP32Factory(ecc);

export interface DerivedBitcoinWallet {
  index: number;
  address: string;
  /** Hex-encoded 32-byte secp256k1 private key. In-memory only — never persisted. */
  privateKey: string;
  publicKey: string;
  type: WalletType;
  path: string;
  isTestnet: boolean;
}

const MAINNET_BASE = "m/44'/0'/0'/0";
const TESTNET_BASE = "m/44'/1'/0'/0";

export class BitcoinKeyService {
  static getNetwork(isTestnet: boolean): bitcoin.Network {
    return isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
  }

  static derivationPath(index: number, isTestnet: boolean): string {
    return `${isTestnet ? TESTNET_BASE : MAINNET_BASE}/${index}`;
  }

  /**
   * Derive a single BIP32 child node from masterSeed.
   * masterSeed comes from the Passkey userHandle (32 bytes).
   */
  static deriveNode(
    masterSeed: Uint8Array,
    isTestnet: boolean,
    addressIndex = 0,
  ): BIP32Interface {
    if (!masterSeed || masterSeed.length < 16) {
      throw new Error('Invalid masterSeed: must be at least 16 bytes');
    }
    const network = this.getNetwork(isTestnet);
    const seedBuffer = Buffer.from(masterSeed);
    const root = bip32.fromSeed(seedBuffer, network);
    const path = this.derivationPath(addressIndex, isTestnet);
    return root.derivePath(path);
  }

  /**
   * Derive a Bitcoin P2WPKH address + key material from masterSeed.
   */
  static deriveAccountNode(
    masterSeed: Uint8Array,
    isTestnet: boolean,
    addressIndex = 0,
  ): { privateKey: Buffer; publicKey: Buffer; address: string } {
    const network = this.getNetwork(isTestnet);
    const child = this.deriveNode(masterSeed, isTestnet, addressIndex);
    if (!child.privateKey) throw new Error('Missing private key');

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network,
    });
    if (!address) throw new Error('Failed to derive P2WPKH address');

    return {
      privateKey: Buffer.from(child.privateKey),
      publicKey: Buffer.from(child.publicKey),
      address,
    };
  }

  /**
   * Get a BIP32 signer node (implements bitcoinjs-lib Signer interface) for PSBT signing.
   */
  static getSigner(
    masterSeed: Uint8Array,
    isTestnet: boolean,
    addressIndex = 0,
  ): BIP32Interface {
    return this.deriveNode(masterSeed, isTestnet, addressIndex);
  }

  /** Derive multiple Bitcoin wallets from the same masterSeed. */
  static deriveWallets(
    masterSeed: Uint8Array,
    count = 5,
    isTestnet = false,
  ): DerivedBitcoinWallet[] {
    return Array.from({ length: count }, (_, i) => {
      const { privateKey, publicKey, address } = this.deriveAccountNode(
        masterSeed,
        isTestnet,
        i,
      );
      return {
        index: i,
        address,
        privateKey: ethers.hexlify(privateKey),
        publicKey: ethers.hexlify(publicKey),
        type: WalletType.EOA,
        path: this.derivationPath(i, isTestnet),
        isTestnet,
      };
    });
  }

  /**
   * Validate a Bitcoin address. Currently only accepts P2WPKH (bc1q / tb1q).
   */
  static isValidAddress(addr: string, isTestnet?: boolean): boolean {
    if (!addr) return false;
    try {
      const decoded = bitcoin.address.fromBech32(addr);
      if (decoded.version !== 0) return false;
      if (decoded.data.length !== 20) return false;

      if (isTestnet === true) {
        return decoded.prefix === 'tb';
      }
      if (isTestnet === false) {
        return decoded.prefix === 'bc';
      }
      return decoded.prefix === 'bc' || decoded.prefix === 'tb';
    } catch {
      return false;
    }
  }
}
