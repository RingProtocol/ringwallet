import { describe, it, expect } from 'vitest'
import { ethers } from 'ethers'
import { decodeSignedTx } from '@/utils/signedTxDecoder'

async function buildSignedTx(
  overrides: Partial<ethers.TransactionLike> = {}
): Promise<string> {
  const wallet = new ethers.Wallet('0x' + 'ab'.repeat(32))
  const tx: ethers.TransactionLike = {
    to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    value: ethers.parseEther('0.1'),
    data: '0x',
    nonce: 42,
    chainId: 11155111,
    type: 2,
    gasLimit: 31500,
    maxFeePerGas: ethers.parseUnits('30', 'gwei'),
    maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
    ...overrides,
  }
  return wallet.signTransaction(tx)
}

describe('decodeSignedTx', () => {
  it('decodes a basic ETH transfer', async () => {
    const hex = await buildSignedTx()
    const result = decodeSignedTx(hex, 'SepoliaETH')
    expect(result).not.toBeNull()
    expect(result!.to).toContain('0x68b3')
    expect(result!.to).toContain('Fc45')
    expect(result!.value).toBe('0.1 SepoliaETH')
    expect(result!.nonce).toBe(42)
    expect(result!.chainId).toBe(11155111)
    expect(result!.gasLimit).toBeTruthy()
    expect(result!.fee).toContain('Gwei')
    expect(result!.feeLabel).toBe('Max Fee')
    expect(result!.data).toBeNull()
    expect(result!.type).toBe(2)
  })

  it('decodes an ERC-20 transfer call', async () => {
    const iface = new ethers.Interface([
      'function transfer(address to, uint256 amount)',
    ])
    const calldata = iface.encodeFunctionData('transfer', [
      '0x1234567890abcdef1234567890abcdef12345678',
      ethers.parseUnits('1000', 6),
    ])
    const hex = await buildSignedTx({ data: calldata, value: 0n })
    const result = decodeSignedTx(hex)
    expect(result).not.toBeNull()
    expect(result!.data).not.toBeNull()
    expect(result!.data!.method).toBe('transfer')
    expect(result!.data!.description).toBe('Transfer tokens')
    expect(result!.data!.params.find((p) => p.name === 'To')).toBeTruthy()
    expect(result!.data!.params.find((p) => p.name === 'Amount')).toBeTruthy()
  })

  it('decodes an ERC-20 approve call', async () => {
    const iface = new ethers.Interface([
      'function approve(address spender, uint256 amount)',
    ])
    const calldata = iface.encodeFunctionData('approve', [
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      ethers.MaxUint256,
    ])
    const hex = await buildSignedTx({ data: calldata, value: 0n })
    const result = decodeSignedTx(hex)
    expect(result!.data!.method).toBe('approve')
    expect(result!.data!.params.find((p) => p.name === 'Amount')?.value).toBe(
      'Unlimited'
    )
  })

  it('decodes a legacy (type 0) transaction', async () => {
    const wallet = new ethers.Wallet('0x' + 'ab'.repeat(32))
    const tx: ethers.TransactionLike = {
      to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      value: ethers.parseEther('1'),
      data: '0x',
      nonce: 0,
      chainId: 11155111,
      type: 0,
      gasLimit: 21000,
      gasPrice: ethers.parseUnits('20', 'gwei'),
    }
    const hex = await wallet.signTransaction(tx)
    const result = decodeSignedTx(hex)
    expect(result).not.toBeNull()
    expect(result!.feeLabel).toBe('Gas Price')
    expect(result!.fee).toContain('Gwei')
    expect(result!.value).toBe('1 ETH')
    expect(result!.type).toBe(0)
  })

  it('shows contract creation when to is null', async () => {
    const hex = await buildSignedTx({ to: undefined, data: '0x6060604052' })
    const result = decodeSignedTx(hex)
    expect(result).not.toBeNull()
    expect(result!.to).toBe('(Contract Creation)')
  })

  it('uses nativeSymbol in value display', async () => {
    const hex = await buildSignedTx({ value: ethers.parseEther('5') })
    const result = decodeSignedTx(hex, 'MATIC')
    expect(result!.value).toBe('5 MATIC')
  })

  it('defaults nativeSymbol to ETH', async () => {
    const hex = await buildSignedTx({ value: ethers.parseEther('0.5') })
    const result = decodeSignedTx(hex)
    expect(result!.value).toBe('0.5 ETH')
  })

  it('returns null for invalid hex', () => {
    expect(decodeSignedTx('not-a-hex')).toBeNull()
    expect(decodeSignedTx('0xdeadbeef')).toBeNull()
    expect(decodeSignedTx('')).toBeNull()
  })

  it('handles zero value transaction', async () => {
    const hex = await buildSignedTx({ value: 0n })
    const result = decodeSignedTx(hex)
    expect(result!.value).toBe('0 ETH')
  })
})
