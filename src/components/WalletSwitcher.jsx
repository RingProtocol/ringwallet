import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './WalletSwitcher.css'

const WalletSwitcher = () => {
  const { isLoggedIn, wallets, activeWallet, activeWalletIndex, switchWallet } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!isLoggedIn || wallets.length === 0) {
    return null
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleSelect = (index) => {
    switchWallet(index)
    setIsOpen(false)
  }

  // 格式化地址显示 (前6后4)
  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const copyToClipboard = (e, text) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      // 可以添加一个简单的提示，这里暂时用 alert 或者 console
      console.log('Copied:', text)
      // 为了用户体验，可以把图标临时变成对勾，这里先简单处理
      const btn = e.currentTarget
      const originalHtml = btn.innerHTML
      btn.innerHTML = '✅'
      setTimeout(() => {
        btn.innerHTML = originalHtml
      }, 1000)
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  return (
    <div className="wallet-switcher-container">
      <div className="wallet-switcher-trigger" onClick={toggleDropdown}>
        <div className="wallet-icon">🔐</div>
        <div className="wallet-info">
          <span className="wallet-label">Wallet #{activeWalletIndex + 1}</span>
          <span className="wallet-address">{formatAddress(activeWallet?.address)}</span>
        </div>
        <div className={`arrow ${isOpen ? 'up' : 'down'}`}>▼</div>
      </div>

      {isOpen && (
        <div className="wallet-dropdown">
          <div className="dropdown-header">选择账户</div>
          <div className="wallet-list-scroll">
            {wallets.map((wallet, index) => (
              <div 
                key={index} 
                className={`wallet-option ${index === activeWalletIndex ? 'active' : ''}`}
                onClick={() => handleSelect(index)}
              >
                <div className="option-row">
                  <span className="option-name">Wallet #{index + 1}</span>
                  {index === activeWalletIndex && <span className="check-mark">✓</span>}
                </div>
                <div className="option-address-row">
                  <span className="option-address">{formatAddress(wallet.address)}</span>
                  <button 
                    className="copy-icon-btn" 
                    onClick={(e) => copyToClipboard(e, wallet.address)}
                    title="Copy Address"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletSwitcher
