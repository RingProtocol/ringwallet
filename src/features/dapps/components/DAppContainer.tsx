import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getPrimaryRpcUrl } from '@/models/ChainType'
import { WalletBridge } from '../services/walletBridge'
import { useApproval } from '../hooks/useApproval'
import { buildDAppUrl } from '../services/dappService'
import ApprovalDialog from './ApprovalDialog'
import type { DAppInfo } from '../types/dapp'
import { useI18n } from '../../../i18n'

interface Props {
  dapp: DAppInfo
  onBack: () => void
  onOpenSettings?: () => void
}

const DAPP_OPEN_BODY_CLASS = 'ring-dapp-open'
const OPEN_CHAIN_SWITCHER_EVENT = 'ring:open-chain-switcher'

type OpenChainSwitcherDetail = {
  anchorRect?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

const DAppContainer: React.FC<Props> = ({ dapp, onBack, onOpenSettings }) => {
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
    bridge.notifyDisconnect()
    onBack()
  }, [bridge, onBack])

  const handleOpenChainSwitcher = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const detail: OpenChainSwitcherDetail = {
        anchorRect: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
        },
      }
      window.dispatchEvent(
        new CustomEvent<OpenChainSwitcherDetail>(OPEN_CHAIN_SWITCHER_EVENT, {
          detail,
        })
      )
    },
    []
  )

  const content = (
    <div className="dapp-container">
      <div className="dapp-container__navbar">
        <button className="dapp-container__back-btn" onClick={onBack}>
          ←
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
            className="dapp-container__action-btn"
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

      {activeWallet && (
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
      )}

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

  return createPortal(content, document.body)
}

export default DAppContainer
