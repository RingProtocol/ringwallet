import { ethers } from 'ethers'
import { decodeCalldata, type DecodedCalldata } from './calldataDecoder'

export interface DecodedSignedTx {
  to: string
  value: string
  nonce: number
  chainId: number
  gasLimit: string
  fee: string
  feeLabel: string
  data: DecodedCalldata | null
  type: number
}

function truncAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatGwei(wei: bigint): string {
  const gwei = Number(wei) / 1e9
  if (gwei >= 1) return `${gwei.toFixed(2)} Gwei`
  return `${(Number(wei) / 1e6).toFixed(2)} Mwei`
}

export function decodeSignedTx(
  signedTxHex: string,
  nativeSymbol = 'ETH'
): DecodedSignedTx | null {
  try {
    const tx = ethers.Transaction.from(signedTxHex)

    const valueFmt = ethers.formatEther(tx.value)
    const valueClean = valueFmt.replace(/\.?0+$/, '') || '0'

    let fee: string
    let feeLabel: string
    if (tx.type === 2) {
      feeLabel = 'Max Fee'
      fee = tx.maxFeePerGas ? formatGwei(tx.maxFeePerGas) : '-'
    } else {
      feeLabel = 'Gas Price'
      fee = tx.gasPrice ? formatGwei(tx.gasPrice) : '-'
    }

    return {
      to: tx.to ? truncAddr(tx.to) : '(Contract Creation)',
      value: `${valueClean} ${nativeSymbol}`,
      nonce: tx.nonce,
      chainId: Number(tx.chainId),
      gasLimit: tx.gasLimit.toLocaleString(),
      fee,
      feeLabel,
      data: decodeCalldata(tx.data),
      type: tx.type ?? 0,
    }
  } catch {
    return null
  }
}
