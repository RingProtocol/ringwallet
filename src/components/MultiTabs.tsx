import React, { useMemo, useState } from 'react'
import TokenBalance from './TokenBalance'
import TransactionHistory from './TransactionHistory'
import DAppsPage from '../features/dapps/components/DAppsPage'
import './MultiTabs.css'

interface MultiTabsProps {
  onOpenSettings?: () => void
  /** Hide DApps tab (e.g. wallet peek over an open DApp). */
  hideDAppsTab?: boolean
  onTokenSend?: (token: {
    symbol: string
    name: string
    address?: string
    decimals?: number
  }) => void
}

const TAB_DEFS = [
  { key: 'tokens', label: 'Assets' },
  { key: 'activity', label: 'Activity' },
  { key: 'dapps', label: 'DApps' },
] as const

function getInitialTab(hideDAppsTab: boolean): string {
  if (typeof window === 'undefined') return 'tokens'
  const p = new URLSearchParams(window.location.search)
  const t = p.get('tab')
  if (t === 'dapps' && hideDAppsTab) return 'tokens'
  if (t && TAB_DEFS.some((tab) => tab.key === t)) return t
  return 'tokens'
}

const MultiTabs: React.FC<MultiTabsProps> = ({
  onOpenSettings,
  hideDAppsTab = false,
  onTokenSend,
}) => {
  const visibleTabs = useMemo(
    () =>
      hideDAppsTab
        ? TAB_DEFS.filter((tab) => tab.key !== 'dapps')
        : [...TAB_DEFS],
    [hideDAppsTab]
  )

  const [activeTab, setActiveTab] = useState(() => getInitialTab(hideDAppsTab))

  return (
    <div className="multi-tabs">
      <div className="tabs-header">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {activeTab === 'tokens' && <TokenBalance onTokenSend={onTokenSend} />}
        {activeTab === 'activity' && <TransactionHistory />}
        {activeTab === 'dapps' && !hideDAppsTab && (
          <DAppsPage onOpenSettings={onOpenSettings} />
        )}
      </div>
    </div>
  )
}

export default MultiTabs
