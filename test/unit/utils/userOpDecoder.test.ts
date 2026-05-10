import { describe, it, expect } from 'vitest'
import { ethers } from 'ethers'
import { decodeUserOp } from '@/utils/userOpDecoder'

function buildCallData(to: string, value: bigint, data: string): string {
  const iface = new ethers.Interface([
    'function execute(address to, uint256 value, bytes data)',
  ])
  return iface.encodeFunctionData('execute', [to, value, data])
}

function buildTransferCalldata(): string {
  const iface = new ethers.Interface([
    'function transfer(address to, uint256 amount)',
  ])
  return iface.encodeFunctionData('transfer', [
    '0x1234567890abcdef1234567890abcdef12345678',
    ethers.parseUnits('1000', 6),
  ])
}

describe('decodeUserOp', () => {
  it('decodes a simple ETH transfer UserOp', () => {
    const callData = buildCallData(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      ethers.parseEther('1.5'),
      '0x'
    )

    const userOp: Record<string, string> = {
      sender: '0xaabbccddee112233445566778899aabbccddeeff',
      nonce: '0x0',
      initCode: '0x',
      callData,
      callGasLimit: ethers.toBeHex(150000n),
      verificationGasLimit: ethers.toBeHex(120000n),
      preVerificationGas: ethers.toBeHex(50000n),
      maxFeePerGas: ethers.toBeHex(ethers.parseUnits('30', 'gwei')),
      maxPriorityFeePerGas: ethers.toBeHex(ethers.parseUnits('1.5', 'gwei')),
      paymasterAndData: '0x',
      signature: '0x',
    }

    const result = decodeUserOp(userOp, true, 'ETH')
    expect(result).not.toBeNull()
    expect(result!.sender).toContain('0xaabb')
    expect(result!.to).toContain('0x68b3')
    expect(result!.value).toBe('1.5 ETH')
    expect(result!.isDeployed).toBe(true)
    expect(result!.callGasLimit).toBe('150,000')
    expect(result!.maxFeePerGas).toContain('Gwei')
    expect(result!.innerCalldata).toBeNull()
  })

  it('decodes a UserOp with inner ERC-20 transfer', () => {
    const innerData = buildTransferCalldata()
    const callData = buildCallData(
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      0n,
      innerData
    )

    const userOp: Record<string, string> = {
      sender: '0xaabbccddee112233445566778899aabbccddeeff',
      nonce: '0x1',
      initCode: '0x',
      callData,
      callGasLimit: ethers.toBeHex(200000n),
      verificationGasLimit: ethers.toBeHex(150000n),
      preVerificationGas: ethers.toBeHex(100000n),
      maxFeePerGas: ethers.toBeHex(ethers.parseUnits('20', 'gwei')),
      maxPriorityFeePerGas: ethers.toBeHex(ethers.parseUnits('2', 'gwei')),
      paymasterAndData: '0x',
      signature: '0x',
    }

    const result = decodeUserOp(userOp, true, 'ETH')
    expect(result).not.toBeNull()
    expect(result!.value).toBe('0 ETH')
    expect(result!.innerCalldata).not.toBeNull()
    expect(result!.innerCalldata!.method).toBe('transfer')
    expect(
      result!.innerCalldata!.params.find((p) => p.name === 'To')
    ).toBeTruthy()
  })

  it('shows not-deployed status', () => {
    const callData = buildCallData(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      0n,
      '0x'
    )

    const userOp: Record<string, string> = {
      sender: '0xaabbccddee112233445566778899aabbccddeeff',
      nonce: '0x0',
      initCode: '0xdeadbeef',
      callData,
      callGasLimit: ethers.toBeHex(200000n),
      verificationGasLimit: ethers.toBeHex(150000n),
      preVerificationGas: ethers.toBeHex(100000n),
      maxFeePerGas: ethers.toBeHex(ethers.parseUnits('30', 'gwei')),
      maxPriorityFeePerGas: ethers.toBeHex(ethers.parseUnits('1.5', 'gwei')),
      paymasterAndData: '0x',
      signature: '0x',
    }

    const result = decodeUserOp(userOp, false)
    expect(result).not.toBeNull()
    expect(result!.isDeployed).toBe(false)
  })

  it('returns null for empty callData', () => {
    const userOp: Record<string, string> = {
      sender: '0xaabbccddee112233445566778899aabbccddeeff',
      nonce: '0x0',
      callData: '0x',
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
    }
    expect(decodeUserOp(userOp, true)).toBeNull()
  })

  it('uses custom nativeSymbol', () => {
    const callData = buildCallData(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      ethers.parseEther('2'),
      '0x'
    )

    const userOp: Record<string, string> = {
      sender: '0xaabbccddee112233445566778899aabbccddeeff',
      nonce: '0x0',
      callData,
      callGasLimit: ethers.toBeHex(150000n),
      verificationGasLimit: ethers.toBeHex(120000n),
      preVerificationGas: ethers.toBeHex(50000n),
      maxFeePerGas: ethers.toBeHex(ethers.parseUnits('30', 'gwei')),
      maxPriorityFeePerGas: ethers.toBeHex(ethers.parseUnits('1.5', 'gwei')),
    }

    const result = decodeUserOp(userOp, true, 'MATIC')
    expect(result!.value).toBe('2 MATIC')
  })
})
