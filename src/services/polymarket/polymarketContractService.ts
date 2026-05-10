import { ethers } from 'ethers'
import { POLYMARKET_CONTRACTS, POLYMARKET_DECIMALS } from './constants'
import { CONDITIONAL_TOKENS_ABI, ERC20_APPROVE_ABI } from './abis/ctfExchange'

const { conditionalTokens, usdc } = POLYMARKET_CONTRACTS

// ── Read helpers ───────────────────────────────────────────────

export async function getConditionalTokenBalance(
  provider: ethers.Provider,
  walletAddress: string,
  tokenId: string
): Promise<bigint> {
  const c = new ethers.Contract(
    conditionalTokens,
    CONDITIONAL_TOKENS_ABI,
    provider
  )
  return (await c.balanceOf(walletAddress, tokenId)) as bigint
}

export async function getConditionalTokenBalances(
  provider: ethers.Provider,
  walletAddress: string,
  tokenIds: string[]
): Promise<bigint[]> {
  const c = new ethers.Contract(
    conditionalTokens,
    CONDITIONAL_TOKENS_ABI,
    provider
  )
  const accounts = tokenIds.map(() => walletAddress)
  return (await c.balanceOfBatch(accounts, tokenIds)) as bigint[]
}

export async function getUsdcAllowance(
  provider: ethers.Provider,
  walletAddress: string,
  spender: string
): Promise<bigint> {
  const c = new ethers.Contract(usdc, ERC20_APPROVE_ABI, provider)
  return (await c.allowance(walletAddress, spender)) as bigint
}

export async function getUsdcBalance(
  provider: ethers.Provider,
  walletAddress: string
): Promise<bigint> {
  const c = new ethers.Contract(usdc, ERC20_APPROVE_ABI, provider)
  return (await c.balanceOf(walletAddress)) as bigint
}

// ── Write helpers ──────────────────────────────────────────────

export interface ApproveUsdcParams {
  provider: ethers.Provider
  signer: ethers.Signer
  spender: string
  amount: bigint
}

export async function approveUsdc({
  provider,
  signer,
  spender,
  amount,
}: ApproveUsdcParams): Promise<ethers.TransactionResponse> {
  const c = new ethers.Contract(usdc, ERC20_APPROVE_ABI, signer)
  const feeData = await provider.getFeeData()
  return c.approve(spender, amount, {
    type: 2,
    maxFeePerGas: feeData.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
  })
}

// ── Position computation ───────────────────────────────────────

export function formatPolyAmount(raw: bigint | string): string {
  return ethers.formatUnits(raw, POLYMARKET_DECIMALS)
}

export function parsePolyAmount(val: string): bigint {
  return ethers.parseUnits(val, POLYMARKET_DECIMALS)
}
