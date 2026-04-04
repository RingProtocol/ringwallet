/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_ETH_MAINNET: string
  readonly VITE_RPC_SEPOLIA: string
  readonly VITE_RPC_OPTIMISM: string
  readonly VITE_RPC_ARBITRUM: string
  readonly VITE_RPC_POLYGON: string
  readonly VITE_BUNDLER_ETH_MAINNET: string
  readonly VITE_BUNDLER_SEPOLIA: string
  readonly VITE_BUNDLER_OPTIMISM: string
  readonly VITE_BUNDLER_ARBITRUM: string
  readonly VITE_BUNDLER_POLYGON: string
  readonly VITE_ENTRYPOINT_4337: string
  readonly VITE_FACTORY_ETH_MAINNET: string
  readonly VITE_FACTORY_SEPOLIA: string
  readonly VITE_FACTORY_OPTIMISM: string
  readonly VITE_FACTORY_ARBITRUM: string
  readonly VITE_FACTORY_POLYGON: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
