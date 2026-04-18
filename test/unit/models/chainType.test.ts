import { describe, it, expect } from 'vitest'
import { ChainFamily, getPrimaryRpcUrl, type Chain } from '@/models/ChainType'

describe('getPrimaryRpcUrl', () => {
  it('returns first URL from rpcUrl array', () => {
    const chain: Pick<Chain, 'rpcUrl'> = {
      rpcUrl: ['https://rpc1.example', 'https://rpc2.example'],
    }
    expect(getPrimaryRpcUrl(chain)).toBe('https://rpc1.example')
  })

  it('returns empty string for empty rpcUrl array', () => {
    expect(getPrimaryRpcUrl({ rpcUrl: [] })).toBe('')
  })

  it('returns empty string for null chain', () => {
    expect(getPrimaryRpcUrl(null)).toBe('')
  })

  it('returns empty string for undefined chain', () => {
    expect(getPrimaryRpcUrl(undefined)).toBe('')
  })

  it('returns first URL even if there are multiple', () => {
    const chain: Pick<Chain, 'rpcUrl'> = {
      rpcUrl: ['https://primary.rpc', 'https://fallback.rpc'],
    }
    expect(getPrimaryRpcUrl(chain)).toBe('https://primary.rpc')
  })
})

describe('ChainFamily enum', () => {
  it('has all expected members', () => {
    expect(ChainFamily.EVM).toBe('evm')
    expect(ChainFamily.Solana).toBe('solana')
    expect(ChainFamily.Bitcoin).toBe('bitcoin')
    expect(ChainFamily.Tron).toBe('tron')
    expect(ChainFamily.Cosmos).toBe('cosmos')
  })

  it('has exactly 7 members', () => {
    const values = Object.values(ChainFamily)
    expect(values).toHaveLength(7)
  })

  it('includes Dogecoin and Prisma families', () => {
    expect(ChainFamily.Dogecoin).toBe('dogecoin')
    expect(ChainFamily.Prisma).toBe('prisma')
  })
})
