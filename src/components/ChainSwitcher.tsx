import React, { useState } from 'react'
import { useAuth, type Chain } from '../contexts/AuthContext'
import { ChainFamily } from '../models/ChainType'
import './ChainSwitcher.css'

const ChainSwitcher: React.FC = () => {
  const { activeChain, switchChain, CHAINS } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'mainnet' | 'testnet'>('mainnet')

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
      setActiveTab(isTestnet(activeChain) ? 'testnet' : 'mainnet')
    }
  }

  const handleSelect = (chainId: number | string) => {
    switchChain(chainId)
    setIsOpen(false)
  }

  const isTestnet = (chain: Chain): boolean => {
    const name = chain.name.toLowerCase()
    return (
      name.includes('testnet') ||
      name.includes('sepolia') ||
      name.includes('goerli') ||
      name.includes('mumbai') ||
      name.includes('devnet')
    )
  }

  const chainIcon = (chain: Chain): string => {
    if (chain.family === ChainFamily.Solana) return '◎'
    if (chain.family === ChainFamily.Bitcoin) return '₿'
    return '🌐'
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
        <div className="chain-icon">{chainIcon(activeChain)}</div>
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
                alert('Add custom network feature coming soon!')
              }}>
                +
              </button>
            </div>
            <div className="tabs-row">
              <button
                className={`tab-btn ${activeTab === 'mainnet' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('mainnet') }}
              >
                Mainnet
              </button>
              <button
                className={`tab-btn ${activeTab === 'testnet' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('testnet') }}
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
                    <span className="option-icon">{chainIcon(chain)}</span>
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
