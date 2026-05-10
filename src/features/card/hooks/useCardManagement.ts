import { useState, useCallback, useRef, useEffect } from 'react'
import { useCardProvider } from './useCardProvider'
import type { CardDetail, SpendingLimits } from '../types'

const REVEAL_TIMEOUT_MS = 60_000

export function useCardManagement() {
  const { adapter } = useCardProvider()

  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)
  const [revealCountdown, setRevealCountdown] = useState(0)

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [])

  const clearRevealTimers = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  const startRevealCountdown = useCallback(() => {
    setRevealCountdown(Math.floor(REVEAL_TIMEOUT_MS / 1000))

    countdownTimerRef.current = setInterval(() => {
      setRevealCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const getCardDetails = useCallback(
    async (cardId: string) => {
      if (!adapter) return

      try {
        const detail = await adapter.getCardDetails(cardId)
        setCardDetail(detail)
        return detail
      } catch (err) {
        throw err
      }
    },
    [adapter],
  )

  const freezeCard = useCallback(
    async (cardId: string) => {
      if (!adapter) return

      await adapter.freezeCard(cardId)

      setCardDetail((prev) => {
        if (!prev || prev.id !== cardId) return prev
        return { ...prev, status: 'frozen' }
      })
    },
    [adapter],
  )

  const unfreezeCard = useCallback(
    async (cardId: string) => {
      if (!adapter) return

      await adapter.unfreezeCard(cardId)

      setCardDetail((prev) => {
        if (!prev || prev.id !== cardId) return prev
        return { ...prev, status: 'active' }
      })
    },
    [adapter],
  )

  const updateSpendingLimits = useCallback(
    async (cardId: string, limits: SpendingLimits) => {
      if (!adapter) return

      await adapter.updateSpendingLimit(cardId, limits)

      setCardDetail((prev) => {
        if (!prev || prev.id !== cardId) return prev
        return { ...prev, spendingLimits: limits }
      })
    },
    [adapter],
  )

  const revealCardDetails = useCallback(
    async (cardId: string) => {
      if (!adapter) return

      clearRevealTimers()

      try {
        const detail = await adapter.getCardDetails(cardId)
        setCardDetail(detail)
        setIsRevealing(true)
        startRevealCountdown()

        revealTimerRef.current = setTimeout(() => {
          setIsRevealing(false)
          setRevealCountdown(0)
          // Clear sensitive fields after timeout
          setCardDetail((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              cardNumber: undefined,
              cvc: undefined,
            }
          })
        }, REVEAL_TIMEOUT_MS)
      } catch (err) {
        clearRevealTimers()
        setIsRevealing(false)
        setRevealCountdown(0)
        throw err
      }
    },
    [adapter, clearRevealTimers, startRevealCountdown],
  )

  return {
    cardDetail,
    isRevealing,
    revealCountdown,
    freezeCard,
    unfreezeCard,
    updateSpendingLimits,
    getCardDetails,
    revealCardDetails,
  }
}
