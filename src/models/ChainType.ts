export enum ChainFamily {
  EVM = 'evm',
  Solana = 'solana',
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
}
