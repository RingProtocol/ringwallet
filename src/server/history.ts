import { Connection, PublicKey, type ParsedInstruction } from '@solana/web3.js'
import { ethers } from 'ethers'
import { DEFAULT_CHAINS } from '@/config/chains'
import {
  getTxRecordKey,
  type HistoryApiResponse,
  type TxRecord,
} from '@/features/history/types'
import { ChainFamily, getPrimaryRpcUrl, type Chain } from '@/models/ChainType'

const DEFAULT_ALLOWED_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? ['https://wallet.ring.exchange']
    : [
        'https://wallet.ring.exchange',
        'https://wallet.testring.org',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]

const allowedOrigins = new Set(
  (process.env.HISTORY_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)

const HISTORY_CACHE_TTL_MS = 60 * 1000
const HISTORY_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'
const MAX_HISTORY_LIMIT = 20
const historyCache = new Map<
  string,
  { expiresAt: number; value: HistoryApiResponse }
>()

function logWarn(...args: unknown[]): void {
  globalThis.console.warn(...args)
}

interface HistoryParams {
  address: string
  chainId: string
  limit: number
  pendingHashes: string[]
}

interface EtherscanTransaction {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  isError: string
  txreceipt_status?: string
}

interface EtherscanTokenTransfer extends EtherscanTransaction {
  contractAddress?: string
  tokenName?: string
  tokenSymbol?: string
  tokenDecimal?: string
}

interface EtherscanApiResponse<TResult> {
  status: string
  message: string
  result: TResult[] | string
}

interface BitcoinTx {
  txid: string
  vin: Array<{
    prevout?: {
      scriptpubkey_address?: string
      value: number
    }
  }>
  vout: Array<{
    scriptpubkey_address?: string
    value: number
  }>
  status?: {
    confirmed?: boolean
    block_time?: number
  }
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 8
  return Math.max(1, Math.min(MAX_HISTORY_LIMIT, Math.trunc(limit)))
}

function normalizeAddress(address: string): string {
  return address.trim()
}

function isNumericChainId(chainId: string): boolean {
  return /^\d+$/.test(chainId)
}

function resolveChain(chainId: string): Chain | null {
  const matched = DEFAULT_CHAINS.find((chain) => String(chain.id) === chainId)
  if (matched) return matched

  if (isNumericChainId(chainId)) {
    return {
      id: Number(chainId),
      name: `Chain ${chainId}`,
      symbol: 'ETH',
      rpcUrl: [],
      explorer: 'https://etherscan.io',
      family: ChainFamily.EVM,
    }
  }

  return null
}

function formatUnits(value: bigint, decimals: number): string {
  const formatted = ethers.formatUnits(value, decimals)
  if (!formatted.includes('.')) return formatted
  return formatted.replace(/\.?0+$/, '')
}

function parseBigInt(value: string | bigint | null | undefined): bigint {
  if (typeof value === 'bigint') return value
  if (!value) return 0n
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

function mapEtherscanStatus(tx: EtherscanTransaction): TxRecord['status'] {
  if (tx.isError === '1' || tx.txreceipt_status === '0') return 'failed'
  return 'confirmed'
}

function getEvmAssetSymbol(chain: Chain): string {
  return chain.symbol || 'ETH'
}

function getEvmExplorerApiBaseUrl(chain: Chain): string {
  const perChainOverrideKey = `HISTORY_EVM_API_BASE_URL_${String(chain.id)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase()}`

  return (
    process.env[perChainOverrideKey]?.trim() ||
    process.env.HISTORY_EVM_API_BASE_URL?.trim() ||
    process.env.ETHERSCAN_API_BASE_URL?.trim() ||
    'https://api.etherscan.io/v2/api'
  )
}

async function fetchEtherscanAccountHistory<
  TResult extends EtherscanTransaction,
>(
  chain: Chain,
  address: string,
  limit: number,
  action: 'txlist' | 'tokentx'
): Promise<TResult[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY?.trim()
  if (!apiKey || !isNumericChainId(String(chain.id))) {
    logWarn('EVM history explorer config is incomplete', { chainId: chain.id })
    return []
  }

  try {
    const url = new URL(getEvmExplorerApiBaseUrl(chain))
    url.searchParams.set('chainid', String(chain.id))
    url.searchParams.set('module', 'account')
    url.searchParams.set('action', action)
    url.searchParams.set('address', address)
    url.searchParams.set('page', '1')
    url.searchParams.set('offset', String(limit))
    url.searchParams.set('sort', 'desc')
    url.searchParams.set('apikey', apiKey)
    logWarn('Etherscan request URL=', url.toString())
    const response = await fetch(url, { next: { revalidate: 60 } })
    logWarn('Etherscan response=', response)
    if (!response.ok) {
      logWarn('Etherscan request failed with status', response.status)
      return []
    }

    const payload = (await response.json()) as EtherscanApiResponse<TResult>
    logWarn('Etherscan response=', payload)

    if (!Array.isArray(payload.result)) {
      return []
    }

    return payload.result.slice(0, limit)
  } catch (error) {
    logWarn('Etherscan request failed', error)
    return []
  }
}

function mapEtherscanNativeTransactions(
  chain: Chain,
  transactions: EtherscanTransaction[]
): TxRecord[] {
  return transactions.map((tx) => ({
    id: tx.hash.toLowerCase(),
    hash: tx.hash,
    from: tx.from ?? '',
    to: tx.to ?? '',
    value: formatUnits(parseBigInt(tx.value), 18),
    timestamp: Number(tx.timeStamp || 0),
    status: mapEtherscanStatus(tx),
    assetType: 'native',
    assetName: chain.name,
    assetSymbol: getEvmAssetSymbol(chain),
  }))
}

function mapEtherscanTokenTransfers(
  transfers: EtherscanTokenTransfer[]
): TxRecord[] {
  return transfers.map((tx) => {
    const decimals = Number.parseInt(tx.tokenDecimal ?? '0', 10)
    const normalizedDecimals = Number.isFinite(decimals) ? decimals : 0
    return {
      id: [
        tx.hash?.toLowerCase() ?? '',
        tx.contractAddress?.toLowerCase() ?? '',
        tx.from?.toLowerCase() ?? '',
        tx.to?.toLowerCase() ?? '',
        tx.value ?? '',
      ].join(':'),
      hash: tx.hash,
      from: tx.from ?? '',
      to: tx.to ?? '',
      value: formatUnits(parseBigInt(tx.value), normalizedDecimals),
      timestamp: Number(tx.timeStamp || 0),
      status: mapEtherscanStatus(tx),
      assetType: 'token',
      assetName: tx.tokenName?.trim() || undefined,
      assetSymbol: tx.tokenSymbol?.trim() || undefined,
      assetAddress: tx.contractAddress?.trim() || undefined,
      assetDecimals: normalizedDecimals,
    } satisfies TxRecord
  })
}

async function fetchEvmExplorerHistory(
  chain: Chain,
  address: string,
  limit: number
): Promise<TxRecord[]> {
  const [nativeTransactions, tokenTransfers] = await Promise.all([
    fetchEtherscanAccountHistory<EtherscanTransaction>(
      chain,
      address,
      limit,
      'txlist'
    ),
    fetchEtherscanAccountHistory<EtherscanTokenTransfer>(
      chain,
      address,
      limit,
      'tokentx'
    ),
  ])

  return mergeTransactions(
    mapEtherscanNativeTransactions(chain, nativeTransactions),
    mapEtherscanTokenTransfers(tokenTransfers)
  ).slice(0, limit)
}

async function fetchEvmPendingTransactions(
  chain: Chain,
  hashes: string[]
): Promise<TxRecord[]> {
  const rpcUrl = getPrimaryRpcUrl(chain)
  if (!rpcUrl || hashes.length === 0) return []

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const records = await Promise.all(
      hashes.map(async (hash) => {
        const transaction = await provider.getTransaction(hash)
        if (!transaction) return null

        const receipt = await provider.getTransactionReceipt(hash)
        const block = transaction.blockNumber
          ? await provider.getBlock(transaction.blockNumber)
          : null

        return {
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
        } satisfies TxRecord
      })
    )

    return records.filter((record): record is TxRecord => Boolean(record))
  } catch {
    return []
  }
}

interface SolanaTransferResult {
  from: string
  to: string
  value: string
  assetType?: 'native' | 'token'
  assetAddress?: string
  assetDecimals?: number
}

function extractSolanaTransfer(
  record: Awaited<ReturnType<Connection['getParsedTransactions']>>[number],
  address: string
): SolanaTransferResult {
  const instructions = record?.transaction.message.instructions ?? []

  // First pass: look for SPL token transfers (transferChecked / transfer)
  for (const instruction of instructions) {
    if (!('parsed' in instruction)) continue
    const parsedInstruction = instruction as ParsedInstruction
    const programId = parsedInstruction.programId?.toBase58?.()
    const parsedType = parsedInstruction.parsed?.type as string | undefined
    const info = parsedInstruction.parsed?.info as
      | Record<string, unknown>
      | undefined
    if (!info) continue

    const isSplToken =
      programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

    if (
      isSplToken &&
      (parsedType === 'transferChecked' || parsedType === 'transfer')
    ) {
      const from =
        typeof info.authority === 'string'
          ? info.authority
          : typeof info.source === 'string'
            ? info.source
            : address
      const to =
        typeof info.destination === 'string' ? info.destination : address

      const tokenAmount = info.tokenAmount as
        | { uiAmountString?: string; decimals?: number }
        | undefined

      let value: string
      let decimals: number | undefined

      if (tokenAmount?.uiAmountString) {
        value = tokenAmount.uiAmountString
        decimals = tokenAmount.decimals
      } else if (typeof info.amount === 'string') {
        value = info.amount
      } else {
        continue
      }

      const mint = typeof info.mint === 'string' ? info.mint : undefined

      return {
        from,
        to,
        value,
        assetType: 'token',
        assetAddress: mint,
        assetDecimals: decimals,
      }
    }
  }

  // Second pass: native SOL transfers
  for (const instruction of instructions) {
    if (!('parsed' in instruction)) continue
    const parsedInstruction = instruction as ParsedInstruction
    const info = parsedInstruction.parsed?.info as
      | Record<string, unknown>
      | undefined
    if (!info) continue

    const from =
      typeof info.source === 'string'
        ? info.source
        : typeof info.from === 'string'
          ? info.from
          : address
    const to =
      typeof info.destination === 'string'
        ? info.destination
        : typeof info.to === 'string'
          ? info.to
          : address
    const rawValue =
      typeof info.lamports === 'number'
        ? BigInt(info.lamports)
        : typeof info.amount === 'string'
          ? parseBigInt(info.amount)
          : null

    if (rawValue !== null) {
      return { from, to, value: formatUnits(rawValue, 9) }
    }
  }

  // Fallback: compute delta from pre/post balances
  const accountKeys = record?.transaction.message.accountKeys ?? []
  const ownerIndex = accountKeys.findIndex(
    (key) => key.pubkey.toBase58() === address
  )
  const preBalance =
    ownerIndex >= 0 ? (record?.meta?.preBalances?.[ownerIndex] ?? 0) : 0
  const postBalance =
    ownerIndex >= 0 ? (record?.meta?.postBalances?.[ownerIndex] ?? 0) : 0
  const delta = BigInt(Math.abs(postBalance - preBalance))
  const signer =
    accountKeys.find((key) => key.signer)?.pubkey.toBase58() ?? address

  return { from: signer, to: address, value: formatUnits(delta, 9) }
}

async function fetchSolanaHistory(
  chain: Chain,
  address: string,
  limit: number
): Promise<TxRecord[]> {
  const connection = new Connection(getPrimaryRpcUrl(chain), 'confirmed')
  const owner = new PublicKey(address)
  const signatures = await connection.getSignaturesForAddress(owner, { limit })
  if (signatures.length === 0) return []

  const transactions = await connection.getParsedTransactions(
    signatures.map((item) => item.signature),
    { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
  )

  return signatures.map((signature, index) => {
    const parsed = transactions[index]
    const transfer = extractSolanaTransfer(parsed, address)
    const record: TxRecord = {
      hash: signature.signature,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value,
      timestamp: signature.blockTime ?? Math.floor(Date.now() / 1000),
      status: signature.err ? 'failed' : 'confirmed',
    }
    if (transfer.assetType === 'token') {
      record.assetType = 'token'
      record.assetAddress = transfer.assetAddress
      record.assetDecimals = transfer.assetDecimals
    }
    return record
  })
}

function mapBitcoinHistory(tx: BitcoinTx, address: string): TxRecord {
  const received = tx.vout
    .filter((output) => output.scriptpubkey_address === address)
    .reduce((sum, output) => sum + output.value, 0)
  const spent = tx.vin
    .filter((input) => input.prevout?.scriptpubkey_address === address)
    .reduce((sum, input) => sum + (input.prevout?.value ?? 0), 0)
  const delta = received - spent
  const externalInput = tx.vin.find(
    (input) =>
      input.prevout?.scriptpubkey_address &&
      input.prevout.scriptpubkey_address !== address
  )
  const externalOutput = tx.vout.find(
    (output) =>
      output.scriptpubkey_address && output.scriptpubkey_address !== address
  )

  return {
    hash: tx.txid,
    from: externalInput?.prevout?.scriptpubkey_address ?? address,
    to: externalOutput?.scriptpubkey_address ?? address,
    value: formatUnits(BigInt(Math.abs(delta)), 8),
    timestamp: tx.status?.block_time ?? Math.floor(Date.now() / 1000),
    status: tx.status?.confirmed ? 'confirmed' : 'pending',
  }
}

async function fetchBitcoinHistory(
  chain: Chain,
  address: string,
  limit: number
): Promise<TxRecord[]> {
  const baseUrl = getPrimaryRpcUrl(chain).replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/address/${address}/txs`, {
    next: { revalidate: 60 },
  })
  if (!response.ok) {
    throw new Error(`Bitcoin history request failed with ${response.status}`)
  }

  const payload = (await response.json()) as BitcoinTx[]
  return payload.slice(0, limit).map((tx) => mapBitcoinHistory(tx, address))
}

interface TronTrc20Transfer {
  transaction_id: string
  block_timestamp: number
  from: string
  to: string
  value: string
  token_info?: {
    symbol?: string
    name?: string
    decimals?: number
    address?: string
  }
}

async function fetchTronTrc20Transfers(
  baseUrl: string,
  address: string,
  limit: number
): Promise<TxRecord[]> {
  try {
    const response = await fetch(
      `${baseUrl}/v1/accounts/${address}/transactions/trc20?limit=${limit}`,
      {
        headers: { accept: 'application/json' },
        next: { revalidate: 60 },
      }
    )
    if (!response.ok) return []

    const payload = (await response.json()) as {
      data?: TronTrc20Transfer[]
    }

    return (payload.data ?? []).slice(0, limit).map((item) => {
      const decimals = item.token_info?.decimals ?? 6
      return {
        id: `${item.transaction_id}:${item.token_info?.address ?? ''}:${item.from}:${item.to}`,
        hash: item.transaction_id,
        from: item.from ?? address,
        to: item.to ?? address,
        value: formatUnits(parseBigInt(item.value), decimals),
        timestamp: Math.floor((item.block_timestamp ?? Date.now()) / 1000),
        status: 'confirmed' as const,
        assetType: 'token' as const,
        assetSymbol: item.token_info?.symbol,
        assetName: item.token_info?.name,
        assetAddress: item.token_info?.address,
        assetDecimals: item.token_info?.decimals,
      }
    })
  } catch {
    return []
  }
}

async function fetchTronHistory(
  chain: Chain,
  address: string,
  limit: number
): Promise<TxRecord[]> {
  const baseUrl = getPrimaryRpcUrl(chain).replace(/\/$/, '')

  const [nativeResponse, trc20Transfers] = await Promise.all([
    fetch(`${baseUrl}/v1/accounts/${address}/transactions?limit=${limit}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
    }),
    fetchTronTrc20Transfers(baseUrl, address, limit),
  ])

  if (!nativeResponse.ok) {
    throw new Error(`Tron history request failed with ${nativeResponse.status}`)
  }

  const payload = (await nativeResponse.json()) as {
    data?: Array<{
      txID: string
      block_timestamp: number
      ret?: Array<{ contractRet?: string }>
      raw_data?: {
        contract?: Array<{
          parameter?: {
            value?: {
              owner_address?: string
              to_address?: string
              amount?: number
            }
          }
        }>
      }
    }>
  }

  const nativeTxs: TxRecord[] = (payload.data ?? [])
    .slice(0, limit)
    .map((item) => {
      const transfer = item.raw_data?.contract?.[0]?.parameter?.value
      return {
        hash: item.txID,
        from: transfer?.owner_address ?? address,
        to: transfer?.to_address ?? address,
        value: formatUnits(BigInt(transfer?.amount ?? 0), 6),
        timestamp: Math.floor((item.block_timestamp ?? Date.now()) / 1000),
        status: item.ret?.some(
          (result) => result.contractRet && result.contractRet !== 'SUCCESS'
        )
          ? 'failed'
          : 'confirmed',
      }
    })

  return [...nativeTxs, ...trc20Transfers]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

async function fetchCosmosHistory(
  chain: Chain,
  address: string,
  limit: number
): Promise<TxRecord[]> {
  const baseUrl = getPrimaryRpcUrl(chain).replace(/\/$/, '')
  const response = await fetch(
    `${baseUrl}/cosmos/tx/v1beta1/txs?events=message.sender='${address}'&pagination.limit=${limit}`,
    {
      next: { revalidate: 60 },
    }
  )

  if (!response.ok) {
    throw new Error(`Cosmos history request failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    tx_responses?: Array<{
      txhash: string
      timestamp?: string
      code?: number
      tx?: {
        body?: {
          messages?: Array<Record<string, unknown>>
        }
      }
    }>
  }

  return (payload.tx_responses ?? []).slice(0, limit).map((item) => {
    const firstMessage = item.tx?.body?.messages?.[0] as
      | Record<string, unknown>
      | undefined
    const amountEntry = Array.isArray(firstMessage?.amount)
      ? (firstMessage?.amount?.[0] as Record<string, unknown> | undefined)
      : undefined
    const amount =
      typeof amountEntry?.amount === 'string' ? amountEntry.amount : '0'
    const decimals = chain.symbol === 'ATOM' ? 6 : 6

    return {
      hash: item.txhash,
      from:
        typeof firstMessage?.from_address === 'string'
          ? firstMessage.from_address
          : address,
      to:
        typeof firstMessage?.to_address === 'string'
          ? firstMessage.to_address
          : address,
      value: formatUnits(parseBigInt(amount), decimals),
      timestamp: item.timestamp
        ? Math.floor(new Date(item.timestamp).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      status: item.code && item.code !== 0 ? 'failed' : 'confirmed',
    }
  })
}

async function fetchHistoryByFamily(
  chain: Chain,
  address: string,
  limit: number
): Promise<{ transactions: TxRecord[]; source: string }> {
  switch (chain.family) {
    case ChainFamily.Solana:
      return {
        transactions: await fetchSolanaHistory(chain, address, limit),
        source: 'solana-rpc',
      }
    case ChainFamily.Bitcoin:
      return {
        transactions: await fetchBitcoinHistory(chain, address, limit),
        source: 'bitcoin-indexer',
      }
    case ChainFamily.Dogecoin:
      return { transactions: [], source: 'none' }
    case ChainFamily.Tron:
      return {
        transactions: await fetchTronHistory(chain, address, limit),
        source: 'tron-api',
      }
    case ChainFamily.Cosmos:
      return {
        transactions: await fetchCosmosHistory(chain, address, limit),
        source: 'cosmos-api',
      }
    case ChainFamily.EVM:
    default:
      return {
        transactions: await fetchEvmExplorerHistory(chain, address, limit),
        source: 'etherscan',
      }
  }
}

function mergeTransactions(...groups: TxRecord[][]): TxRecord[] {
  const merged = new Map<string, TxRecord>()

  for (const group of groups) {
    for (const tx of group) {
      merged.set(getTxRecordKey(tx), tx)
    }
  }

  return [...merged.values()].sort((left, right) => {
    if (left.status === 'pending' && right.status !== 'pending') return -1
    if (left.status !== 'pending' && right.status === 'pending') return 1
    return right.timestamp - left.timestamp
  })
}

function getCacheKey(params: HistoryParams): string {
  return `${params.chainId}:${params.address.toLowerCase()}:${params.limit}`
}

export function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    Vary: 'Origin',
    'Cache-Control': HISTORY_CACHE_CONTROL,
  }

  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
  }

  return headers
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true
  return allowedOrigins.has(origin)
}

export function validateAddress(chain: Chain, address: string): boolean {
  switch (chain.family) {
    case ChainFamily.Solana:
      try {
        new PublicKey(address)
        return true
      } catch {
        return false
      }
    case ChainFamily.EVM:
      return ethers.isAddress(address)
    default:
      return address.length >= 8
  }
}

export async function getHistory(
  params: HistoryParams
): Promise<HistoryApiResponse> {
  const normalizedAddress = normalizeAddress(params.address)
  const normalizedLimit = normalizeLimit(params.limit)
  const chain = resolveChain(params.chainId)

  if (!chain) {
    throw new Error('Unsupported chain')
  }

  const cacheKey = getCacheKey({
    ...params,
    address: normalizedAddress,
    limit: normalizedLimit,
  })

  if (params.pendingHashes.length === 0) {
    const cached = historyCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }
  }

  const shouldFetchPendingFromRpc =
    chain.family === ChainFamily.EVM && params.pendingHashes.length > 0
  const baseHistory = shouldFetchPendingFromRpc
    ? { transactions: [], source: 'rpc' }
    : await fetchHistoryByFamily(chain, normalizedAddress, normalizedLimit)
  const pendingHistory = shouldFetchPendingFromRpc
    ? await fetchEvmPendingTransactions(chain, params.pendingHashes)
    : []

  const value: HistoryApiResponse = {
    transactions: mergeTransactions(
      baseHistory.transactions,
      pendingHistory
    ).slice(0, normalizedLimit),
    source: shouldFetchPendingFromRpc
      ? 'rpc'
      : pendingHistory.length > 0
        ? `${baseHistory.source}+rpc`
        : baseHistory.source,
    cachedAt: Date.now(),
  }

  if (params.pendingHashes.length === 0) {
    historyCache.set(cacheKey, {
      expiresAt: Date.now() + HISTORY_CACHE_TTL_MS,
      value,
    })
  }

  return value
}
