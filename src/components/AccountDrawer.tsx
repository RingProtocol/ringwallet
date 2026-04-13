import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ChainFamily } from '../models/ChainType'
import { BITCOIN_TESTNET_ACCOUNTS_KEY } from '../services/chainplugins'
import {
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  type DeviceNotificationPermission,
} from '../services/devices/notificationService'
import Introduce from './Introduce'
import './AccountDrawer.css'
import { useI18n } from '../i18n'

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
  const {
    activeWalletIndex,
    switchWallet,
    logout,
    activeChain,
    activeAccount,
    accountsByFamily,
  } = useAuth()
  const { lang, setLang, t } = useI18n()
  const [showWalletList, setShowWalletList] = useState(false)
  const [featureError, setFeatureError] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [notificationPermission, setNotificationPermission] =
    useState<DeviceNotificationPermission>('default')

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const copyToClipboard = (
    e: React.MouseEvent<HTMLButtonElement>,
    text: string
  ) => {
    e.stopPropagation()
    const btn = e.currentTarget
    const original = btn.innerHTML
    navigator.clipboard
      .writeText(text)
      .then(() => {
        btn.innerHTML = '✅'
        setTimeout(() => {
          btn.innerHTML = original
        }, 1000)
      })
      .catch((err) => console.error('Failed to copy:', err))
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

  const handleLogout = () => {
    logout()
    handleClose()
  }

  useEffect(() => {
    setNotificationPermission(getDeviceNotificationPermission())
  }, [isOpen])

  const notificationSublabel =
    notificationPermission === 'granted'
      ? t('notificationsStatusEnabled')
      : notificationPermission === 'denied'
        ? t('notificationsStatusBlocked')
        : notificationPermission === 'unsupported'
          ? t('notificationsStatusUnsupported')
          : t('notificationsStatusTapToEnable')

  const handleNotifications = async () => {
    setFeatureError('')

    const permission = await requestDeviceNotificationPermission()
    setNotificationPermission(permission)

    if (permission === 'granted') {
      setFeatureError(t('notificationsEnabledMessage'))
      return
    }

    if (permission === 'denied') {
      setFeatureError(t('notificationsBlockedMessage'))
      return
    }

    if (permission === 'unsupported') {
      setFeatureError(t('notificationsUnsupportedMessage'))
      return
    }

    setFeatureError(t('notificationsPermissionPendingMessage'))
  }

  const menuItems: MenuItem[] = [
    {
      key: 'switch',
      icon: '🔄',
      label: t('switchAccount'),
      action: () => setShowWalletList(!showWalletList),
    },
    {
      key: 'notifications',
      icon: '🔔',
      label: t('notifications'),
      sublabel: notificationSublabel,
      action: () => {
        void handleNotifications()
      },
    },
    {
      key: 'language',
      icon: '🌐',
      label: t('language'),
      sublabel: lang === 'en' ? t('english') : t('chinese'),
      action: () => setLang(lang === 'en' ? 'zh' : 'en'),
    },
    // { key: 'upgrade-sc', icon: '⬆️', label: 'Upgrade to smart account', sublabel: 'Coming soon', action: () => {}, disabled: true },
    // { key: 'signing-scheme', icon: '🔏', label: 'Passkey native signing (secp256r1)', sublabel: 'Coming soon', action: () => {}, disabled: true },
    // { key: 'security', icon: '🛡️', label: 'Security check', action: () => {}, disabled: true },
    // { key: 'developer', icon: '🛠️', label: 'Developer tools', action: () => {}, disabled: true },
    {
      key: 'feedback',
      icon: '💬',
      label: t('feedback'),
      action: () => setShowFeedback(true),
    },
    {
      key: 'about',
      icon: 'ℹ️',
      label: t('about'),
      action: () => setShowAbout(true),
    },
    {
      key: 'terms',
      icon: '📄',
      label: t('termsOfService'),
      action: () => window.open('/terms-of-service', '_blank'),
    },
    {
      key: 'privacy',
      icon: '🔒',
      label: t('privacyPolicy'),
      action: () => window.open('/privacy-policy', '_blank'),
    },
    { key: 'logout', icon: '↩️', label: t('logout'), action: handleLogout },
  ]

  return (
    <>
      {showFeedback && (
        <div
          className="about-overlay visible"
          onClick={() => setShowFeedback(false)}
        >
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-header">
              <h3>{t('feedback')}</h3>
              <button
                className="about-close-btn"
                onClick={() => setShowFeedback(false)}
              >
                ✕
              </button>
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
        <div
          className="about-overlay visible"
          onClick={() => setShowAbout(false)}
        >
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-header">
              <h3>{t('about')}</h3>
              <button
                className="about-close-btn"
                onClick={() => setShowAbout(false)}
              >
                ✕
              </button>
            </div>
            <Introduce />
          </div>
        </div>
      )}
      <div
        className={`drawer-overlay ${isOpen ? 'visible' : ''}`}
        onClick={handleClose}
      />
      <div className={`account-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>{t('account')}</h3>
          <button className="drawer-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        {(() => {
          if (!activeAccount) return null
          return (
            <div className="drawer-account-info">
              <div className="drawer-account-icon">🔐</div>
              <div className="drawer-account-detail">
                <span className="drawer-account-name">
                  {t('wallet')} #{activeWalletIndex + 1}
                </span>
                <div className="drawer-account-addr-row">
                  <span className="drawer-account-address">
                    {formatAddress(activeAccount.address)}
                  </span>
                  <button
                    className="drawer-copy-btn"
                    onClick={(e) => copyToClipboard(e, activeAccount.address)}
                    title={t('copy')}
                  >
                    📋{t('copy')}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {featureError && <div className="drawer-error">{featureError}</div>}

        <div className="drawer-menu-list">
          {menuItems
            .filter((i) => !i.hidden)
            .map((item) => (
              <React.Fragment key={item.key}>
                <div
                  className={`drawer-menu-item ${item.key === 'switch' && showWalletList ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                  onClick={item.disabled ? undefined : item.action}
                >
                  <span className="drawer-menu-icon">{item.icon}</span>
                  <span className="drawer-menu-label">
                    {item.label}
                    {item.sublabel && (
                      <span
                        style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          color: '#94a3b8',
                          background: '#f1f5f9',
                          padding: '1px 6px',
                          borderRadius: '8px',
                        }}
                      >
                        {item.sublabel}
                      </span>
                    )}
                  </span>
                  {item.key === 'switch' && (
                    <span
                      className={`drawer-menu-arrow ${showWalletList ? 'expanded' : ''}`}
                    >
                      ›
                    </span>
                  )}
                </div>

                {item.key === 'switch' && showWalletList && (
                  <div className="drawer-wallet-list">
                    {(() => {
                      const family = activeChain?.family
                      const key =
                        family === ChainFamily.Bitcoin &&
                        activeChain?.network === 'testnet'
                          ? BITCOIN_TESTNET_ACCOUNTS_KEY
                          : (family ?? ChainFamily.EVM)
                      return accountsByFamily[key] ?? []
                    })().map((wallet, index) => (
                      <div
                        key={index}
                        className={`drawer-wallet-option ${index === activeWalletIndex ? 'active' : ''}`}
                        onClick={() => handleSelectWallet(index)}
                      >
                        <div className="drawer-wallet-row">
                          <span className="drawer-wallet-name">
                            {t('wallet')} #{index + 1}
                          </span>
                          {index === activeWalletIndex && (
                            <span className="drawer-wallet-check">✓</span>
                          )}
                        </div>
                        <div className="drawer-wallet-addr-row">
                          <span className="drawer-wallet-addr">
                            {formatAddress(wallet.address)}
                          </span>
                          <button
                            className="drawer-copy-btn"
                            onClick={(e) => copyToClipboard(e, wallet.address)}
                            title={t('copy')}
                          >
                            📋{t('copy')}
                          </button>
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
