import { describe, expect, it } from 'vitest'
import EvmRpcService from '@/services/rpc/evmRpcService'

// ─── Existing: fetchHistoryFromChain ─────────────────────────────────────

describe('EvmRpcService.fetchHistoryFromChain', () => {
  it('reads transaction status from RPC and maps it to history records', async () => {
    const rpcUrl = 'https://rpc.example.test'
    const service = new EvmRpcService([rpcUrl])
    const fakeProvider = {
      getTransaction: async (hash: string) => ({
        hash,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: 1500000000000000000n,
        blockNumber: 42,
      }),
      getTransactionReceipt: async () => ({
        status: 1,
      }),
      getBlock: async () => ({
        timestamp: 1710000000,
      }),
    }

    ;(
      service as unknown as {
        providers: Map<string, unknown>
        activeRpcUrl: string | null
      }
    ).providers.set(rpcUrl, fakeProvider)
    ;(
      service as unknown as {
        providers: Map<string, unknown>
        activeRpcUrl: string | null
      }
    ).activeRpcUrl = rpcUrl

    const payload = await service.fetchHistoryFromChain([
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ])

    expect(payload).toEqual([
      {
        id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: '1.5',
        timestamp: 1710000000,
        status: 'confirmed',
        assetType: 'native',
      },
    ])
  })
})

// ─── New: getBalance input validation ────────────────────────────────────

describe('EvmRpcService.getBalance — input validation', () => {
  it('throws on invalid EVM address', async () => {
    const service = new EvmRpcService(['https://rpc.example.test'])
    await expect(service.getBalance('not-an-address')).rejects.toThrow(
      /Invalid EVM address/
    )
  })

  it('throws on Solana address', async () => {
    const service = new EvmRpcService(['https://rpc.example.test'])
    await expect(
      service.getBalance('5B7yRcuHQggbidX5X3JiZjyaKgufvq8AhC9W7WRFZpQD')
    ).rejects.toThrow(/Invalid EVM address/)
  })
})

// ─── New: getTokenBalance input validation ──────────────────────────────

describe('EvmRpcService.getTokenBalance — input validation', () => {
  it('throws on invalid token address', async () => {
    const service = new EvmRpcService(['https://rpc.example.test'])
    await expect(
      service.getTokenBalance(
        'not-a-token',
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      )
    ).rejects.toThrow(/Invalid EVM token address/)
  })

  it('throws on invalid wallet address', async () => {
    const service = new EvmRpcService(['https://rpc.example.test'])
    await expect(
      service.getTokenBalance(
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'not-a-wallet'
      )
    ).rejects.toThrow(/Invalid EVM wallet address/)
  })
})

// ─── New: getTokenMetadata input validation ─────────────────────────────

describe('EvmRpcService.getTokenMetadata — input validation', () => {
  it('throws on invalid token address', async () => {
    const service = new EvmRpcService(['https://rpc.example.test'])
    await expect(service.getTokenMetadata('not-a-token')).rejects.toThrow(
      /Invalid EVM token address/
    )
  })
})

// ─── New: constructor and empty RPC ─────────────────────────────────────

describe('EvmRpcService — constructor and edge cases', () => {
  it('throws when no RPC URLs configured and request is made', async () => {
    const service = new EvmRpcService([])
    await expect(service.request('eth_blockNumber')).rejects.toThrow(
      /RPC URL is required/
    )
  })

  it('accepts a single string URL', () => {
    const service = new EvmRpcService('https://rpc.example.test')
    expect(service).toBeDefined()
  })

  it('accepts an array of URLs', () => {
    const service = new EvmRpcService([
      'https://rpc1.example.test',
      'https://rpc2.example.test',
    ])
    expect(service).toBeDefined()
  })
})

// ─── New: RPC URL fallback ──────────────────────────────────────────────

describe('EvmRpcService — multi-URL fallback (tryRpcUrls)', () => {
  it('falls back to second URL when first fails', async () => {
    const service = new EvmRpcService([
      'https://dead-rpc.example.test',
      'https://live-rpc.example.test',
    ])

    const originalFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      calls.push(urlStr)
      if (urlStr.includes('dead-rpc')) {
        throw new Error('Connection refused')
      }
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: '0x1234',
          }),
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x1234',
        }),
      } as Response
    }) as typeof fetch

    try {
      const result = await service.request<string>('eth_blockNumber')
      expect(result).toBe('0x1234')
      expect(calls.length).toBe(2)
      expect(calls[0]).toContain('dead-rpc')
      expect(calls[1]).toContain('live-rpc')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('waits for one RPC result before starting the next URL', async () => {
    const service = new EvmRpcService([
      'https://rpc-1.example.test',
      'https://rpc-2.example.test',
    ])

    const started: string[] = []
    let rejectFirst: (error: Error) => void = () => undefined
    let resolveSecond: (value: string) => void = () => undefined

    const promise = (
      service as unknown as {
        tryRpcUrls: <T>(
          runner: (provider: unknown, rpcUrl: string) => Promise<T>
        ) => Promise<T>
      }
    ).tryRpcUrls((_, rpcUrl) => {
      started.push(rpcUrl)

      if (rpcUrl.includes('rpc-1')) {
        return new Promise<string>((_, reject) => {
          rejectFirst = reject
        })
      }

      return new Promise<string>((resolve) => {
        resolveSecond = resolve
      })
    })

    await Promise.resolve()
    expect(started).toEqual(['https://rpc-1.example.test'])

    rejectFirst(new Error('rpc-1 failed'))
    await Promise.resolve()
    expect(started).toEqual([
      'https://rpc-1.example.test',
      'https://rpc-2.example.test',
    ])

    resolveSecond('ok')
    await expect(promise).resolves.toBe('ok')
  })

  it('throws when all URLs fail', async () => {
    const service = new EvmRpcService([
      'https://dead1.example.test',
      'https://dead2.example.test',
    ])

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('Connection refused')
    }) as typeof fetch

    try {
      await expect(service.request('eth_blockNumber')).rejects.toThrow(
        /Connection refused/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
