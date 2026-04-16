import { Connection } from '@solana/web3.js'
import { ChainFamily } from '../../models/ChainType'
import { tronAddressToHex } from '../chainplugins/tron/tronPlugin'
import EvmRpcService from './evmRpcService'
import { SolanaTokenService } from './solanaTokenService'

export interface TokenMetadataResult {
  symbol: string
  name: string
  decimals: number
}

export interface TokenMetadataHints {
  symbol?: string
  name?: string
  decimals?: number
}

function isComplete(hints?: TokenMetadataHints): hints is TokenMetadataResult {
  return (
    hints != null &&
    typeof hints.symbol === 'string' &&
    hints.symbol.length > 0 &&
    typeof hints.name === 'string' &&
    hints.name.length > 0 &&
    typeof hints.decimals === 'number'
  )
}

async function resolveEvm(
  address: string,
  rpcUrls: string[],
  hints?: TokenMetadataHints
): Promise<TokenMetadataResult> {
  if (isComplete(hints)) return hints
  const service = new EvmRpcService(rpcUrls)
  return service.getTokenMetadata(address)
}

async function resolveSolana(
  mintAddress: string,
  rpcUrls: string[],
  hints?: TokenMetadataHints
): Promise<TokenMetadataResult> {
  if (isComplete(hints)) return hints

  const connection = new Connection(rpcUrls[0], 'confirmed')
  const service = new SolanaTokenService(connection)

  const { decimals } = await service.getTokenMetadata(mintAddress)

  return {
    symbol: hints?.symbol || mintAddress.slice(0, 6).toUpperCase(),
    name: hints?.name || `SPL Token ${mintAddress.slice(0, 8)}`,
    decimals,
  }
}

/**
 * Resolve token metadata for any supported chain family.
 * Returns `null` for chain families that don't support tokens (Bitcoin)
 * or lack a metadata resolver (Cosmos).
 */
export async function resolveTokenMetadata(
  family: ChainFamily | undefined,
  address: string,
  rpcUrls: string[],
  hints?: TokenMetadataHints
): Promise<TokenMetadataResult | null> {
  if (isComplete(hints)) return hints

  const normalizedFamily = family ?? ChainFamily.EVM

  switch (normalizedFamily) {
    case ChainFamily.EVM:
    case ChainFamily.Prisma:
      return resolveEvm(address, rpcUrls, hints)
    case ChainFamily.Solana:
      return resolveSolana(address, rpcUrls, hints)
    case ChainFamily.Tron:
      return resolveEvm(tronAddressToHex(address), rpcUrls, hints)
    case ChainFamily.Bitcoin:
    case ChainFamily.Dogecoin:
    case ChainFamily.Cosmos:
    default:
      return null
  }
}
