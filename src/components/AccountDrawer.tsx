import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { syncToDevice } from '../features/syncToDevice'
import Introduce from './Introduce'
import './AccountDrawer.css'

interface AccountDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type MenuItem = {
  key: string
  icon: string
  label: string
  action: () => void
  disabled?: boolean
  sublabel?: string
  hidden?: boolean
}

const AccountDrawer: React.FC<AccountDrawerProps> = ({ isOpen, onClose }) => {
  const { wallets, activeWallet, activeWalletIndex, switchWallet, user, login, logout, isSolanaChain, isBitcoinChain, solanaWallets, bitcoinWallets, activeSolanaWallet, activeBitcoinWallet } = useAuth()
  const [showWalletList, setShowWalletList] = useState(false)
  const [featureLoading, setFeatureLoading] = useState<string | null>(null)
  const [featureError, setFeatureError] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

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
    setFeatureError('')
    onClose()
  }

  const handleMigrate = async () => {
    if (!user) return
    setFeatureLoading('migrate')
    setFeatureError('')
    try {
      const result = await syncToDevice({ user, login })
      if (result.success) {
        alert('✅ 账号同步成功！\n\n已在此设备上创建了包含相同钱包密钥的 Passkey。\n下次您可以直接在此设备上使用生物识别登录，无需扫码。')
        handleClose()
      } else {
        setFeatureError(result.error || '同步失败')
      }
    } catch (err) {
      setFeatureError('同步错误: ' + (err as Error).message)
    } finally {
      setFeatureLoading(null)
    }
  }

  const handleLogout = () => {
    logout()
    handleClose()
  }

  const menuItems: MenuItem[] = [
    { key: 'switch', icon: '🔄', label: '切换账号', action: () => setShowWalletList(!showWalletList) },
    { key: 'notifications', icon: '🔔', label: '通知设置', action: () => {}, disabled: true },
    // { key: 'upgrade-sc', icon: '⬆️', label: '升级到智能合约钱包', sublabel: '即将推出', action: () => {}, disabled: true },
    // { key: 'signing-scheme', icon: '🔏', label: 'Passkey 原生签名 (secp256r1)', sublabel: '即将推出', action: () => {}, disabled: true },
    // { key: 'migrate', icon: '📱', label: featureLoading === 'migrate' ? '同步中...' : '从 Android 迁移', action: handleMigrate, disabled: featureLoading === 'migrate' },
    // { key: 'security', icon: '🛡️', label: '安全检查', action: () => {}, disabled: true },
    // { key: 'developer', icon: '🛠️', label: 'Developer tools', action: () => {}, disabled: true },
    { key: 'feedback', icon: '💬', label: 'Feedback', action: () => setShowFeedback(true) },
    { key: 'about', icon: 'ℹ️', label: 'About', action: () => setShowAbout(true) },
    { key: 'logout', icon: '↩️', label: '退出登录', action: handleLogout },
  ]

  return (
    <>
      {showFeedback && (
        <div className="about-overlay visible" onClick={() => setShowFeedback(false)}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-header">
              <h3>Feedback</h3>
              <button className="about-close-btn" onClick={() => setShowFeedback(false)}>✕</button>
            </div>
            <iframe
              src="https://tally.so/r/Gxry7o"
              title="Feedback Form"
              className="feedback-iframe"
            />
          </div>
        </div>
      )}
      {showAbout && (
        <div className="about-overlay visible" onClick={() => setShowAbout(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-header">
              <h3>About</h3>
              <button className="about-close-btn" onClick={() => setShowAbout(false)}>✕</button>
            </div>
            <Introduce />
          </div>
        </div>
      )}
      <div className={`drawer-overlay ${isOpen ? 'visible' : ''}`} onClick={handleClose} />
      <div className={`account-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>账户</h3>
          <button className="drawer-close-btn" onClick={handleClose}>✕</button>
        </div>

        {(() => {
          const displayWallet = isBitcoinChain ? activeBitcoinWallet : isSolanaChain ? activeSolanaWallet : activeWallet
          if (!displayWallet) return null
          return (
            <div className="drawer-account-info">
              <div className="drawer-account-icon">🔐</div>
              <div className="drawer-account-detail">
                <span className="drawer-account-name">Wallet #{activeWalletIndex + 1}</span>
                <div className="drawer-account-addr-row">
                  <span className="drawer-account-address">{formatAddress(displayWallet.address)}</span>
                  <button
                    className="drawer-copy-btn"
                    onClick={(e) => copyToClipboard(e, displayWallet.address)}
                    title="Copy Address"
                  >📋Copy</button>
                </div>
              </div>
            </div>
          )
        })()}

        {featureError && (
          <div className="drawer-error">{featureError}</div>
        )}

        <div className="drawer-menu-list">
          {menuItems.filter(i => !i.hidden).map((item) => (
            <React.Fragment key={item.key}>
              <div
                className={`drawer-menu-item ${item.key === 'switch' && showWalletList ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={item.disabled ? undefined : item.action}
              >
                <span className="drawer-menu-icon">{item.icon}</span>
                <span className="drawer-menu-label">
                  {item.label}
                  {item.sublabel && (
                    <span style={{ marginLeft: '6px', fontSize: '10px', color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: '8px' }}>
                      {item.sublabel}
                    </span>
                  )}
                </span>
                {item.key === 'switch' && (
                  <span className={`drawer-menu-arrow ${showWalletList ? 'expanded' : ''}`}>›</span>
                )}
              </div>

              {item.key === 'switch' && showWalletList && (
                <div className="drawer-wallet-list">
                  {(isBitcoinChain ? bitcoinWallets : isSolanaChain ? solanaWallets : wallets).map((wallet, index) => (
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
                        >📋Copy</button>
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
