import React, { useEffect, useState } from 'react'
import type { SwapSigner } from '@ring-protocol/ring-swap-sdk'
import { useI18n } from '../../i18n'
import SwapPanel from './SwapPanel'
import { ringV2Engine } from './engines/ringv2'
import { kyberEngine } from './engines/kyber'
import './SwapDialog.css'

export interface SwapDialogProps {
  signer: SwapSigner
  chainId: number
  rpcUrl: string
  onClose: () => void
}

type EngineKey = 'ring' | 'kyber'

const SwapDialog: React.FC<SwapDialogProps> = ({
  signer,
  chainId,
  rpcUrl,
  onClose,
}) => {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const ringSupported = ringV2Engine.supports(chainId)
  const kyberSupported = kyberEngine.supports(chainId)

  const [tab, setTab] = useState<EngineKey>(ringSupported ? 'ring' : 'kyber')

  useEffect(() => {
    if (tab === 'ring' && !ringSupported && kyberSupported) setTab('kyber')
    if (tab === 'kyber' && !kyberSupported && ringSupported) setTab('ring')
  }, [tab, ringSupported, kyberSupported])

  const title = t('walletActionRingSwap')

  return (
    <div
      className="swap-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="swap-dialog__backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div className="swap-dialog__panel">
        <header className="swap-dialog__header">
          <button
            type="button"
            className="swap-dialog__nav swap-dialog__nav--back"
            onClick={onClose}
            aria-label={t('back')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="swap-dialog__title">{title}</h2>
          <button
            type="button"
            className="swap-dialog__nav swap-dialog__nav--close"
            onClick={onClose}
            aria-label={t('close')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {ringSupported && kyberSupported && (
          <div className="swap-dialog__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'ring'}
              className={`swap-dialog__tab ${tab === 'ring' ? 'is-active' : ''}`}
              onClick={() => setTab('ring')}
            >
              {t('swapEngineRing')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'kyber'}
              className={`swap-dialog__tab ${tab === 'kyber' ? 'is-active' : ''}`}
              onClick={() => setTab('kyber')}
            >
              {t('swapEngineKyber')}
            </button>
          </div>
        )}

        <div className="swap-dialog__body">
          {tab === 'ring' && ringSupported && (
            <div className="swap-dialog__ring">
              {/*
                key={engine.id} is load-bearing: each engine's useQuote has
                a different internal hook sequence (Kyber runs SWR state,
                Ring V2 runs 3-phase lifecycle). Without remounting on tab
                change, React sees a hook-order mismatch inside SwapPanel
                and refuses to reconcile — violating rules of hooks.
              */}
              <SwapPanel
                key={ringV2Engine.id}
                engine={ringV2Engine}
                signer={signer}
                chainId={chainId}
                rpcUrl={rpcUrl}
              />
            </div>
          )}
          {tab === 'kyber' && kyberSupported && (
            <div className="swap-dialog__ring">
              <SwapPanel
                key={kyberEngine.id}
                engine={kyberEngine}
                signer={signer}
                chainId={chainId}
                rpcUrl={rpcUrl}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SwapDialog
