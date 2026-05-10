import { useState, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import {
  buildCtfOrder,
  signCtfOrder,
  postOrder,
  deriveApiKey,
  fetchMarketTokens,
  type OrderArgs,
  type ClobApiCredentials,
  type CtfOrder,
} from '../services/polymarket/polymarketClobService'
import {
  getUsdcAllowance,
  getUsdcBalance,
  approveUsdc,
  parsePolyAmount,
} from '../services/polymarket/polymarketContractService'
import { POLYMARKET_CONTRACTS } from '../services/polymarket/constants'
import { useI18n } from '../i18n'

const { ctfExchangeV1 } = POLYMARKET_CONTRACTS

type BettingState =
  | 'idle'
  | 'checking_allowance'
  | 'approving'
  | 'signing'
  | 'posting'
  | 'success'
  | 'error'

export interface UsePolymarketBettingReturn {
  state: BettingState
  error: string | null
  txHash: string | null
  orderHash: string | null
  placeBuyOrder: (args: {
    slug: string
    outcomeIndex: number
    usdcAmount: string
    signer: ethers.Signer
    provider: ethers.Provider
  }) => Promise<void>
  reset: () => void
}

export function usePolymarketBetting(): UsePolymarketBettingReturn {
  const { t } = useI18n()
  const [state, setState] = useState<BettingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [orderHash, setOrderHash] = useState<string | null>(null)
  const credsRef = useRef<ClobApiCredentials | null>(null)

  const placeBuyOrder = useCallback(
    async ({
      slug,
      outcomeIndex,
      usdcAmount,
      signer,
      provider,
    }: {
      slug: string
      outcomeIndex: number
      usdcAmount: string
      signer: ethers.Signer
      provider: ethers.Provider
    }) => {
      setState('idle')
      setError(null)
      setTxHash(null)
      setOrderHash(null)

      try {
        const address = await signer.getAddress()
        const amount = parsePolyAmount(usdcAmount)

        // 1. Fetch market tokens from Gamma API
        setState('checking_allowance')
        const tokens = await fetchMarketTokens(slug)
        const token = tokens[outcomeIndex]
        if (!token) {
          throw new Error('Invalid outcome index')
        }

        // 2. Check USDC balance
        const balance = await getUsdcBalance(provider, address)
        if (balance < amount) {
          throw new Error(t('insufficientBalance'))
        }

        // 3. Check / approve USDC allowance
        const allowance = await getUsdcAllowance(
          provider,
          address,
          ctfExchangeV1
        )
        if (allowance < amount) {
          setState('approving')
          const tx = await approveUsdc({
            provider,
            signer,
            spender: ctfExchangeV1,
            amount,
          })
          await tx.wait()
        }

        // 4. Derive API credentials (or reuse cached)
        if (!credsRef.current) {
          credsRef.current = await deriveApiKey(signer)
        }

        // 5. Build order
        const orderArgs: OrderArgs = {
          tokenId: token.tokenId,
          price: parseFloat(token.price),
          size: parseFloat(usdcAmount),
          side: 'BUY',
          tickSize: '0.001',
        }
        const unsignedOrder = buildCtfOrder(orderArgs, address, address)

        // 6. Sign EIP-712
        setState('signing')
        const signature = await signCtfOrder(signer, unsignedOrder)
        const signedOrder: CtfOrder = { ...unsignedOrder, signature }

        // 7. Post to CLOB
        setState('posting')
        const result = await postOrder(signedOrder, credsRef.current)
        setOrderHash((result as { orderID?: string })?.orderID ?? null)
        setState('success')
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : t('txFailed', { message: 'Unknown' })
        setError(msg)
        setState('error')
      }
    },
    [t]
  )

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
    setTxHash(null)
    setOrderHash(null)
  }, [])

  return { state, error, txHash, orderHash, placeBuyOrder, reset }
}
