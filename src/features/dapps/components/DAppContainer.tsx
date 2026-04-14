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

const DAppContainer: React.FC<Props> = ({ dapp, onBack }) => {
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

  const handleClose = useCallback(() => {
    bridge.notifyDisconnect()
    onBack()
  }, [bridge, onBack])

  const content = (
    <div className="dapp-popup">
      <div className="dapp-popup__backdrop" aria-hidden="true" />
      <div className="dapp-popup__column">
        <button
          type="button"
          className="dapp-popup__close"
          onClick={handleClose}
        >
          {t('close')}
        </button>
        <div
          className="dapp-popup__shell"
          role="dialog"
          aria-modal="true"
          aria-label={dapp.name}
        >
          <div className="dapp-container">
            <iframe
              ref={iframeRef}
              className="dapp-container__iframe"
              src={iframeSrc}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="clipboard-read; clipboard-write"
              referrerPolicy="no-referrer"
              title={dapp.name}
            />

            {pendingApproval && (
              <ApprovalDialog
                request={pendingApproval}
                onApprove={approve}
                onReject={reject}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }

  return createPortal(content, document.body)
}

export default DAppContainer
