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
              <path d="M10 2.4a.8.8 0 0 1 .8.8v4.6h.6V5.6a.8.8 0 1 1 1.6 0v2.2h.6V6.6a.8.8 0 1 1 1.6 0v2.56a2.6 2.6 0 0 1-.24 1.1l-1.48 3.28A2.6 2.6 0 0 1 11.51 15H9.73a2.6 2.6 0 0 1-2.12-1.1L5.6 11.08a.8.8 0 0 1 1.28-.96l1.52 1.88V3.2a.8.8 0 0 1 .8-.8Z" />
              <path d="M6.1 5.6a.8.8 0 0 1 1.13 0l.52.52a.8.8 0 1 1-1.13 1.13l-.52-.52a.8.8 0 0 1 0-1.13Zm7.67 0a.8.8 0 0 1 1.13 1.13l-.52.52a.8.8 0 1 1-1.13-1.13l.52-.52ZM10 4.2a.8.8 0 0 1-.8-.8v-.8a.8.8 0 1 1 1.6 0v.8a.8.8 0 0 1-.8.8Z" />
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
