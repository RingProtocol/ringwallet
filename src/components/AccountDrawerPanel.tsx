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
  icon: React.ReactNode
  label: string
  action: () => void
  disabled?: boolean
  sublabel?: string
  hidden?: boolean
  negative?: boolean
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
    activeAccount,
  } = useAuth()
  const { lang, setLang, t } = useI18n()
  const [showWalletList, setShowWalletList] = useState(false)
  const [featureError, setFeatureError] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const devTapCountRef = useRef(0)
  const devTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDevTap = () => {
    devTapCountRef.current++
    if (devTapTimerRef.current) clearTimeout(devTapTimerRef.current)
    if (devTapCountRef.current >= 7) {
      devTapCountRef.current = 0
      const current = localStorage.getItem('ring:devMode') === '1'
      localStorage.setItem('ring:devMode', current ? '0' : '1')
      window.dispatchEvent(new Event('ring:dev-mode-changed'))
    } else {
      devTapTimerRef.current = setTimeout(() => {
        devTapCountRef.current = 0
      }, 5000)
    }
  }
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
    return `${address.substring(0, 6)}…${address.substring(address.length - 4)}`
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
        btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ${t('copied')}`
        setTimeout(() => {
          btn.innerHTML = original
        }, 1000)
      })
      .catch((err) => console.error('Failed to copy:', err))
  }

  const handleSelectWallet = (index: number) => {
    switchWallet(index)
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
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      ),
      label: t('switchAccount'),
      action: () => setShowWalletList(!showWalletList),
    },
    {
      key: 'notifications',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
      label: t('notifications'),
      sublabel: notificationSublabel,
      action: () => {
        void handleNotifications()
      },
    },
    {
      key: 'language',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
      ),
      label: t('language'),
      sublabel: lang === 'en' ? t('english') : t('chinese'),
      action: () => setLang(lang === 'en' ? 'zh' : 'en'),
    },
    {
      key: 'feedback',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      label: t('feedback'),
      action: () => setShowFeedback(true),
    },
    {
      key: 'about',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      label: t('about'),
      action: () => setShowAbout(true),
    },
    {
      key: 'terms',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="14" y2="17" />
        </svg>
      ),
      label: t('termsOfService'),
      action: () => window.open('/terms-of-service', '_blank'),
    },
    {
      key: 'privacy',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      label: t('privacyPolicy'),
      action: () => window.open('/privacy-policy', '_blank'),
    },
    {
      key: 'logout',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
      label: t('logout'),
      action: handleLogout,
      negative: true,
    },
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
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <Introduce />
          </div>
        </div>
      )}

      {/* Header card */}
      {activeAccount && (
        <div className="drawer-header-card">
          <div className="drawer-header-card__icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 48 48"
              style={{ display: 'block' }}
            >
              <defs>
                <linearGradient
                  id="ringGradHeader"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f15266" />
                  <stop offset="50%" stopColor="#bc74ed" />
                  <stop offset="100%" stopColor="#1abee9" />
                </linearGradient>
              </defs>
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="url(#ringGradHeader)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="90 120"
                transform="rotate(-30 24 24)"
              />
              <circle cx="24" cy="24" r="4.5" fill="url(#ringGradHeader)" />
            </svg>
          </div>
          <div className="drawer-header-card__info">
            <div className="drawer-header-card__name">
              {t('wallet')} #{activeWalletIndex + 1}
            </div>
            <div className="drawer-header-card__addr">
              {formatAddress(activeAccount.address)}
            </div>
          </div>
          <button
            type="button"
            className="drawer-header-card__copy"
            onClick={(e) => copyToClipboard(e, activeAccount.address)}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {t('copy')}
          </button>
        </div>
      )}

      {featureError && <div className="drawer-error">{featureError}</div>}
      <div className="drawer-menu-list">
        {menuItems
          .filter((i) => !i.hidden)
          .map((item, idx, arr) => (
            <div className="drawer-menu-section" key={item.key}>
              <div
                className={`drawer-menu-item ${item.disabled ? 'disabled' : ''} ${item.negative ? 'negative' : ''}`}
                onClick={item.disabled ? undefined : item.action}
              >
                <span
                  className="drawer-menu-icon"
                  {...(item.key === 'about'
                    ? {
                        onClick: (e: React.MouseEvent) => {
                          e.stopPropagation()
                          handleDevTap()
                        },
                      }
                    : {})}
                >
                  {item.icon}
                </span>
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
                          <span className="drawer-wallet-check">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
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
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          {t('copy')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {idx < arr.length - 1 && <div className="drawer-menu-divider" />}
            </div>
          ))}
      </div>
    </>
  )
}

export default AccountDrawerPanel
