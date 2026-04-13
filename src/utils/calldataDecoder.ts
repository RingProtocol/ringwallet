import { ethers } from 'ethers'

export interface DecodedParam {
  name: string
  value: string
}

export interface DecodedCalldata {
  selector: string
  method: string
  description: string
  params: DecodedParam[]
}

interface KnownMethod {
  name: string
  signature: string
  description: string
  decode: (data: string) => DecodedParam[]
}

const MAX_UINT256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
)
const HIGH_THRESHOLD = MAX_UINT256 / 2n

function truncAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatUint256(raw: bigint): string {
  if (raw >= HIGH_THRESHOLD) return 'Unlimited'
  return raw.toLocaleString()
}

function decodeWithAbi(
  data: string,
  types: string[],
  names: string[]
): DecodedParam[] {
  try {
    const coder = ethers.AbiCoder.defaultAbiCoder()
    const decoded = coder.decode(types, '0x' + data.slice(10))
    return names.map((name, i) => {
      const val = decoded[i]
      if (types[i] === 'address') return { name, value: truncAddr(String(val)) }
      if (types[i] === 'uint256')
        return { name, value: formatUint256(BigInt(val)) }
      return { name, value: String(val) }
    })
  } catch {
    return []
  }
}

const KNOWN_METHODS: Record<string, KnownMethod> = {
  '0x095ea7b3': {
    name: 'approve',
    signature: 'approve(address,uint256)',
    description: 'Approve token spending',
    decode: (data) =>
      decodeWithAbi(data, ['address', 'uint256'], ['Spender', 'Amount']),
  },
  '0xa9059cbb': {
    name: 'transfer',
    signature: 'transfer(address,uint256)',
    description: 'Transfer tokens',
    decode: (data) =>
      decodeWithAbi(data, ['address', 'uint256'], ['To', 'Amount']),
  },
  '0x23b872dd': {
    name: 'transferFrom',
    signature: 'transferFrom(address,address,uint256)',
    description: 'Transfer tokens on behalf of another address',
    decode: (data) =>
      decodeWithAbi(
        data,
        ['address', 'address', 'uint256'],
        ['From', 'To', 'Amount']
      ),
  },
  '0x42842e0e': {
    name: 'safeTransferFrom',
    signature: 'safeTransferFrom(address,address,uint256)',
    description: 'Transfer NFT safely',
    decode: (data) =>
      decodeWithAbi(
        data,
        ['address', 'address', 'uint256'],
        ['From', 'To', 'Token ID']
      ),
  },
  '0xa22cb465': {
    name: 'setApprovalForAll',
    signature: 'setApprovalForAll(address,bool)',
    description: 'Grant FULL access to ALL your NFTs in this collection',
    decode: (data) =>
      decodeWithAbi(data, ['address', 'bool'], ['Operator', 'Approved']),
  },
  '0x39509351': {
    name: 'increaseAllowance',
    signature: 'increaseAllowance(address,uint256)',
    description: 'Increase token spending allowance',
    decode: (data) =>
      decodeWithAbi(data, ['address', 'uint256'], ['Spender', 'Added Amount']),
  },
  '0xa457c2d7': {
    name: 'decreaseAllowance',
    signature: 'decreaseAllowance(address,uint256)',
    description: 'Decrease token spending allowance',
    decode: (data) =>
      decodeWithAbi(
        data,
        ['address', 'uint256'],
        ['Spender', 'Reduced Amount']
      ),
  },
  '0xd0e30db0': {
    name: 'deposit',
    signature: 'deposit()',
    description: 'Wrap ETH to WETH',
    decode: () => [],
  },
  '0x2e1a7d4d': {
    name: 'withdraw',
    signature: 'withdraw(uint256)',
    description: 'Unwrap WETH to ETH',
    decode: (data) => decodeWithAbi(data, ['uint256'], ['Amount']),
  },
  '0x3593564c': {
    name: 'execute',
    signature: 'execute(bytes,bytes[],uint256)',
    description: 'Uniswap Universal Router swap',
    decode: () => [{ name: 'Type', value: 'Batched swap commands' }],
  },
  '0x5ae401dc': {
    name: 'multicall',
    signature: 'multicall(uint256,bytes[])',
    description: 'Uniswap V3 Router multicall',
    decode: () => [{ name: 'Type', value: 'Batched router calls' }],
  },
  '0x4a25d94a': {
    name: 'swapTokensForExactETH',
    signature:
      'swapTokensForExactETH(uint256,uint256,address[],address,uint256)',
    description: 'Swap tokens for exact ETH',
    decode: () => [{ name: 'Type', value: 'DEX swap' }],
  },
  '0x7ff36ab5': {
    name: 'swapExactETHForTokens',
    signature: 'swapExactETHForTokens(uint256,address[],address,uint256)',
    description: 'Swap exact ETH for tokens',
    decode: () => [{ name: 'Type', value: 'DEX swap' }],
  },
  '0x38ed1739': {
    name: 'swapExactTokensForTokens',
    signature:
      'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
    description: 'Swap exact tokens for tokens',
    decode: () => [{ name: 'Type', value: 'DEX swap' }],
  },
}

export function decodeCalldata(
  data: string | undefined | null
): DecodedCalldata | null {
  if (!data || data === '0x' || data.length < 10) return null

  const selector = data.slice(0, 10).toLowerCase()
  const known = KNOWN_METHODS[selector]

  if (known) {
    return {
      selector,
      method: known.name,
      description: known.description,
      params: known.decode(data),
    }
  }

  return {
    selector,
    method: selector,
    description: 'Unknown contract call',
    params: [],
  }
}
