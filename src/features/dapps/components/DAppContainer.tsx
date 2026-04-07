import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getPrimaryRpcUrl } from '@/models/ChainType'
import { WalletBridge } from '../services/walletBridge'
import { useApproval } from '../hooks/useApproval'
import { buildDAppUrl } from '../services/dappService'
import ApprovalDialog from './ApprovalDialog'
import type { DAppInfo } from '../types/dapp'
import { useI18n } from '../../../i18n'
import WalletMainPage from '@/components/WalletMainPage'

interface Props {
  dapp: DAppInfo
  onBack: () => void
  onOpenSettings?: () => void
}

const DAPP_OPEN_BODY_CLASS = 'ring-dapp-open'

const DAppContainer: React.FC<Props> = ({ dapp, onBack }) => {
  const [walletOverlayOpen, setWalletOverlayOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { activeWallet, activeChain, activeChainId, CHAINS, switchChain } =
    useAuth()
  const { pendingApproval, requestApproval, approve, reject } = useApproval()
  const { t } = useI18n()

  const bridge = useMemo(
    () =>
      new WalletBridge({
        getActiveAddress: () => activeWallet?.address || null,
        getActiveChainId: () => Number(activeChainId),
        getActiveChainRpcUrl: () => getPrimaryRpcUrl(activeChain),
        getActivePrivateKey: () => activeWallet?.privateKey || null,
        getChains: () =>
          CHAINS.filter((c) => typeof c.id === 'number').map((c) => ({
            id: c.id as number,
            name: c.name,
            rpcUrl: c.rpcUrl,
          })),
        switchChain: (chainId: number) => switchChain(chainId),
      }),
    []
  )

  useEffect(() => {
    bridge.setApprovalHandler(requestApproval)
  }, [bridge, requestApproval])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    bridge.attach(iframe, dapp.name, dapp.icon, dapp.url)
    return () => bridge.detach()
  }, [bridge, dapp])

  useEffect(() => {
    if (activeWallet) {
      bridge.notifyAccountsChanged([activeWallet.address])
    }
  }, [activeWallet?.address])

  useEffect(() => {
    bridge.notifyChainChanged('0x' + activeChainId.toString(16))
  }, [activeChainId])

  useEffect(() => {
    document.body.classList.add(DAPP_OPEN_BODY_CLASS)
    return () => {
      document.body.classList.remove(DAPP_OPEN_BODY_CLASS)
    }
  }, [])

  const iframeSrc = buildDAppUrl(dapp.url)

  const handleRefresh = useCallback(() => {
    const iframe = iframeRef.current
    if (iframe) {
      iframe.src = iframeSrc
    }
  }, [iframeSrc])

  const handleDisconnect = useCallback(() => {
    setWalletOverlayOpen(false)
    bridge.notifyDisconnect()
    onBack()
  }, [bridge, onBack])

  const content = (
    <div className="dapp-container">
      <div className="dapp-container__navbar">
        <button
          type="button"
          className="dapp-container__wallet-home-btn"
          onClick={() => setWalletOverlayOpen(true)}
          title={t('wallet')}
          aria-label={t('wallet')}
        >
          <img
            src="/icons/logo.png"
            alt=""
            className="dapp-container__wallet-home-btn-img"
          />
          <span
            className="dapp-container__wallet-home-badge"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 20 20"
              className="dapp-container__wallet-home-badge-icon"
            >
              <path
                d="M9.1 2.55a1 1 0 0 1 1 1v4.08h.58V5.74a.94.94 0 1 1 1.88 0v1.89h.56V6.56a.94.94 0 1 1 1.88 0v2.72c0 .58-.12 1.15-.35 1.68l-1.3 2.97A2.44 2.44 0 0 1 11.11 15.4H9.86c-.83 0-1.62-.37-2.14-1.01l-2.2-2.73a.86.86 0 0 1 1.34-1.08l1.44 1.72V3.55a1 1 0 0 1 1-1Z"
                fill="#fff"
                stroke="rgba(31, 41, 55, 0.8)"
                strokeWidth="0.95"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.7 3.1l.66-.66M14.22 4.3h.93M12.98 5.65l.66.66"
                fill="none"
                stroke="rgba(31, 41, 55, 0.72)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        <div className="dapp-container__info">
          <img
            className="dapp-container__navbar-icon"
            src={dapp.icon || undefined}
            alt=""
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <span className="dapp-container__navbar-title">{dapp.name}</span>
        </div>
        <div className="dapp-container__navbar-actions">
          <button
            className="dapp-container__action-btn dapp-container__action-btn--refresh"
            onClick={handleRefresh}
            title={t('refresh')}
          >
            ↻
          </button>
          <button
            className="dapp-container__action-btn"
            onClick={handleDisconnect}
            title={t('disconnect')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* {activeWallet && (
        <div className="dapp-container__status-bar">
          <span className="dapp-container__status-dot" />
          <button
            type="button"
            className="dapp-container__status-address"
            onClick={onOpenSettings}
            title={t('account')}
          >
            {activeWallet.address.slice(0, 6)}...
            {activeWallet.address.slice(-4)}
          </button>
          <button
            type="button"
            className="dapp-container__status-chain"
            onClick={handleOpenChainSwitcher}
            title="Switch chain"
          >
            {activeChain.name}
          </button>
        </div>
      )} */}

      <iframe
        ref={iframeRef}
        className="dapp-container__iframe"
        src={iframeSrc}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="no-referrer"
      />

      {pendingApproval && (
        <ApprovalDialog
          request={pendingApproval}
          onApprove={approve}
          onReject={reject}
        />
      )}
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }

  return (
    <>
      {createPortal(content, document.body)}
      {walletOverlayOpen &&
        createPortal(
          <div className="wallet-main-overlay">
            <div className="wallet-main-overlay__peek-panel">
              <WalletMainPage
                peekOverDapp
                onClose={() => setWalletOverlayOpen(false)}
              />
            </div>
            <button
              type="button"
              className="wallet-main-overlay__scrim"
              onClick={() => setWalletOverlayOpen(false)}
              aria-label={t('close')}
            />
          </div>,
          document.body
        )}
    </>
  )
}

export default DAppContainer
