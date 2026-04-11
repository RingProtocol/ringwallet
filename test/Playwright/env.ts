export interface EvmTestnetChainConfig {
  chainId: number
  chainName: string
  sendAmount: string
}

export const E2E_CONFIG_EVM = {
  baseUrl: 'http://localhost:3000',
  masterSeed:
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
  address0: '0x9fe8b07AC19eAe1f3548D8379A534070A89Ee620',
}

export const EVM_TESTNET_CHAINS: EvmTestnetChainConfig[] = [
  { chainId: 11155111, chainName: 'Sepolia', sendAmount: '0.0001' },
  { chainId: 43113, chainName: 'Fuji', sendAmount: '0.001' },
  { chainId: 195, chainName: 'X Layer', sendAmount: '0.001' },
  { chainId: 998, chainName: 'Hyperliquid', sendAmount: '0.001' },
  { chainId: 9746, chainName: 'Plasma', sendAmount: '0.001' },
  { chainId: 6342, chainName: 'MegaETH', sendAmount: '0.0001' },
  { chainId: 568, chainName: 'Dogechain Testnet', sendAmount: '0.001' },
]
