import React, { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { useSwapSigner } from '../swap/useSwapSigner'
import SwapDialog from '../swap/SwapDialog'
import { isRingV2Supported } from '../swap/ringV2Constants'
import { isKyberAggregatorSupported } from '../swap/kyberConstants'
import LifiBridgePage from '../bridge/LifiBridgePage'
import AcrossBridgePage from '../bridge/AcrossBridgePage'
import { useAuth } from '../../contexts/AuthContext'
import { WalletType } from '../../models/WalletType'
import type { SendTokenOption } from '../transaction/types'
import {
  EOASendForm,
  SmartAccountSendForm,
  SolanaSendForm,
  BitcoinSendForm,
  DogecoinSendForm,
  ReceiveDialog,
  SendTokenPickerSheet,
} from '../transaction'
import { useI18n } from '../../i18n'
import { TESTID } from '../testids'
import Toast from './Toast'
import EarnPage from '../earn/EarnPage'
import { useIsEarnSupported } from '../earn/useEarnSdk'
import { useDAppList } from '../../features/dapps/hooks/useDAppList'
import DAppContainerPage from '../../features/dapps/components/DAppContainerPage'
import DAppCard from '../../features/dapps/components/DAppCard'
import PopupListLayout from './PopupListLayout'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { DAppInfo } from '../../features/dapps/types/dapp'
import {
  getBridgeUrlsForChain,
  getBridgeNameFromUrl,
  LIFI_BRIDGE_URL,
  ACROSS_BRIDGE_URL,
} from '../../config/bridgeUrls'
import '../../features/dapps/components/DApps.css'
import './QuickActionBar.css'

/* ── ActionCircleEntry (single action button) ── */

export interface ActionCircleEntryProps {
  icon: React.ReactNode
  label: string
  variantClass: string
  onClick: () => void
  disabled?: boolean
  title?: string
  testId?: string
  onContextMenu?: (e: React.MouseEvent) => void
}

export const ActionCircleEntry: React.FC<ActionCircleEntryProps> = ({
  icon,
  label,
  variantClass,
  onClick,
  disabled,
  title,
  testId,
  onContextMenu,
}) => (
  <button
    type="button"
    className={`action-circle-entry ${variantClass}`}
    onClick={onClick}
    onContextMenu={onContextMenu}
    disabled={disabled}
    title={title}
    data-testid={testId}
  >
    <span className="action-circle-entry__disc" aria-hidden>
      {icon}
    </span>
    <span className="action-circle-entry__label">{label}</span>
  </button>
)

/* ── Constants ── */

const DEFAULT_MOONPAY_BASE_URL = 'https://buy.moonpay.com'
const LIFI_BRIDGE_ICON = '/icons/bridges/lifi.svg'
const ACROSS_BRIDGE_ICON = '/icons/bridges/across.svg'
const ALLBRIDGE_BRIDGE_ICON = '/icons/bridges/allbridge.svg'
const ARBITRUM_BRIDGE_ICON = '/icons/bridges/arbitrum.svg'
const BRIDGG_BRIDGE_ICON = '/icons/bridges/bridgg.svg'
const BUNGEE_BRIDGE_ICON = '/icons/bridges/bungee.svg'
const CELER_CBRIDGE_ICON = '/icons/bridges/cbridge.svg'
const DEBRIDGE_BRIDGE_ICON = '/icons/bridges/debridge.svg'
const HYPERCALL_BRIDGE_ICON = '/icons/bridges/hypercall.svg'
const JUMPER_BRIDGE_ICON = '/icons/bridges/jumper.svg'
const ORBITER_BRIDGE_ICON = '/icons/bridges/orbiter.svg'
const OWLTO_BRIDGE_ICON = '/icons/bridges/owlto.svg'
const RANGO_BRIDGE_ICON = '/icons/bridges/rango.svg'
const ROUTER_NITRO_BRIDGE_ICON = '/icons/bridges/routernitro.svg'
const STARGATE_BRIDGE_ICON = '/icons/bridges/stargate.svg'

function getBridgeIconSvg(name: string, url?: string): string {
  if (url === LIFI_BRIDGE_URL) return LIFI_BRIDGE_ICON
  if (url === ACROSS_BRIDGE_URL) return ACROSS_BRIDGE_ICON
  if (url === 'https://app.across.to') return ACROSS_BRIDGE_ICON
  if (url === 'https://bridge.arbitrum.io') return ARBITRUM_BRIDGE_ICON
  if (url === 'https://bridge.arbitrum.io/') return ARBITRUM_BRIDGE_ICON
  if (url === 'https://core.allbridge.io') return ALLBRIDGE_BRIDGE_ICON
  if (url === 'https://www.brid.gg') return BRIDGG_BRIDGE_ICON
  if (url === 'https://www.bungee.exchange') return BUNGEE_BRIDGE_ICON
  if (url === 'https://cbridge.celer.network') return CELER_CBRIDGE_ICON
  if (url === 'https://app.debridge.finance') return DEBRIDGE_BRIDGE_ICON
  if (url === 'https://www.hyperbridge.xyz/') return HYPERCALL_BRIDGE_ICON
  if (url === 'https://jumper.exchange') return JUMPER_BRIDGE_ICON
  if (url === 'https://www.orbiter.finance') return ORBITER_BRIDGE_ICON
  if (url === 'https://owlto.finance') return OWLTO_BRIDGE_ICON
  if (url === 'https://app.rango.exchange') return RANGO_BRIDGE_ICON
  if (url === 'https://app.routernitro.com') return ROUTER_NITRO_BRIDGE_ICON
  if (url === 'https://stargate.finance') return STARGATE_BRIDGE_ICON
  const initial = name.charAt(0).toUpperCase()
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  const color = `hsl(${hue}, 65%, 55%)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="${color}"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-family="sans-serif">${initial}</text></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function getMoonPayCurrencyCode(
  isBitcoinChain: boolean,
  isDogecoinChain: boolean,
  isSolanaChain: boolean,
  chainName?: string
): string | null {
  if (isBitcoinChain) return 'btc'
  if (isDogecoinChain) return 'doge'
  if (isSolanaChain) return 'sol'

  const normalizedChainName = chainName?.toLowerCase() ?? ''

  if (normalizedChainName.includes('polygon')) return 'matic'
  if (normalizedChainName.includes('ethereum')) return 'eth'
  if (normalizedChainName.includes('arbitrum')) return 'eth_arbitrum'
  if (normalizedChainName.includes('optimism')) return 'eth_optimism'
  if (normalizedChainName.includes('base')) return 'eth_base'

  return 'eth'
}

/* ── QuickActionBar ── */

interface QuickActionBarProps {
  initialToken?: SendTokenOption
  onSendFormClosed?: () => void
}

const QuickActionBar: React.FC<QuickActionBarProps> = ({
  initialToken,
  onSendFormClosed,
}) => {
  const {
    isLoggedIn,
    activeWallet,
    activeAccount,
    activeChain,
    isSolanaChain,
    isBitcoinChain,
    isDogecoinChain,
  } = useAuth()
  const { t } = useI18n()
  const {
    signer: swapSigner,
    chainId: swapChainId,
    rpcUrl: swapRpcUrl,
  } = useSwapSigner()
  const [showSend, setShowSend] = useState(false)
  const [sendStage, setSendStage] = useState<'select' | 'form'>('select')
  const [sendFormKey, setSendFormKey] = useState(0)
  const [showReceive, setShowReceive] = useState(false)
  const [swapDappOpen, setSwapDappOpen] = useState(false)
  const [showEarn, setShowEarn] = useState(false)
  const [sendToken, setSendToken] = useState<SendTokenOption | undefined>(
    undefined
  )
  const [toastMessage, setToastMessage] = useState('Comming soon')
  const [toastVisible, setToastVisible] = useState(false)
  const [activeDApp, setActiveDApp] = useState<DAppInfo | null>(null)
  const [dappListOpen, setDappListOpen] = useState(false)
  const [bridgeListOpen, setBridgeListOpen] = useState(false)
  const [lifiBridgeOpen, setLifiBridgeOpen] = useState(false)
  const [acrossBridgeOpen, setAcrossBridgeOpen] = useState(false)

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastVisible(true)
  }

  const {
    dapps,
    loading: dappsLoading,
    error: dappsError,
    reload,
  } = useDAppList()

  const canUseEarn = useIsEarnSupported()

  useEffect(() => {
    if (initialToken) {
      setSendToken(initialToken)
      setSendStage('form')
      setSendFormKey((k) => k + 1)
      setShowSend(true)
    }
  }, [initialToken])

  if (!isLoggedIn) return null
  if (!activeAccount) return null

  const isSmartAccount =
    !isSolanaChain &&
    !isBitcoinChain &&
    !isDogecoinChain &&
    activeWallet?.type === WalletType.SmartContract
  const receiveAddress = activeAccount.address
  const moonPayApiKey = import.meta.env.VITE_MOONPAY_API_KEY?.trim()
  const moonPayBaseUrl =
    import.meta.env.VITE_MOONPAY_BASE_URL?.trim() || DEFAULT_MOONPAY_BASE_URL
  const moonPayCurrencyCode = getMoonPayCurrencyCode(
    isBitcoinChain,
    isDogecoinChain,
    isSolanaChain,
    activeChain?.name
  )
  const showMoonPayEntry = import.meta.env.VITE_ENABLE_MOONPAY_ENTRY === 'true'
  const moonPayButtonTitle = !moonPayApiKey
    ? 'Set VITE_MOONPAY_API_KEY to enable MoonPay'
    : 'Buy crypto with MoonPay'

  const canUseRingSwap =
    isRingV2Supported(swapChainId) || isKyberAggregatorSupported(swapChainId)
  const swapButtonTitle = canUseRingSwap
    ? t('swapOpenTitle')
    : t('swapDisabledNonEvm')

  const earnButtonTitle = canUseEarn
    ? t('earnTitle')
    : t('earnDisabledNonEthereum')

  const handleCloseSend = () => {
    setShowSend(false)
    setSendStage('select')
    setSendToken(undefined)
    onSendFormClosed?.()
  }

  const renderSendForm = () => {
    if (isBitcoinChain)
      return (
        <BitcoinSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={() => setSendStage('select')}
        />
      )
    if (isDogecoinChain)
      return (
        <DogecoinSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={() => setSendStage('select')}
        />
      )
    if (isSolanaChain)
      return (
        <SolanaSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={() => setSendStage('select')}
        />
      )
    if (isSmartAccount)
      return (
        <SmartAccountSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={() => setSendStage('select')}
          initialToken={sendToken}
        />
      )
    return (
      <EOASendForm
        key={sendFormKey}
        onClose={handleCloseSend}
        onBack={() => setSendStage('select')}
        initialToken={sendToken}
      />
    )
  }

  const handleSwapClick = () => {
    if (!canUseRingSwap) return
    setSwapDappOpen(true)
  }

  const handleBridgeClick = () => {
    setBridgeListOpen(true)
  }

  const handleSelectBridge = (url: string) => {
    if (url === LIFI_BRIDGE_URL) {
      setLifiBridgeOpen(true)
      setBridgeListOpen(false)
      return
    }
    if (url === ACROSS_BRIDGE_URL) {
      setAcrossBridgeOpen(true)
      setBridgeListOpen(false)
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    setBridgeListOpen(false)
  }

  const bridgeUrls = getBridgeUrlsForChain(activeChain?.id ?? 0)

  const handleMoonPayClick = () => {
    if (!moonPayApiKey || !moonPayCurrencyCode) {
      setToastMessage(t('serviceNotAvailable'))
      setToastVisible(true)
      return
    }

    const moonPayUrl = new URL(moonPayBaseUrl)
    moonPayUrl.searchParams.set('apiKey', moonPayApiKey)
    moonPayUrl.searchParams.set('defaultCurrencyCode', moonPayCurrencyCode)
    moonPayUrl.searchParams.set('baseCurrencyCode', 'usd')
    moonPayUrl.searchParams.set('redirectURL', window.location.href)

    window.open(moonPayUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="transaction-actions-container">
      {swapDappOpen && swapSigner && (
        <SwapDialog
          signer={swapSigner}
          chainId={swapChainId}
          rpcUrl={swapRpcUrl}
          onClose={() => setSwapDappOpen(false)}
        />
      )}
      <div className="action-buttons" role="toolbar" aria-label={t('wallet')}>
        <ActionCircleEntry
          variantClass="action-circle-entry--send"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          }
          label={t('send')}
          onClick={() => {
            setSendStage('select')
            setSendFormKey((k) => k + 1)
            setShowSend(true)
          }}
          testId={TESTID.SEND_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--receive"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="8 17 12 21 16 17" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
            </svg>
          }
          label={t('receive')}
          onClick={() => setShowReceive(true)}
          testId={TESTID.RECEIVE_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--swap"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          }
          label={t('walletActionRingSwap')}
          onClick={handleSwapClick}
          disabled={!canUseRingSwap}
          title={swapButtonTitle}
          testId={TESTID.SWAP_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--buy"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
          label={t('walletActionBuy')}
          onClick={handleMoonPayClick}
          disabled={!showMoonPayEntry}
          title={moonPayButtonTitle}
          testId={TESTID.BUY_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--earn"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M2 12h20" />
              <circle cx="12" cy="12" r="10" opacity="0.2" />
            </svg>
          }
          label={t('walletActionEarn')}
          onClick={() =>
            canUseEarn ? setShowEarn(true) : showToast('Comming soon')
          }
          disabled={!canUseEarn}
          title={earnButtonTitle}
          testId={TESTID.EARN_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--dapp"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
          label={t('walletActionDapp')}
          onClick={() => setDappListOpen(true)}
          testId={TESTID.DAPP_BUTTON}
        />
        <ActionCircleEntry
          variantClass="action-circle-entry--bridge"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
              <path d="M6 15l6-6 6 6" />
            </svg>
          }
          label={t('walletActionBridge')}
          onClick={handleBridgeClick}
          testId={TESTID.BRIDGE_BUTTON}
        />
      </div>

      {showSend &&
        (sendStage === 'select' ? (
          <SendTokenPickerSheet
            onClose={handleCloseSend}
            onSelectToken={(token) => {
              setSendToken(token)
              setSendStage('form')
            }}
          />
        ) : (
          renderSendForm()
        ))}

      {showReceive && (
        <ReceiveDialog
          address={receiveAddress}
          chainName={activeChain?.name ?? 'Unknown Chain'}
          onClose={() => setShowReceive(false)}
        />
      )}

      {showEarn && <EarnPage onClose={() => setShowEarn(false)} />}

      <PopupListLayout
        open={dappListOpen}
        title={t('dappsTab')}
        onClose={() => setDappListOpen(false)}
      >
        {dappsLoading && (
          <div className="dapp-list__loading">
            <div className="dapp-list__spinner" />
            <span>{t('loadingDapps')}</span>
          </div>
        )}
        {dappsError && (
          <div className="dapp-list__error">
            <span>{t('loadingFailed', { error: dappsError })}</span>
            <button className="dapp-list__retry-btn" onClick={reload}>
              {t('retry')}
            </button>
          </div>
        )}
        {!dappsLoading && !dappsError && (
          <div className="dapp-list__grid">
            {dapps.map((d) => (
              <DAppCard
                key={d.id}
                dapp={d}
                onClick={(dapp) => {
                  setActiveDApp(dapp)
                  setDappListOpen(false)
                }}
              />
            ))}
          </div>
        )}
      </PopupListLayout>

      <Drawer open={bridgeListOpen} onOpenChange={setBridgeListOpen}>
        <DrawerContent className="bridge-drawer">
          <DrawerHeader className="bridge-drawer__header">
            <DrawerTitle className="bridge-drawer__title">
              {t('bridgeDapps')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="bridge-drawer__content">
            <div className="bridge-drawer__grid">
              {bridgeUrls.map((url) => {
                const isRecommended =
                  url === LIFI_BRIDGE_URL || url === ACROSS_BRIDGE_URL
                const bridgeName = getBridgeNameFromUrl(url)
                const isExternal =
                  url !== LIFI_BRIDGE_URL && url !== ACROSS_BRIDGE_URL
                return (
                  <button
                    key={url}
                    className="bridge-drawer__card"
                    onClick={() => handleSelectBridge(url)}
                    type="button"
                  >
                    <img
                      className="bridge-drawer__icon"
                      src={getBridgeIconSvg(bridgeName, url)}
                      alt={bridgeName}
                    />
                    <div className="bridge-drawer__info">
                      <span className="bridge-drawer__name">
                        {bridgeName}
                        {isRecommended && (
                          <span className="bridge-drawer__badge">
                            {t('recommended')}
                          </span>
                        )}
                      </span>
                      <span className="bridge-drawer__desc">
                        {url === LIFI_BRIDGE_URL
                          ? t('lifiBridgeDescription')
                          : url === ACROSS_BRIDGE_URL
                            ? t('acrossBridgeDescription')
                            : new URL(url).hostname}
                      </span>
                    </div>
                    {isExternal && (
                      <ExternalLink
                        className="bridge-drawer__external"
                        aria-hidden
                        size={16}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {lifiBridgeOpen && (
        <LifiBridgePage onClose={() => setLifiBridgeOpen(false)} />
      )}

      {acrossBridgeOpen && (
        <AcrossBridgePage onClose={() => setAcrossBridgeOpen(false)} />
      )}

      {activeDApp && (
        <DAppContainerPage
          dapp={activeDApp}
          onBack={() => setActiveDApp(null)}
        />
      )}

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        duration={2000}
      />
    </div>
  )
}

export default QuickActionBar
