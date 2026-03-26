import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { WalletBridge } from '../services/walletBridge'
import { useApproval } from '../hooks/useApproval'
import { buildDAppUrl } from '../services/dappService'
import ApprovalDialog from './ApprovalDialog'
import type { DAppInfo } from '../types/dapp'

interface Props {
  dapp: DAppInfo
  onBack: () => void
}

const DAppContainer: React.FC<Props> = ({ dapp, onBack }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { activeWallet, activeChain, activeChainId, CHAINS, switchChain } = useAuth()
  const { pendingApproval, requestApproval, approve, reject } = useApproval()

  const bridge = useMemo(() => new WalletBridge({
    getActiveAddress: () => activeWallet?.address || null,
    getActiveChainId: () => Number(activeChainId),
    getActiveChainRpcUrl: () => activeChain.rpcUrl,
    getActivePrivateKey: () => activeWallet?.privateKey || null,
    getChains: () => CHAINS.filter(c => typeof c.id === 'number').map(c => ({ id: c.id as number, name: c.name, rpcUrl: c.rpcUrl })),
    switchChain: (chainId: number) => switchChain(chainId),
  }), [])

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

  return (
    <div className="dapp-container">
      <div className="dapp-container__navbar">
        <button className="dapp-container__back-btn" onClick={onBack}>←</button>
        <div className="dapp-container__info">
          <img
            className="dapp-container__navbar-icon"
            src={dapp.icon || undefined}
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="dapp-container__navbar-title">{dapp.name}</span>
        </div>
        <div className="dapp-container__navbar-actions">
          <button className="dapp-container__action-btn" onClick={handleRefresh} title="刷新">↻</button>
          <button className="dapp-container__action-btn" onClick={handleDisconnect} title="断开">✕</button>
        </div>
      </div>

      {activeWallet && (
        <div className="dapp-container__status-bar">
          <span className="dapp-container__status-dot" />
          <span>{activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}</span>
          <span className="dapp-container__status-chain">{activeChain.name}</span>
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
}

export default DAppContainer
