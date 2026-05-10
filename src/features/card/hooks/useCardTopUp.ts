import { useState, useCallback, useRef } from 'react'
import { useCardProvider } from './useCardProvider'
import { useCardAccounts } from './useCardAccounts'
import type {
  TopUpAsset,
  TopUpOrder,
  TopUpResult,
} from '../types'

type TopUpStage =
  | 'idle'
  | 'selecting_asset'
  | 'entering_amount'
  | 'confirming'
  | 'signing'
  | 'processing'
  | 'success'
  | 'error'

const POLL_INTERVAL = 3000
const MAX_POLL_ATTEMPTS = 40

export function useCardTopUp() {
  const { adapter } = useCardProvider()
  const { activeCard, reload: reloadAccounts } = useCardAccounts()

  const [stage, setStage] = useState<TopUpStage>('idle')
  const [supportedAssets, setSupportedAssets] = useState<TopUpAsset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<TopUpAsset | null>(null)
  const [amount, setAmountState] = useState<string>('')
  const [order, setOrder] = useState<TopUpOrder | null>(null)
  const [result, setResult] = useState<TopUpResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const pollTopUpStatus = useCallback(
    (orderId: string) => {
      let attempts = 0

      pollTimerRef.current = setInterval(async () => {
        if (!adapter) return
        attempts++

        try {
          const status = await adapter.getTopUpStatus(orderId)

          if (status.status === 'confirmed') {
            clearPolling()
            setResult(status)
            setStage('success')
            reloadAccounts()
          } else if (status.status === 'failed') {
            clearPolling()
            setError('Top-up failed')
            setStage('error')
          }

          if (attempts >= MAX_POLL_ATTEMPTS) {
            clearPolling()
            setError('Top-up status polling timed out')
            setStage('error')
          }
        } catch (err) {
          clearPolling()
          setError((err as Error).message || 'Failed to check top-up status')
          setStage('error')
        }
      }, POLL_INTERVAL)
    },
    [adapter, clearPolling, reloadAccounts],
  )

  const startTopUp = useCallback(async () => {
    if (!adapter) {
      setError('No card provider available')
      return
    }

    setError(null)
    setStage('selecting_asset')

    try {
      const assets = await adapter.getSupportedTopUpAssets()
      setSupportedAssets(assets)
    } catch (err) {
      setError((err as Error).message || 'Failed to load supported assets')
      setStage('error')
    }
  }, [adapter])

  const selectAsset = useCallback((asset: TopUpAsset) => {
    setSelectedAsset(asset)
    setAmountState('')
    setStage('entering_amount')
  }, [])

  const setAmount = useCallback((value: string) => {
    setAmountState(value)
  }, [])

  const confirm = useCallback(async () => {
    if (!adapter || !activeCard || !selectedAsset || !amount) {
      setError('Missing required top-up parameters')
      return
    }

    setError(null)
    setStage('confirming')

    try {
      const topUpOrder = await adapter.createTopUp({
        cardId: activeCard.id,
        asset: selectedAsset.symbol,
        chain: selectedAsset.chain,
        amount,
      })
      setOrder(topUpOrder)
      setStage('signing')
    } catch (err) {
      setError((err as Error).message || 'Failed to create top-up order')
      setStage('error')
    }
  }, [adapter, activeCard, selectedAsset, amount])

  const sign = useCallback(() => {
    setStage('signing')
  }, [])

  const submitSignature = useCallback(
    async (signature: string) => {
      if (!adapter || !order) {
        setError('No pending order to execute')
        return
      }

      setError(null)
      setStage('processing')

      try {
        const topUpResult = await adapter.executeTopUp(order, signature)
        setResult(topUpResult)

        if (topUpResult.status === 'confirmed') {
          setStage('success')
          reloadAccounts()
        } else {
          pollTopUpStatus(topUpResult.orderId)
        }
      } catch (err) {
        setError((err as Error).message || 'Failed to execute top-up')
        setStage('error')
      }
    },
    [adapter, order, pollTopUpStatus, reloadAccounts],
  )

  const reset = useCallback(() => {
    clearPolling()
    setStage('idle')
    setSupportedAssets([])
    setSelectedAsset(null)
    setAmountState('')
    setOrder(null)
    setResult(null)
    setError(null)
  }, [clearPolling])

  return {
    stage,
    supportedAssets,
    selectedAsset,
    amount,
    order,
    result,
    error,
    startTopUp,
    selectAsset,
    setAmount,
    confirm,
    sign,
    submitSignature,
    reset,
  }
}
