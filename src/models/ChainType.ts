export enum ChainFamily {
  EVM = 'evm',
  Solana = 'solana',
  Bitcoin = 'bitcoin',
  Tron = 'tron',
  Cosmos = 'cosmos',
}

export interface Chain {
  id: number | string;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorer: string;
  family?: ChainFamily;
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
  bundlerUrl?: string;
  entryPoint?: string;
  factoryAddress?: string;
  /** Bitcoin-specific: which network variant */
  network?: 'mainnet' | 'testnet' | 'signet' | 'regtest';
  /**
   * Bitcoin indexer fork. Testnet3 vs testnet4 are different chains; `tb1` addresses match, UTXO sets do not.
   * Used by `BitcoinService` so Esplora fallbacks never query the wrong testnet.
   */
  bitcoinFork?: 'mainnet' | 'testnet3' | 'testnet4';
  /** BIP44 coin type override (e.g. 505 for Provenance, 118 for Cosmos Hub) */
  coinType?: number;
  /** Bech32 human-readable prefix for Cosmos chains (e.g. "cosmos", "pb", "osmo") */
  addressPrefix?: string;
}
