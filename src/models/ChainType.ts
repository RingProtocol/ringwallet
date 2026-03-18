export enum ChainFamily {
  EVM = 'evm',
  Solana = 'solana',
  Bitcoin = 'bitcoin',
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
}
