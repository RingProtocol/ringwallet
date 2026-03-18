import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BitcoinKeyService } from './bitcoinKeyService';

bitcoin.initEccLib(ecc);

const SATS_PER_BTC = 100_000_000;
const DUST_THRESHOLD = 546;

export interface Utxo {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

export interface FeeEstimates {
  [blocks: string]: number;
}

export class BitcoinService {
  private apiBase: string;
  private network: bitcoin.Network;
  private isTestnet: boolean;

  constructor(apiBase: string, isTestnet: boolean) {
    this.apiBase = apiBase.replace(/\/$/, '');
    this.isTestnet = isTestnet;
    this.network = BitcoinKeyService.getNetwork(isTestnet);
  }

  async getUtxos(address: string): Promise<Utxo[]> {
    const res = await fetch(`${this.apiBase}/address/${address}/utxo`);
    if (!res.ok) throw new Error(`Failed to fetch UTXOs: ${res.statusText}`);
    return res.json();
  }

  /** Balance in BTC (summing all UTXOs). */
  async getBalance(address: string): Promise<number> {
    const utxos = await this.getUtxos(address);
    const totalSats = utxos.reduce((sum, u) => sum + u.value, 0);
    return totalSats / SATS_PER_BTC;
  }

  /** Balance in satoshis. */
  async getBalanceSats(address: string): Promise<number> {
    const utxos = await this.getUtxos(address);
    return utxos.reduce((sum, u) => sum + u.value, 0);
  }

  /**
   * Get fee rate estimates from the API.
   * Returns fee rate in sat/vByte for the target confirmation blocks.
   */
  async getFeeRate(targetBlocks: number = 3): Promise<number> {
    const res = await fetch(`${this.apiBase}/fee-estimates`);
    if (!res.ok) throw new Error(`Failed to fetch fee estimates: ${res.statusText}`);
    const data: FeeEstimates = await res.json();
    return data[String(targetBlocks)] ?? data['6'] ?? data['3'] ?? 5;
  }

  /**
   * Estimate fee in satoshis for a P2WPKH transaction.
   * Uses a rough vBytes estimate based on input/output count.
   */
  async estimateFeeSats(
    address: string,
    amountSats: number,
    targetBlocks = 3,
  ): Promise<{ feeSats: number; feeRate: number }> {
    const [utxos, feeRate] = await Promise.all([
      this.getUtxos(address),
      this.getFeeRate(targetBlocks),
    ]);

    let inputCount = 0;
    let totalIn = 0;
    for (const u of utxos) {
      inputCount++;
      totalIn += u.value;
      if (totalIn >= amountSats) break;
    }

    // P2WPKH vBytes estimate: ~68 per input + ~31 per output + ~11 overhead
    const hasChange = totalIn - amountSats > DUST_THRESHOLD;
    const outputCount = hasChange ? 2 : 1;
    const vBytes = 11 + inputCount * 68 + outputCount * 31;
    const feeSats = Math.ceil(feeRate * vBytes);

    return { feeSats, feeRate };
  }

  /**
   * Build and sign a P2WPKH transaction.
   * Returns the raw transaction hex and the actual fee paid.
   */
  async buildAndSignTransaction(params: {
    fromAddress: string;
    toAddress: string;
    amountSats: number;
    masterSeed: Uint8Array;
    addressIndex: number;
    feeRate?: number;
  }): Promise<{ txHex: string; fee: number }> {
    const { fromAddress, toAddress, amountSats, masterSeed, addressIndex } = params;

    if (!BitcoinKeyService.isValidAddress(toAddress)) {
      throw new Error('Invalid recipient Bitcoin address');
    }

    const utxos = await this.getUtxos(fromAddress);
    if (!utxos.length) throw new Error('No UTXOs available');

    const feeRate = params.feeRate ?? await this.getFeeRate();
    const signer = BitcoinKeyService.getSigner(masterSeed, this.isTestnet, addressIndex);

    // Coin selection: accumulate until we have enough
    const selected: Utxo[] = [];
    let totalIn = 0;

    // Sort by value descending for slightly better selection
    const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
    for (const u of sortedUtxos) {
      selected.push(u);
      totalIn += u.value;
      // Rough check: enough for amount + minimum possible fee
      if (totalIn >= amountSats + Math.ceil(feeRate * 100)) break;
    }

    if (totalIn < amountSats) throw new Error('Insufficient balance');

    const outputScript = bitcoin.address.toOutputScript(fromAddress, this.network);

    const psbt = new bitcoin.Psbt({ network: this.network });

    for (const u of selected) {
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        witnessUtxo: {
          script: outputScript,
          value: BigInt(u.value),
        },
      });
    }

    psbt.addOutput({ address: toAddress, value: BigInt(amountSats) });

    // Estimate fee using actual input/output counts
    const hasChangeEstimate = true;
    const outputCount = hasChangeEstimate ? 2 : 1;
    const vBytesEstimate = 11 + selected.length * 68 + outputCount * 31;
    const feeEstimate = Math.ceil(feeRate * vBytesEstimate);

    if (totalIn < amountSats + feeEstimate) {
      // Re-check without change output
      const vBytesNoChange = 11 + selected.length * 68 + 1 * 31;
      const feeNoChange = Math.ceil(feeRate * vBytesNoChange);
      if (totalIn < amountSats + feeNoChange) {
        throw new Error('Insufficient balance to cover amount + fee');
      }
      // No change output — remainder goes to fee
    } else {
      const change = totalIn - amountSats - feeEstimate;
      if (change >= DUST_THRESHOLD) {
        psbt.addOutput({ address: fromAddress, value: BigInt(change) });
      }
    }

    // Sign all inputs
    selected.forEach((_, idx) => {
      psbt.signInput(idx, signer);
    });

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const actualFee = totalIn - Number(tx.outs.reduce((sum, o) => sum + BigInt(o.value), 0n));

    return { txHex: tx.toHex(), fee: actualFee };
  }

  /** Broadcast a raw transaction hex. Returns the txid. */
  async broadcast(txHex: string): Promise<string> {
    const res = await fetch(`${this.apiBase}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Broadcast failed: ${errorText}`);
    }
    return res.text();
  }

  /** Convert satoshis to BTC string. */
  static satsToBtc(sats: number): string {
    return (sats / SATS_PER_BTC).toFixed(8);
  }

  /** Convert BTC to satoshis. */
  static btcToSats(btc: number): number {
    return Math.round(btc * SATS_PER_BTC);
  }
}
