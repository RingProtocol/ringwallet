import React, { useState } from 'react'
import TokenBalance from './TokenBalance'
import TransactionHistory from './TransactionHistory'
import './MultiTabs.css'

const tabs = [
  { key: 'tokens', label: 'Tokens' },
  { key: 'activity', label: 'Activity' },
]

const MultiTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tokens')

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
      </div>
    </div>
  )
}

export default MultiTabs
