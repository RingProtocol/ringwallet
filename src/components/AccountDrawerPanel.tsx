import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ChainFamily } from '../models/ChainType'
import {
  BITCOIN_TESTNET_ACCOUNTS_KEY,
  DOGECOIN_TESTNET_ACCOUNTS_KEY,
  cosmosAccountsKey,
} from '../services/chainplugins'
import { COSMOS_CHAIN_VARIANTS } from '../config/chains'
import {
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  type DeviceNotificationPermission,
} from '../services/devices/notificationService'
import Introduce from './Introduce'
import './AccountDrawer.css'
import { useI18n } from '../i18n'

export interface AccountDrawerPanelProps {
  /** When false, collapses wallet list and clears transient errors (e.g. drawer closed or tab switched). */
  active?: boolean
  expandWalletListOnOpen?: boolean
  pulseExpandWalletList?: number
  /** Called after logout (e.g. close drawer). */
  onLogout?: () => void
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

const AccountDrawerPanel: React.FC<AccountDrawerPanelProps> = ({
  active = true,
  expandWalletListOnOpen = false,
  pulseExpandWalletList = 0,
  onLogout,
}) => {
  const {
    activeWalletIndex,
    switchWallet,
    logout,
    activeChain,
    accountsByFamily,
  } = useAuth()
  const { lang, setLang, t } = useI18n()
  const [showWalletList, setShowWalletList] = useState(false)
  const [featureError, setFeatureError] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [notificationPermission, setNotificationPermission] =
    useState<DeviceNotificationPermission>('default')

  const wasActive = useRef(false)

  useEffect(() => {
    if (!active) {
      setShowWalletList(false)
      setFeatureError('')
    }
  }, [active])

  useEffect(() => {
    if (active && !wasActive.current) {
      setShowWalletList(expandWalletListOnOpen)
    }
    wasActive.current = active
  }, [active, expandWalletListOnOpen])

  useEffect(() => {
    if (!active || pulseExpandWalletList <= 0) return
    setShowWalletList(true)
  }, [active, pulseExpandWalletList])

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

  const handleLogout = () => {
    logout()
    setShowWalletList(false)
    setFeatureError('')
    onLogout?.()
  }

  useEffect(() => {
    setNotificationPermission(getDeviceNotificationPermission())
  }, [active])

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
      {featureError && <div className="drawer-error">{featureError}</div>}
      <div className="drawer-menu-list">
        {menuItems
          .filter((i) => !i.hidden)
          .map((item) => (
            <div className="drawer-menu-section" key={item.key}>
              <div
                className={`drawer-menu-item ${item.disabled ? 'disabled' : ''}`}
                onClick={item.disabled ? undefined : item.action}
              >
                <span className="drawer-menu-icon">{item.icon}</span>
                <span className="drawer-menu-label">
                  {item.label}
                  {item.sublabel && (
                    <span className="drawer-menu-sublabel">
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
                    let key: string = family ?? ChainFamily.EVM
                    if (
                      family === ChainFamily.Bitcoin &&
                      activeChain?.network === 'testnet'
                    ) {
                      key = BITCOIN_TESTNET_ACCOUNTS_KEY
                    } else if (
                      family === ChainFamily.Dogecoin &&
                      activeChain?.network === 'testnet'
                    ) {
                      key = DOGECOIN_TESTNET_ACCOUNTS_KEY
                    } else if (
                      family === ChainFamily.Cosmos &&
                      activeChain?.addressPrefix
                    ) {
                      const variant = COSMOS_CHAIN_VARIANTS.find(
                        (v) => v.addressPrefix === activeChain.addressPrefix
                      )
                      if (variant) key = cosmosAccountsKey(variant.key)
                    }
                    return accountsByFamily[key] ?? []
                  })().map((wallet, index) => (
                    <div
                      key={index}
                      className="drawer-wallet-option"
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
            </div>
          ))}
      </div>
    </>
  )
}

export default AccountDrawerPanel
