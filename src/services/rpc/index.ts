/**
 * Chain RPC / indexer entrypoints. EVM-compatible families (EVM, Tron, Prisma)
 * share {@link EvmRpcService} via {@link RpcService.fromChain}. Cosmos has no
 * RPC helper here yet — see `cosmosBalanceAdapter`.
 */
export { RpcService } from './rpcService'
export { default } from './rpcService'

export { EvmRpcService, type EvmTokenMetadata } from './evmRpcService'

export {
  BitcoinService,
  bitcoinForkForChain,
  inferBitcoinForkFromRpcUrl,
  type BitcoinFork,
  type Utxo,
  type FeeEstimates,
} from './bitcoinService'

export { SolanaService } from './solanaService'
export { SolanaTokenService, ATA_CREATION_FEE_SOL } from './solanaTokenService'

export { DogecoinService } from './dogecoinService'

export {
  resolveTokenMetadata,
  type TokenMetadataResult,
  type TokenMetadataHints,
} from './tokenMetadataResolver'
