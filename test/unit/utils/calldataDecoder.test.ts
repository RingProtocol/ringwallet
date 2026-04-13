import { describe, it, expect } from 'vitest'
import { decodeCalldata } from '@/utils/calldataDecoder'
import { ethers } from 'ethers'

function encodeCall(
  signature: string,
  types: string[],
  values: unknown[]
): string {
  const selector = ethers.id(signature).slice(0, 10)
  const coder = ethers.AbiCoder.defaultAbiCoder()
  const encoded = coder.encode(types, values)
  return selector + encoded.slice(2)
}

describe('decodeCalldata', () => {
  it('returns null for empty or missing data', () => {
    expect(decodeCalldata(null)).toBeNull()
    expect(decodeCalldata(undefined)).toBeNull()
    expect(decodeCalldata('0x')).toBeNull()
    expect(decodeCalldata('')).toBeNull()
  })

  describe('ERC-20 approve', () => {
    it('decodes approve(address,uint256)', () => {
      const data = encodeCall(
        'approve(address,uint256)',
        ['address', 'uint256'],
        ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', BigInt(1000)]
      )
      const result = decodeCalldata(data)
      expect(result).not.toBeNull()
      expect(result!.method).toBe('approve')
      expect(result!.description).toBe('Approve token spending')
      expect(result!.params.find((p) => p.name === 'Spender')?.value).toContain(
        '0x68b3'
      )
      expect(result!.params.find((p) => p.name === 'Amount')?.value).toBe(
        '1,000'
      )
    })

    it('shows Unlimited for MAX_UINT256 approve', () => {
      const MAX = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
      const data = encodeCall(
        'approve(address,uint256)',
        ['address', 'uint256'],
        ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', MAX]
      )
      const result = decodeCalldata(data)
      expect(result!.params.find((p) => p.name === 'Amount')?.value).toBe(
        'Unlimited'
      )
    })
  })

  describe('ERC-20 transfer', () => {
    it('decodes transfer(address,uint256)', () => {
      const data = encodeCall(
        'transfer(address,uint256)',
        ['address', 'uint256'],
        ['0x1234567890abcdef1234567890abcdef12345678', BigInt(500)]
      )
      const result = decodeCalldata(data)
      expect(result!.method).toBe('transfer')
      expect(result!.params.find((p) => p.name === 'To')).toBeTruthy()
      expect(result!.params.find((p) => p.name === 'Amount')?.value).toBe('500')
    })
  })

  describe('setApprovalForAll (NFT)', () => {
    it('decodes setApprovalForAll(address,bool)', () => {
      const data = encodeCall(
        'setApprovalForAll(address,bool)',
        ['address', 'bool'],
        ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', true]
      )
      const result = decodeCalldata(data)
      expect(result).not.toBeNull()
      expect(result!.method).toBe('setApprovalForAll')
      expect(result!.description).toContain('FULL access')
      expect(result!.params.find((p) => p.name === 'Operator')).toBeTruthy()
      expect(result!.params.find((p) => p.name === 'Approved')?.value).toBe(
        'true'
      )
    })
  })

  describe('unknown selectors', () => {
    it('returns unknown method with selector for unrecognized calldata', () => {
      const data = '0xdeadbeef0000000000000000000000000000000000000000'
      const result = decodeCalldata(data)
      expect(result).not.toBeNull()
      expect(result!.method).toBe('0xdeadbeef')
      expect(result!.description).toBe('Unknown contract call')
    })
  })
})
