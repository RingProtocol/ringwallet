import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { upgradeTo7951 } from '../features/upgrade7951'
import { syncToDevice } from '../features/syncToDevice'
import Introduce from './Introduce'
import './AccountDrawer.css'

interface AccountDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const AccountDrawer: React.FC<AccountDrawerProps> = ({ isOpen, onClose }) => {
  const { wallets, activeWallet, activeWalletIndex, switchWallet, user, login } = useAuth()
  const [showWalletList, setShowWalletList] = useState(false)
  const [featureLoading, setFeatureLoading] = useState<string | null>(null)
  const [featureError, setFeatureError] = useState('')
  const [showAbout, setShowAbout] = useState(false)

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

  const handleUpgrade = async () => {
    if (!user) return
    setFeatureLoading('upgrade7702')
    setFeatureError('')
    try {
      const result = await upgradeTo7951({ user, login })
      if (result.success) {
        alert('✅ 升级成功！\n\n您的账户已成功升级为 EIP-7951 智能账户。')
        handleClose()
      } else {
        setFeatureError(result.error || '升级失败')
      }
    } catch (err) {
      setFeatureError('升级错误: ' + (err as Error).message)
    } finally {
      setFeatureLoading(null)
    }
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

  const showUpgradeOption = !user?.publicKey || user?.accountType !== 'eip-7951'

  const menuItems = [
    { key: 'switch', icon: '🔄', label: '切换账号', action: () => setShowWalletList(!showWalletList) },
    { key: 'notifications', icon: '🔔', label: '通知设置', action: () => {}, disabled: true },
    { key: 'upgrade7702', icon: '⬆️', label: featureLoading === 'upgrade7702' ? '升级中...' : '升级 7702', action: handleUpgrade, hidden: !showUpgradeOption, disabled: featureLoading === 'upgrade7702' },
    { key: 'migrate', icon: '📱', label: featureLoading === 'migrate' ? '同步中...' : '从 Android 迁移', action: handleMigrate, disabled: featureLoading === 'migrate' },
    { key: 'security', icon: '🛡️', label: '安全检查', action: () => {}, disabled: true },
    { key: 'developer', icon: '🛠️', label: 'Developer tools', action: () => {}, disabled: true },
    { key: 'about', icon: 'ℹ️', label: 'About Ring', action: () => setShowAbout(true) },
  ]

  return (
    <>
      {showAbout && (
        <div className="about-overlay visible" onClick={() => setShowAbout(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-header">
              <h3>About Ring</h3>
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

        {activeWallet && (
          <div className="drawer-account-info">
            <div className="drawer-account-icon">🔐</div>
            <div className="drawer-account-detail">
              <span className="drawer-account-name">Wallet #{activeWalletIndex + 1}</span>
              <span className="drawer-account-address">{formatAddress(activeWallet.address)}</span>
            </div>
          </div>
        )}

        {featureError && (
          <div className="drawer-error">{featureError}</div>
        )}

        <div className="drawer-menu-list">
          {menuItems.filter(i => !('hidden' in i && i.hidden)).map((item) => (
            <React.Fragment key={item.key}>
              <div
                className={`drawer-menu-item ${item.key === 'switch' && showWalletList ? 'active' : ''} ${'disabled' in item && item.disabled ? 'disabled' : ''}`}
                onClick={'disabled' in item && item.disabled ? undefined : item.action}
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
