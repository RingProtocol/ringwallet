import { ethers } from 'ethers'
import type { TxRecord } from '../../features/history/types'
import type {
  BlockNumberReader,
  GasPriceReader,
  JsonRpcFailure,
  JsonRpcRequest,
  JsonRpcResponse,
  NativeBalanceOptions,
  NativeBalanceReader,
  RpcTransport,
} from '../../models/rpcType'

const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
] as const

const ERC20_METADATA_ABI = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
] as const

const ERC20_METADATA_INTERFACE = new ethers.Interface(ERC20_METADATA_ABI)

export interface EvmTokenMetadata {
  symbol: string
  name: string
  decimals: number
}

type EvmChainHistoryRecord = TxRecord & {
  id: string
  assetType: 'native'
}

function formatUnits(value: bigint, decimals: number): string {
  const formatted = ethers.formatUnits(value, decimals)
  if (!formatted.includes('.')) return formatted
  return formatted.replace(/\.?0+$/, '')
}

export class EvmRpcService
  implements
    RpcTransport,
    NativeBalanceReader,
    GasPriceReader,
    BlockNumberReader
{
  /** Wait before trying the next RPC URL after a failure (avoids hammering endpoints). */
  private static readonly RPC_FAILOVER_DELAY_MS = 750

  private readonly rpcUrls: string[]
  private readonly providers = new Map<string, ethers.JsonRpcProvider>()
  private activeRpcUrl: string | null

  constructor(rpcUrls: string | readonly string[]) {
    this.rpcUrls = (Array.isArray(rpcUrls) ? rpcUrls : [rpcUrls]).filter(
      Boolean
    )
    this.activeRpcUrl = this.rpcUrls[0] ?? null
  }

  private getProviderForUrl(rpcUrl: string): ethers.JsonRpcProvider {
    const cached = this.providers.get(rpcUrl)
    if (cached) {
      return cached
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    this.providers.set(rpcUrl, provider)
    return provider
  }

  private markRpcUrlHealthy(rpcUrl: string): void {
    this.activeRpcUrl = rpcUrl
  }

  private async tryRpcUrls<TResult>(
    runner: (
      provider: ethers.JsonRpcProvider,
      rpcUrl: string
    ) => Promise<TResult>
  ): Promise<TResult> {
    if (this.rpcUrls.length === 0) {
      throw new Error('RPC URL is required')
    }

    const orderedUrls = [
      ...new Set(
        [this.activeRpcUrl, ...this.rpcUrls].filter((url): url is string =>
          Boolean(url)
        )
      ),
    ]

    let lastError: unknown = null
    for (let i = 0; i < orderedUrls.length; i++) {
      const rpcUrl = orderedUrls[i]
      const provider = this.getProviderForUrl(rpcUrl)
      try {
        //this try is sequence not concurrency.
        const result = await runner(provider, rpcUrl)
        this.markRpcUrlHealthy(rpcUrl)
        return result
      } catch (error) {
        lastError = error
        const hasMore = i < orderedUrls.length - 1
        if (hasMore) {
          await new Promise((resolve) =>
            setTimeout(resolve, EvmRpcService.RPC_FAILOVER_DELAY_MS)
          )
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('All EVM RPC endpoints failed')
  }

  async request<TResult>(
    method: string,
    params: readonly unknown[] = []
  ): Promise<TResult> {
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }

    return this.tryRpcUrls(async (_provider, rpcUrl) => {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await response.text().catch(() => '')

      let parsed: JsonRpcResponse<TResult>
      try {
        parsed = JSON.parse(body) as JsonRpcResponse<TResult>
      } catch {
        throw new Error(
          `EVM RPC invalid response: HTTP ${response.status} ${body}`
        )
      }

      if (this.isFailure(parsed)) {
        throw new Error(
          `EVM RPC error ${parsed.error.code}: ${parsed.error.message}`
        )
      }

      if (!response.ok) {
        throw new Error(`EVM RPC HTTP ${response.status}: ${body}`)
      }

      return parsed.result
    })
  }

  async getBalance(
    address: string,
    options: NativeBalanceOptions = {}
  ): Promise<bigint> {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid EVM address')
    }

    const blockTag = options.blockTag ?? 'latest'
    return this.tryRpcUrls((provider) => provider.getBalance(address, blockTag))
  }

  async getFormattedBalance(
    address: string,
    options: NativeBalanceOptions = {}
  ): Promise<string> {
    const balance = await this.getBalance(address, options)
    return ethers.formatEther(balance)
  }

  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string
  ): Promise<bigint> {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid EVM token address')
    }

    if (!ethers.isAddress(walletAddress)) {
      throw new Error('Invalid EVM wallet address')
    }

    return this.tryRpcUrls(async (provider) => {
      const contract = new ethers.Contract(
        tokenAddress,
        ERC20_BALANCE_ABI,
        provider
      )
      return BigInt(await contract.balanceOf(walletAddress))
    })
  }

  async getFormattedTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    decimals: number
  ): Promise<string> {
    const balance = await this.getTokenBalance(tokenAddress, walletAddress)
    return ethers.formatUnits(balance, decimals)
  }

  async getTokenMetadata(tokenAddress: string): Promise<EvmTokenMetadata> {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid EVM token address')
    }

    return this.tryRpcUrls(async (provider, rpcUrl) => {
      try {
        const responses = await this.requestBatch(
          [
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_call',
              params: [
                {
                  to: tokenAddress,
                  data: ERC20_METADATA_INTERFACE.encodeFunctionData('symbol'),
                },
                'latest',
              ],
            },
            {
              jsonrpc: '2.0',
              id: 2,
              method: 'eth_call',
              params: [
                {
                  to: tokenAddress,
                  data: ERC20_METADATA_INTERFACE.encodeFunctionData('name'),
                },
                'latest',
              ],
            },
            {
              jsonrpc: '2.0',
              id: 3,
              method: 'eth_call',
              params: [
                {
                  to: tokenAddress,
                  data: ERC20_METADATA_INTERFACE.encodeFunctionData('decimals'),
                },
                'latest',
              ],
            },
          ],
          rpcUrl
        )

        const responseById = new Map(
          responses.map((response) => [response.id, response])
        )
        const symbolResponse = responseById.get(1)
        const nameResponse = responseById.get(2)
        const decimalsResponse = responseById.get(3)

        if (!symbolResponse || !nameResponse || !decimalsResponse) {
          throw new Error('Incomplete EVM token metadata response')
        }

        if (this.isFailure(symbolResponse)) {
          throw new Error(
            `EVM RPC error ${symbolResponse.error.code}: ${symbolResponse.error.message}`
          )
        }

        if (this.isFailure(nameResponse)) {
          throw new Error(
            `EVM RPC error ${nameResponse.error.code}: ${nameResponse.error.message}`
          )
        }

        if (this.isFailure(decimalsResponse)) {
          throw new Error(
            `EVM RPC error ${decimalsResponse.error.code}: ${decimalsResponse.error.message}`
          )
        }

        const [symbol] = ERC20_METADATA_INTERFACE.decodeFunctionResult(
          'symbol',
          symbolResponse.result
        )
        const [name] = ERC20_METADATA_INTERFACE.decodeFunctionResult(
          'name',
          nameResponse.result
        )
        const [decimals] = ERC20_METADATA_INTERFACE.decodeFunctionResult(
          'decimals',
          decimalsResponse.result
        )

        return {
          symbol: symbol || 'UNKNOWN',
          name: name || 'Unknown Token',
          decimals: Number(decimals),
        }
      } catch {
        const contract = new ethers.Contract(
          tokenAddress,
          ERC20_METADATA_ABI,
          provider
        )
        const [symbol, name, decimals] = await Promise.all([
          contract.symbol(),
          contract.name(),
          contract.decimals(),
        ])

        return {
          symbol: symbol || 'UNKNOWN',
          name: name || 'Unknown Token',
          decimals: Number(decimals),
        }
      }
    })
  }

  async getBlockNumber(): Promise<bigint> {
    const result = await this.request<string>('eth_blockNumber')
    return BigInt(result)
  }

  async getGasPrice(): Promise<bigint> {
    const result = await this.request<string>('eth_gasPrice')
    return BigInt(result)
  }

  async fetchHistoryFromChain(hashes: string[]): Promise<TxRecord[]> {
    if (hashes.length === 0) return []

    return this.tryRpcUrls(async (provider) => {
      const records = await Promise.all(
        hashes.map(async (hash) => {
          const transaction = await provider.getTransaction(hash)
          if (!transaction) return null

          const receipt = await provider.getTransactionReceipt(hash)
          const block = transaction.blockNumber
            ? await provider.getBlock(transaction.blockNumber)
            : null

          return {
            id: hash.toLowerCase(),
            hash,
            from: transaction.from ?? '',
            to: transaction.to ?? '',
            value: formatUnits(transaction.value ?? 0n, 18),
            timestamp: block?.timestamp ?? Math.floor(Date.now() / 1000),
            status: receipt
              ? receipt.status === 1
                ? 'confirmed'
                : 'failed'
              : 'pending',
            assetType: 'native',
          } satisfies EvmChainHistoryRecord
        })
      )

      return records.filter((record): record is EvmChainHistoryRecord =>
        Boolean(record)
      )
    })
  }

  private async requestBatch(
    payloads: readonly JsonRpcRequest[],
    rpcUrl: string
  ): Promise<JsonRpcResponse<string>[]> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloads),
    })

    const body = await response.text().catch(() => '')

    let parsed: JsonRpcResponse<string>[]
    try {
      parsed = JSON.parse(body) as JsonRpcResponse<string>[]
    } catch {
      throw new Error(
        `EVM RPC invalid batch response: HTTP ${response.status} ${body}`
      )
    }

    if (!response.ok) {
      throw new Error(`EVM RPC HTTP ${response.status}: ${body}`)
    }

    if (!Array.isArray(parsed)) {
      throw new Error('EVM RPC batch response must be an array')
    }

    return parsed
  }

  private isFailure<TResult>(
    response: JsonRpcResponse<TResult>
  ): response is JsonRpcFailure {
    return 'error' in response
  }
}

export default EvmRpcService
