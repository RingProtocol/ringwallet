import { ethers } from 'ethers'
import { decodeCalldata, type DecodedCalldata } from './calldataDecoder'

export interface DecodedUserOp {
  sender: string
  to: string
  value: string
  nonce: string
  isDeployed: boolean
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  innerCalldata: DecodedCalldata | null
}

function truncAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatGasHex(hex: string): string {
  try {
    return BigInt(hex).toLocaleString()
  } catch {
    return hex
  }
}

function formatGwei(hex: string): string {
  try {
    const wei = BigInt(hex)
    const gwei = Number(wei) / 1e9
    if (gwei >= 1) return `${gwei.toFixed(2)} Gwei`
    return `${(Number(wei) / 1e6).toFixed(2)} Mwei`
  } catch {
    return hex
  }
}

const EXECUTE_SELECTOR = '0xb61d27f6'

export function decodeUserOp(
  userOp: Record<string, string>,
  isDeployed: boolean,
  nativeSymbol = 'ETH'
): DecodedUserOp | null {
  try {
    const callData = userOp.callData
    if (!callData || callData.length < 10) return null

    let to = '(Unknown)'
    let value = `0 ${nativeSymbol}`
    let innerData: string | null = null

    const selector = callData.slice(0, 10).toLowerCase()
    if (selector === EXECUTE_SELECTOR) {
      const iface = new ethers.Interface([
        'function execute(address to, uint256 value, bytes data)',
      ])
      const decoded = iface.decodeFunctionData('execute', callData)
      to = truncAddr(decoded[0])
      const valBig = decoded[1] as bigint
      const valFmt = ethers.formatEther(valBig)
      const valClean = valFmt.replace(/\.?0+$/, '') || '0'
      value = `${valClean} ${nativeSymbol}`
      innerData = decoded[2] as string
    }

    return {
      sender: truncAddr(userOp.sender || ''),
      to,
      value,
      nonce: userOp.nonce || '0x0',
      isDeployed,
      callGasLimit: formatGasHex(userOp.callGasLimit || '0x0'),
      verificationGasLimit: formatGasHex(userOp.verificationGasLimit || '0x0'),
      preVerificationGas: formatGasHex(userOp.preVerificationGas || '0x0'),
      maxFeePerGas: formatGwei(userOp.maxFeePerGas || '0x0'),
      maxPriorityFeePerGas: formatGwei(userOp.maxPriorityFeePerGas || '0x0'),
      innerCalldata: innerData ? decodeCalldata(innerData) : null,
    }
  } catch {
    return null
  }
}
