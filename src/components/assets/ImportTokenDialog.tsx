import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ethers } from 'ethers'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import { getTokensForNetwork } from '../../models/ChainTokens'
import type { Chain } from '../../models/ChainType'
import RpcService from '../../services/rpc/rpcService'
import './ImportTokenDialog.css'
import { useI18n } from '../../i18n'

export interface ImportedTokenInfo {
  symbol: string
  name: string
  address: string
  decimals: number
  logo?: string | null
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
  const [isImporting, setIsImporting] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [previewToken, setPreviewToken] = useState<ImportedTokenInfo | null>(
    null
  )
  const [logoLoadFailed, setLogoLoadFailed] = useState(false)
  const resolveSeqRef = useRef(0)

  useEffect(() => {
    setLogoLoadFailed(false)
  }, [previewToken?.address, previewToken?.logo])

  const resolveLogoFromCache = (
    activeChain: Chain,
    tokenAddress: string
  ): string | null => {
    const network = chainToAccountAssetsNetwork(activeChain)
    if (!network) return null
    const cachedTokens = getTokensForNetwork(network)
    if (!cachedTokens || cachedTokens.length === 0) return null

    const found = cachedTokens.find(
      (token) =>
        token.tokenAddress != null &&
        token.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
    )

    const logo = found?.tokenMetadata.logo?.trim()
    return logo ? logo : null
  }

  useEffect(() => {
    if (!isOpen) return

    const trimmed = address.trim()
    if (!trimmed) {
      setError('')
      setPreviewToken(null)
      setIsResolving(false)
      return
    }

    const isValidAddress = ethers.isAddress(trimmed)
    if (!isValidAddress) {
      setPreviewToken(null)
      setIsResolving(false)
      setError(address.trim().length >= 42 ? t('invalidAddressFormat') : '')
      return
    }

    if (!chain?.rpcUrl?.length) {
      setPreviewToken(null)
      setIsResolving(false)
      setError(t('rpcNotConfigured'))
      return
    }

    setError('')
    setIsResolving(true)
    const currentSeq = ++resolveSeqRef.current
    const timer = window.setTimeout(() => {
      const run = async () => {
        try {
          const evmRpcService = RpcService.fromChain(chain).getEvmService()
          const normalizedAddress = ethers.getAddress(trimmed)
          const tokenInfo =
            await evmRpcService.getTokenMetadata(normalizedAddress)
          const cachedLogo = resolveLogoFromCache(chain, normalizedAddress)
          const alchemyLogo = cachedLogo
            ? null
            : await evmRpcService.getTokenLogo(normalizedAddress)

          if (resolveSeqRef.current !== currentSeq) return
          setPreviewToken({
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            address: normalizedAddress,
            decimals: tokenInfo.decimals,
            logo: cachedLogo ?? alchemyLogo,
          })
          setError('')
        } catch (e) {
          console.error('Failed to fetch token info:', e)
          if (resolveSeqRef.current !== currentSeq) return
          setPreviewToken(null)
          setError(t('tokenInfoFetchFailed'))
        } finally {
          if (resolveSeqRef.current === currentSeq) {
            setIsResolving(false)
          }
        }
      }
      void run()
    }, 320)

    return () => {
      window.clearTimeout(timer)
    }
  }, [address, chain, isOpen, t])

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

    if (!previewToken) {
      setError(t('tokenInfoFetchFailed'))
      return
    }

    setError('')
    setIsImporting(true)

    try {
      onImport(previewToken)
      setAddress('')
      setPreviewToken(null)
      onClose()
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setAddress('')
    setError('')
    setPreviewToken(null)
    setIsResolving(false)
    onClose()
  }

  if (!isOpen) return null

  const content = (
    <div className="import-token-overlay" onClick={handleClose}>
      <div
        className="import-token-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-token-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="import-token-dialog-title">{t('importTokenTitle')}</h3>
        <div className="form-group">
          <label htmlFor="import-token-address-input">
            {t('tokenAddress')}
          </label>
          <input
            id="import-token-address-input"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="input-field"
            disabled={isImporting}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        {previewToken && !isResolving && (
          <div className="import-token-preview" aria-live="polite">
            <div className="import-token-preview__header">
              {previewToken.logo && !logoLoadFailed && (
                <img
                  src={previewToken.logo}
                  alt={previewToken.symbol}
                  className="import-token-preview__logo"
                  onError={() => setLogoLoadFailed(true)}
                />
              )}
              <div className="import-token-preview__title">
                {t('tokenPickerImportFound')}
              </div>
            </div>
            <div className="import-token-preview__rows">
              <div className="import-token-preview__row">
                <span>{t('tokenName')}</span>
                <strong>{previewToken.name}</strong>
              </div>
              <div className="import-token-preview__row">
                <span>{t('tokenSymbol')}</span>
                <strong>{previewToken.symbol}</strong>
              </div>
              <div className="import-token-preview__row">
                <span>{t('tokenDecimals')}</span>
                <strong>{previewToken.decimals}</strong>
              </div>
            </div>
          </div>
        )}
        {error && <div className="import-token-error">{error}</div>}
        <div className="import-token-actions">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isImporting || isResolving || !previewToken}
            className="primary-btn"
          >
            {isImporting ? t('importing') : t('importToken')}
          </button>
          <button type="button" onClick={handleClose} className="secondary-btn">
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }

  return createPortal(content, document.body)
}

export default ImportTokenDialog
