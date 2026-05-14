import React, { useCallback, useEffect, useRef, useState } from 'react'
import TransactionHistory from '../history/TransactionHistory'
import { useI18n } from '../../i18n'
import { useAuth } from '../../contexts/AuthContext'
import ChainSwitcher from '../chains/ChainSwitcher'

const PULL_THRESHOLD = 60

interface ActivityTabHeaderProps {
  selectedChainId: number | string | null
  onChainSelect: (id: number | string) => void
}

interface ActivityTabBodyProps {
  selectedChainId: number | string | null
}

export const ActivityTabHeader: React.FC<ActivityTabHeaderProps> = ({
  selectedChainId,
  onChainSelect,
}) => {
  const { t } = useI18n()
  const { activeChain } = useAuth()

  return (
    <header className="wallet-main-page__top-bar wallet-main-page__top-bar--collapsed">
      <h1 className="wallet-main-page__tab-title">{t('activityTab')}</h1>
      <ChainSwitcher
        selectedChainId={selectedChainId ?? activeChain?.id}
        onSelect={onChainSelect}
      />
    </header>
  )
}

export const ActivityTabBody: React.FC<ActivityTabBodyProps> = ({
  selectedChainId,
}) => {
  const { CHAINS } = useAuth()
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [pullY, setPullY] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollParentRef = useRef<Element | null>(null)
  const touchStartYRef = useRef(0)

  // Find the nearest scrollable ancestor once on mount.
  useEffect(() => {
    let el: Element | null = wrapperRef.current?.parentElement ?? null
    while (el) {
      const { overflowY } = getComputedStyle(el)
      if (overflowY === 'auto' || overflowY === 'scroll') {
        scrollParentRef.current = el
        break
      }
      el = el.parentElement
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const scrollParent = scrollParentRef.current
    // Only allow pull when already scrolled to the very top.
    if (!scrollParent || scrollParent.scrollTop > 2) return
    const deltaY = e.touches[0].clientY - touchStartYRef.current
    if (deltaY <= 0) return
    // Rubber-band damping so it doesn't over-extend.
    setPullY(Math.min(deltaY * 0.45, PULL_THRESHOLD + 16))
  }, [])

  const handleTouchEnd = useCallback(() => {
    setPullY((current) => {
      if (current >= PULL_THRESHOLD) {
        setRefreshSignal((n) => n + 1)
      }
      return 0
    })
  }, [])

  const chainOverride =
    selectedChainId !== null
      ? CHAINS.find((c) => c.id === selectedChainId)
      : undefined

  const atThreshold = pullY >= PULL_THRESHOLD

  return (
    <div
      ref={wrapperRef}
      className="wallet-main-page__activity"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className={`activity-ptr__track${pullY > 0 ? ' activity-ptr__track--pulling' : ''}`}
        style={{ height: pullY }}
      >
        <svg
          className="activity-ptr__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: Math.min(pullY / PULL_THRESHOLD, 1),
            // 随下拉距离线性旋转，到达阈值时正好转满一圈
            transform: `rotate(${Math.min((pullY / PULL_THRESHOLD) * 360, 360)}deg)`,
            color: atThreshold
              ? 'var(--ring-accent, #8b5cf6)'
              : 'var(--ring-text-muted)',
          }}
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-4" />
        </svg>
      </div>

      <TransactionHistory
        chainOverride={chainOverride}
        refreshSignal={refreshSignal}
      />
    </div>
  )
}

const ActivityTab: React.FC = () => {
  const { activeChain } = useAuth()
  const [selectedChainId, setSelectedChainId] = React.useState<
    number | string | null
  >(null)

  return (
    <>
      <ActivityTabHeader
        selectedChainId={selectedChainId ?? activeChain?.id ?? null}
        onChainSelect={setSelectedChainId}
      />
      <ActivityTabBody selectedChainId={selectedChainId} />
    </>
  )
}

export default ActivityTab
