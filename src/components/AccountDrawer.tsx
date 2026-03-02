import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './AccountDrawer.css'

interface AccountDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const AccountDrawer: React.FC<AccountDrawerProps> = ({ isOpen, onClose }) => {
  const { wallets, activeWallet, activeWalletIndex, switchWallet } = useAuth()
  const [showWalletList, setShowWalletList] = useState(false)

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const copyToClipboard = (e: React.MouseEvent<HTMLButtonElement>, text: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      const btn = e.currentTarget
      const original = btn.innerHTML
      btn.innerHTML = '✅'
      setTimeout(() => { btn.innerHTML = original }, 1000)
    }).catch(err => console.error('Failed to copy:', err))
  }

  const handleSelectWallet = (index: number) => {
    switchWallet(index)
    setShowWalletList(false)
  }

  const handleClose = () => {
    setShowWalletList(false)
    onClose()
  }

  const menuItems = [
    { key: 'switch', icon: '🔄', label: '切换账号', action: () => setShowWalletList(!showWalletList) },
    { key: 'notifications', icon: '🔔', label: '通知设置', action: () => {} },
    { key: 'upgrade7702', icon: '⬆️', label: '升级 7702', action: () => {} },
    { key: 'migrate', icon: '📱', label: '从 Android 迁移', action: () => {} },
    { key: 'security', icon: '🛡️', label: '安全检查', action: () => {} },
  ]

  return (
    <>
      <div className={`drawer-overlay ${isOpen ? 'visible' : ''}`} onClick={handleClose} />
      <div className={`account-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>账户</h3>
          <button className="drawer-close-btn" onClick={handleClose}>✕</button>
        </div>

        {activeWallet && (
          <div className="drawer-account-info">
            <div className="drawer-account-icon">🔐</div>
            <div className="drawer-account-detail">
              <span className="drawer-account-name">Wallet #{activeWalletIndex + 1}</span>
              <span className="drawer-account-address">{formatAddress(activeWallet.address)}</span>
            </div>
          </div>
        )}

        <div className="drawer-menu-list">
          {menuItems.map((item) => (
            <React.Fragment key={item.key}>
              <div
                className={`drawer-menu-item ${item.key === 'switch' && showWalletList ? 'active' : ''}`}
                onClick={item.action}
              >
                <span className="drawer-menu-icon">{item.icon}</span>
                <span className="drawer-menu-label">{item.label}</span>
                {item.key === 'switch' && (
                  <span className={`drawer-menu-arrow ${showWalletList ? 'expanded' : ''}`}>›</span>
                )}
              </div>

              {item.key === 'switch' && showWalletList && (
                <div className="drawer-wallet-list">
                  {wallets.map((wallet, index) => (
                    <div
                      key={index}
                      className={`drawer-wallet-option ${index === activeWalletIndex ? 'active' : ''}`}
                      onClick={() => handleSelectWallet(index)}
                    >
                      <div className="drawer-wallet-row">
                        <span className="drawer-wallet-name">Wallet #{index + 1}</span>
                        {index === activeWalletIndex && <span className="drawer-wallet-check">✓</span>}
                      </div>
                      <div className="drawer-wallet-addr-row">
                        <span className="drawer-wallet-addr">{formatAddress(wallet.address)}</span>
                        <button
                          className="drawer-copy-btn"
                          onClick={(e) => copyToClipboard(e, wallet.address)}
                          title="Copy Address"
                        >📋</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  )
}

export default AccountDrawer
