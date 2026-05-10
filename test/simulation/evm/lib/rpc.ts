export interface JsonRpcResponse<T = unknown> {
  jsonrpc?: string
  id?: number
  result?: T
  error?: { code?: number; message?: string }
}

export async function rpcCall<T = unknown>(
  rpcUrl: string,
  method: string,
  params: unknown[] = []
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  })
  if (!res.ok) {
    throw new Error(`RPC ${rpcUrl} HTTP ${res.status}`)
  }
  const json = (await res.json()) as JsonRpcResponse<T>
  if (json.error?.message) {
    throw new Error(json.error.message)
  }
  if (json.result === undefined) {
    throw new Error('RPC missing result')
  }
  return json.result
}

export async function fetchChainId(rpcUrl: string): Promise<number> {
  const hex = await rpcCall<string>(rpcUrl, 'eth_chainId', [])
  return Number.parseInt(hex, 16)
}

export async function isRpcReachable(rpcUrl: string): Promise<boolean> {
  try {
    await fetchChainId(rpcUrl)
    return true
  } catch {
    return false
  }
}
