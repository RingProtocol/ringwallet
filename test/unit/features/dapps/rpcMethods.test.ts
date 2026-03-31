import { describe, it, expect } from 'vitest'
import {
  READ_ONLY_METHODS,
  APPROVAL_METHODS,
  LOCAL_METHODS,
  RPC_ERRORS,
} from '@/features/dapps/constants/rpcMethods'

describe('RPC method sets — completeness', () => {
  it('READ_ONLY_METHODS contains eth_call', () => {
    expect(READ_ONLY_METHODS.has('eth_call')).toBe(true)
  })

  it('READ_ONLY_METHODS contains common read methods', () => {
    const expected = [
      'eth_call',
      'eth_getBalance',
      'eth_getBlockByNumber',
      'eth_getTransactionByHash',
      'eth_getTransactionReceipt',
      'eth_gasPrice',
      'eth_blockNumber',
      'eth_estimateGas',
    ]
    for (const m of expected) {
      expect(READ_ONLY_METHODS.has(m)).toBe(true)
    }
  })

  it('APPROVAL_METHODS contains all state-changing methods', () => {
    const expected = [
      'eth_requestAccounts',
      'eth_sendTransaction',
      'personal_sign',
      'eth_signTypedData_v4',
      'wallet_switchEthereumChain',
    ]
    for (const m of expected) {
      expect(APPROVAL_METHODS.has(m)).toBe(true)
    }
  })

  it('LOCAL_METHODS contains eth_accounts and eth_chainId', () => {
    expect(LOCAL_METHODS.has('eth_accounts')).toBe(true)
    expect(LOCAL_METHODS.has('eth_chainId')).toBe(true)
  })
})

describe('RPC method sets — mutual exclusivity', () => {
  it('no overlap between READ_ONLY and APPROVAL', () => {
    for (const m of READ_ONLY_METHODS) {
      expect(APPROVAL_METHODS.has(m)).toBe(false)
    }
  })

  it('no overlap between READ_ONLY and LOCAL', () => {
    for (const m of READ_ONLY_METHODS) {
      expect(LOCAL_METHODS.has(m)).toBe(false)
    }
  })

  it('no overlap between APPROVAL and LOCAL', () => {
    for (const m of APPROVAL_METHODS) {
      expect(LOCAL_METHODS.has(m)).toBe(false)
    }
  })
})

describe('RPC_ERRORS', () => {
  it('USER_REJECTED has code 4001', () => {
    expect(RPC_ERRORS.USER_REJECTED.code).toBe(4001)
  })

  it('CHAIN_NOT_ADDED has code 4902', () => {
    expect(RPC_ERRORS.CHAIN_NOT_ADDED.code).toBe(4902)
  })

  it('all error codes are EIP-1193 compliant (4xxx)', () => {
    for (const err of Object.values(RPC_ERRORS)) {
      expect(err.code).toBeGreaterThanOrEqual(4000)
      expect(err.code).toBeLessThan(5000)
    }
  })

  it('all errors have a non-empty message', () => {
    for (const err of Object.values(RPC_ERRORS)) {
      expect(err.message.length).toBeGreaterThan(0)
    }
  })
})
