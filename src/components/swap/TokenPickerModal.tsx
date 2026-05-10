import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ethers } from 'ethers'
import type { SwapTokenOption } from './useRingV2Tokens'
import { keyOfToken } from './SwapField'
import { useI18n } from '../../i18n'

interface Props {
  open: boolean
  onClose: () => void
  /** Full merged list of tokens (native + wallet + curated bases + Kyber list). */
  options: SwapTokenOption[]
  selectedKey?: string
  onSelect: (key: string) => void
  /** True while the Kyber token list is still being fetched. */
  loading?: boolean
  /**
   * Resolve an arbitrary ERC-20 address into a token option. Called when
   * the user pastes an address that isn't in `options`. When omitted, the
   * "Import" action isn't shown.
   */
  onImportAddress?: (address: string) => Promise<SwapTokenOption | null>
}

const NATIVE_KEY = 'NATIVE'

const TokenPickerModal: React.FC<Props> = ({
  open,
  onClose,
  options,
  selectedKey,
  onSelect,
  loading = false,
  onImportAddress,
}) => {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setImportError(null)
    // Focus the search after the modal has rendered; a microtask is enough
    // to let the portal mount on Safari (which otherwise loses focus).
    const id = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = 0
  }, [query, open])

  const trimmed = query.trim()
  const queryLower = trimmed.toLowerCase()
  const isAddress = ethers.isAddress(trimmed)

  const filtered = useMemo(() => {
    if (!queryLower) return options
    return options.filter((opt) => {
      if (opt.symbol.toLowerCase().includes(queryLower)) return true
      if (!opt.isNative && opt.address.toLowerCase().includes(queryLower)) {
        return true
      }
      return false
    })
  }, [options, queryLower])

  const importCandidate = useMemo(() => {
    if (!onImportAddress || !isAddress) return null
    const needle = trimmed.toLowerCase()
    const hit = options.find(
      (o) => !o.isNative && o.address.toLowerCase() === needle
    )
    return hit ? null : trimmed
  }, [onImportAddress, isAddress, trimmed, options])

  if (!open) return null

  const handleSelect = (opt: SwapTokenOption) => {
    onSelect(keyOfToken(opt))
    onClose()
  }

  const handleImport = async () => {
    if (!onImportAddress || !importCandidate) return
    setImporting(true)
    setImportError(null)
    try {
      const imported = await onImportAddress(importCandidate)
      if (imported) {
        onSelect(keyOfToken(imported))
        onClose()
      } else {
        setImportError(t('tokenPickerImportNotFound'))
      }
    } catch (e) {
      setImportError(
        t('tokenPickerImportFailed', { error: (e as Error).message })
      )
    } finally {
      setImporting(false)
    }
  }

  const withBalance = filtered.filter((o) => o.balance > 0n || o.isNative)
  const withoutBalance = filtered.filter((o) => !(o.balance > 0n || o.isNative))

  const body = (
    <div
      className="token-picker"
      role="dialog"
      aria-modal="true"
      aria-label={t('tokenPickerTitle')}
    >
      <div
        className="token-picker__backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div className="token-picker__panel">
        <header className="token-picker__header">
          <h3 className="token-picker__title">{t('tokenPickerTitle')}</h3>
          <button
            type="button"
            className="token-picker__close"
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

        <div className="token-picker__search">
          <svg
            className="token-picker__search-icon"
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
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="token-picker__input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tokenPickerSearchPlaceholder')}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <div className="token-picker__body" ref={listRef}>
          {importCandidate && (
            <div className="token-picker__import">
              <div className="token-picker__import-head">
                <span className="token-picker__import-label">
                  {t('tokenPickerImportFound')}
                </span>
                <span className="token-picker__import-addr">
                  {shortAddr(importCandidate)}
                </span>
              </div>
              <button
                type="button"
                className="token-picker__import-btn"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? t('tokenPickerImporting') : t('tokenPickerImport')}
              </button>
              {importError && (
                <div className="token-picker__import-error">{importError}</div>
              )}
            </div>
          )}

          {withBalance.length > 0 && (
            <TokenGroup
              label={t('tokenPickerYourTokens')}
              items={withBalance}
              selectedKey={selectedKey}
              onSelect={handleSelect}
            />
          )}

          {withoutBalance.length > 0 && (
            <TokenGroup
              label={
                withBalance.length > 0 ? t('tokenPickerAllTokens') : undefined
              }
              items={withoutBalance}
              selectedKey={selectedKey}
              onSelect={handleSelect}
            />
          )}

          {filtered.length === 0 && !importCandidate && (
            <div className="token-picker__empty">
              {loading ? t('tokenPickerLoading') : t('tokenPickerNoResults')}
            </div>
          )}

          {loading && filtered.length > 0 && (
            <div className="token-picker__loading-footer">
              {t('tokenPickerLoadingMore')}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return body
  return createPortal(body, document.body)
}

interface TokenGroupProps {
  label?: string
  items: SwapTokenOption[]
  selectedKey?: string
  onSelect: (opt: SwapTokenOption) => void
}

const TokenGroup: React.FC<TokenGroupProps> = ({
  label,
  items,
  selectedKey,
  onSelect,
}) => {
  return (
    <div className="token-picker__group">
      {label && <div className="token-picker__group-label">{label}</div>}
      <ul className="token-picker__list">
        {items.map((opt) => {
          const key = opt.isNative ? NATIVE_KEY : opt.address
          const selected = selectedKey === key
          return (
            <li key={key}>
              <button
                type="button"
                className={`token-picker__row ${selected ? 'is-selected' : ''}`}
                onClick={() => onSelect(opt)}
              >
                <span className="token-picker__row-icon" aria-hidden>
                  {opt.logo ? (
                    <img
                      src={opt.logo}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display =
                          'none'
                      }}
                    />
                  ) : null}
                  <span className="token-picker__row-glyph">
                    {opt.symbol.charAt(0).toUpperCase()}
                  </span>
                </span>
                <span className="token-picker__row-main">
                  <span className="token-picker__row-symbol">{opt.symbol}</span>
                  <span className="token-picker__row-addr">
                    {opt.isNative ? 'Native' : shortAddr(opt.address)}
                  </span>
                </span>
                {opt.balance > 0n && (
                  <span className="token-picker__row-balance">
                    {formatBalance(opt.balance, opt.decimals)}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const shortAddr = (addr: string): string =>
  addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr

const formatBalance = (balance: bigint, decimals: number): string => {
  if (balance <= 0n) return '0'
  const s = ethers.formatUnits(balance, decimals)
  const [intPart, fracPart] = s.split('.')
  if (!fracPart) return intPart
  return `${intPart}.${fracPart.slice(0, 6).replace(/0+$/, '')}`.replace(
    /\.$/,
    ''
  )
}

export default TokenPickerModal
