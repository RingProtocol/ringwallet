import React, { useState } from 'react'
import TokenBalance from './TokenBalance'
import TransactionHistory from './TransactionHistory'
import DAppsPage from '../features/dapps/components/DAppsPage'
import './MultiTabs.css'

const tabs = [
  { key: 'tokens', label: 'Tokens' },
  { key: 'activity', label: 'Activity' },
  { key: 'dapps', label: 'DApps' },
]

function getInitialTab(): string {
  if (typeof window === 'undefined') return 'tokens'
  const p = new URLSearchParams(window.location.search)
  const t = p.get('tab')
  if (t && tabs.some(tab => tab.key === t)) return t
  return 'tokens'
}

const MultiTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(getInitialTab)

  return (
    <div className="multi-tabs">
      <div className="tabs-header">
        {tabs.map((tab) => (
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
        {activeTab === 'tokens' && <TokenBalance />}
        {activeTab === 'activity' && <TransactionHistory />}
        {activeTab === 'dapps' && <DAppsPage />}
      </div>
    </div>
  )
}

export default MultiTabs
