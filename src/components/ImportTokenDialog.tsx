import React, { useState } from 'react'
import { ethers } from 'ethers'
import type { Chain } from '../models/ChainType'
import RpcService from '../services/rpc/rpcService'
import './ImportTokenDialog.css'
import { useI18n } from '../i18n'

export interface ImportedTokenInfo {
  symbol: string
  name: string
  address: string
  decimals: number
}

interface ImportTokenDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (token: ImportedTokenInfo) => void
  chain?: Chain | null
}

const ImportTokenDialog: React.FC<ImportTokenDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  chain,
}) => {
  const { t } = useI18n()
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (!address.trim()) {
      setError(t('tokenAddressRequired'))
      return
    }

    if (!ethers.isAddress(address.trim())) {
      setError(t('invalidAddressFormat'))
      return
    }

    if (!chain?.rpcUrl?.length) {
      setError(t('rpcNotConfigured'))
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const evmRpcService = RpcService.fromChain(chain).getEvmService()
      const tokenInfo = await evmRpcService.getTokenMetadata(address.trim())

      onImport({
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        address: address.trim(),
        decimals: tokenInfo.decimals,
      })
      setAddress('')
      onClose()
    } catch (e) {
      console.error('Failed to fetch token info:', e)
      setError(t('tokenInfoFetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setAddress('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="import-token-overlay" onClick={handleClose}>
      <div className="import-token-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{t('importTokenTitle')}</h3>
        <div className="form-group">
          <label>{t('tokenAddress')}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="input-field"
            disabled={isLoading}
          />
        </div>
        {error && <div className="import-token-error">{error}</div>}
        <div className="import-token-actions">
          <button
            onClick={handleConfirm}
            disabled={isLoading || !address.trim()}
            className="primary-btn"
          >
            {isLoading ? t('importing') : t('importToken')}
          </button>
          <button onClick={handleClose} className="secondary-btn">
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportTokenDialog
