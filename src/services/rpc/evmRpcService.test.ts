import { describe, expect, it } from 'vitest'
import EvmRpcService from './evmRpcService'

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
