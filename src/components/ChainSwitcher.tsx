import React, { useState } from 'react'
import { useAuth, type Chain } from '../contexts/AuthContext'
import './ChainSwitcher.css'

/**
 * Top line integrates two button, one is for search(user can input and search for specific chain), another is for add custom network
 * Second line is multitab, one tab is mainnet for every chain, another tab is testnet for every chain
 * @returns 
 */
const ChainSwitcher: React.FC = () => {
  const { activeChain, switchChain, CHAINS } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'mainnet' | 'testnet'>('mainnet')

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    // Reset states when opening/closing? Maybe keep them.
    if (!isOpen) {
      setSearchTerm('')
      // Set tab based on current chain?
      const isCurrentTestnet = isTestnet(activeChain)
      setActiveTab(isCurrentTestnet ? 'testnet' : 'mainnet')
    }
  }

  const handleSelect = (chainId: number) => {
    switchChain(chainId)
    setIsOpen(false)
  }

  const isTestnet = (chain: Chain) => {
    const name = chain.name.toLowerCase()
    return name.includes('testnet') || name.includes('sepolia') || name.includes('goerli') || name.includes('mumbai')
  }

  const filteredChains = CHAINS.filter(chain => {
    const matchesSearch = chain.name.toLowerCase().includes(searchTerm.toLowerCase())
    const chainIsTestnet = isTestnet(chain)
    const matchesTab = activeTab === 'testnet' ? chainIsTestnet : !chainIsTestnet
    return matchesSearch && matchesTab
  })

  return (
    <div className="chain-switcher-container">
      <div className="chain-switcher-trigger" onClick={toggleDropdown}>
        <div className="chain-icon">🌐</div>
        <div className="chain-info">
          <span className="chain-name">{activeChain.name}</span>
        </div>
        <div className={`arrow ${isOpen ? 'up' : 'down'}`}>▼</div>
      </div>

      {isOpen && (
        <div className="chain-dropdown">
          <div className="dropdown-top-section">
            <div className="search-row">
              <input 
                type="text" 
                placeholder="Search chains..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="chain-search-input"
                onClick={(e) => e.stopPropagation()}
              />
              <button className="add-network-btn" onClick={(e) => {
                e.stopPropagation()
                // Handle add custom network
                alert('Add custom network feature coming soon!')
              }}>
                +
              </button>
            </div>
            <div className="tabs-row">
              <button 
                className={`tab-btn ${activeTab === 'mainnet' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTab('mainnet')
                }}
              >
                Mainnet
              </button>
              <button 
                className={`tab-btn ${activeTab === 'testnet' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTab('testnet')
                }}
              >
                Testnet
              </button>
            </div>
          </div>
          
          <div className="chain-list-scroll">
            {filteredChains.length > 0 ? (
              filteredChains.map((chain) => (
                <div
                  key={chain.id}
                  className={`chain-option ${chain.id === activeChain.id ? 'active' : ''}`}
                  onClick={() => handleSelect(chain.id)}
                >
                  <div className="option-row">
                    <span className="option-name">{chain.name}</span>
                    {chain.id === activeChain.id && <span className="check-mark">✓</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-chains-found">No chains found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChainSwitcher
