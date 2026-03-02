import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './ChainSwitcher.css'

const ChainSwitcher = () => {
  const { activeChain, switchChain, CHAINS } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleSelect = (chainId) => {
    switchChain(chainId)
    setIsOpen(false)
  }

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
          <div className="dropdown-header">Select Network</div>
          <div className="chain-list-scroll">
            {CHAINS.map((chain) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChainSwitcher
