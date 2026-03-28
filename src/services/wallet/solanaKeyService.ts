import { derivePath } from 'ed25519-hd-key';
import { Keypair, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';
import { WalletType } from '../../models/WalletType';

export interface DerivedSolanaWallet {
  index: number;
  address: string;
  /** Hex-encoded 32-byte Ed25519 seed. In-memory only — never persisted. */
  privateKey: string;
  type: WalletType;
  path: string;
}

const DERIVATION_BASE = "m/44'/501'";

export class SolanaKeyService {
  static derivationPath(index: number): string {
    // All nodes hardened (Ed25519 SLIP-0010 requirement)
    // Compatible with Phantom / Solflare default path
    return `${DERIVATION_BASE}/${index}'/0'`;
  }

  /**
   * Derive a Solana Keypair from masterSeed using SLIP-0010 / Ed25519.
   * masterSeed comes from the Passkey userHandle (32 bytes).
   */
  static deriveKeypair(masterSeed: Uint8Array, index = 0): Keypair {
    if (!masterSeed || masterSeed.length < 16) {
      throw new Error('Invalid masterSeed: must be at least 16 bytes');
    }
    const seedHex = Buffer.from(masterSeed).toString('hex');
    const path = this.derivationPath(index);
    const { key } = derivePath(path, seedHex);
    return Keypair.fromSeed(Uint8Array.from(key));
  }

  /** Reconstruct a Keypair from a hex-encoded 32-byte private seed (as stored in DerivedSolanaWallet). */
  static keypairFromStoredKey(hexPrivateKey: string): Keypair {
    const keyBytes = ethers.getBytes(hexPrivateKey);
    return Keypair.fromSeed(keyBytes);
  }

  /** Derive multiple Solana wallets from the same masterSeed. */
  static deriveWallets(masterSeed: Uint8Array, count = 5): DerivedSolanaWallet[] {
    return Array.from({ length: count }, (_, i) => {
      const keypair = this.deriveKeypair(masterSeed, i);
      return {
        index: i,
        address: keypair.publicKey.toBase58(),
        // Keypair.secretKey is 64 bytes (seed || publicKey); only the first 32 are the seed.
        privateKey: ethers.hexlify(keypair.secretKey.slice(0, 32)),
        type: WalletType.EOA,
        path: this.derivationPath(i),
      };
    });
  }

  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}
