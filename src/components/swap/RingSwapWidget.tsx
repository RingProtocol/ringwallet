import React, { useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Widget } from '@kyberswap/widgets'
import type { TxData } from '@kyberswap/widgets'
import { ethers } from 'ethers'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { useI18n } from '../../i18n'
import './RingSwapWidget.css'

const RING_THEME = {
  text: '#f3f4f6',
  subText: '#9ca3af',
  primary: '#a5b4fc',
  dialog: '#1c1e26',
  secondary: '#1c1e26',
  interactive: 'rgba(255, 255, 255, 0.1)',
  stroke: 'rgba(255, 255, 255, 0.14)',
  accent: '#a5b4fc',
  success: '#4ecdc4',
  warning: '#fbbf24',
  error: '#ef4444',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  borderRadius: '16px',
  buttonRadius: '12px',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
}

const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

interface RingSwapWidgetProps {
  onClose: () => void
}

const RingSwapWidget: React.FC<RingSwapWidgetProps> = ({ onClose }) => {
  const { activeWallet, activeChain, activeChainId } = useAuth()
  const { t } = useI18n()

  const rpcUrl = getPrimaryRpcUrl(activeChain)
  const chainId = Number(activeChainId)

  const connectedAccount = useMemo(
    () => ({
      address: activeWallet?.address,
      chainId,
    }),
    [activeWallet?.address, chainId]
  )

  const handleSubmitTx = useCallback(
    async (txData: TxData): Promise<string> => {
      if (!activeWallet?.privateKey) {
        throw new Error('Wallet not available')
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const wallet = new ethers.Wallet(activeWallet.privateKey, provider)

      const tx = await wallet.sendTransaction({
        to: txData.to,
        data: txData.data,
        value: txData.value,
        gasLimit: txData.gasLimit,
      })

      return tx.hash
    },
    [activeWallet?.privateKey, rpcUrl]
  )

  const content = (
    <div className="ring-swap-popup">
      <div className="ring-swap-popup__backdrop" onClick={onClose} />
      <div className="ring-swap-popup__column">
        <button
          type="button"
          className="ring-swap-popup__close"
          onClick={onClose}
        >
          {t('close')}
        </button>
        <div className="ring-swap-popup__shell">
          <Widget
            client="ringwallet"
            chainId={chainId}
            rpcUrl={rpcUrl}
            connectedAccount={connectedAccount}
            onSubmitTx={handleSubmitTx}
            theme={RING_THEME}
            defaultTokenIn={NATIVE_TOKEN_ADDRESS}
            enableRoute
            showRate
            showDetail
            title="Swap"
            width={380}
          />
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

export default RingSwapWidget
