import React, { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ChainFamily, type Chain } from '../models/ChainType'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'
import { TESTID } from './testids'
import './AddChainPage.css'

const USER_CHAINS_KEY = 'user_added_chain_ids'

export interface AddChainPageProps {
  onBack: () => void
}

const AddChainPage: React.FC<AddChainPageProps> = ({ onBack }) => {
  const { CHAINS, addCustomChain } = useAuth()

  const [chainId, setChainId] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [rpcUrl, setRpcUrl] = useState('')
  const [explorer, setExplorer] = useState('')
  const [family, setFamily] = useState<ChainFamily>(ChainFamily.EVM)
  const [isTestnet, setIsTestnet] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = useCallback((): string => {
    const idNum = Number(chainId)
    if (!chainId.trim() || Number.isNaN(idNum)) {
      return 'Chain ID is required and must be a number'
    }
    if (!name.trim()) {
      return 'Chain name is required'
    }
    if (!symbol.trim()) {
      return 'Symbol is required'
    }
    if (!rpcUrl.trim()) {
      return 'RPC URL is required'
    }
    if (CHAINS.some((c) => String(c.id) === String(idNum))) {
      return 'Chain ID already exists'
    }
    return ''
  }, [chainId, name, symbol, rpcUrl, CHAINS])

  const handleSubmit = useCallback(() => {
    setError('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    const idNum = Number(chainId)
    const newChain: Chain = {
      id: idNum,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      rpcUrl: rpcUrl
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
      explorer: explorer.trim(),
      family,
      icon: '/icons/chains/eth.svg',
      isTestnet,
    }

    addCustomChain(newChain)

    // Also add to user_added_chain_ids so it appears in the switcher
    try {
      const raw = safeGetItem(USER_CHAINS_KEY)
      const existing: (number | string)[] = raw ? JSON.parse(raw) : []
      if (!existing.includes(idNum)) {
        const updated = [...existing, idNum]
        safeSetItem(USER_CHAINS_KEY, JSON.stringify(updated))
      }
    } catch {
      safeSetItem(USER_CHAINS_KEY, JSON.stringify([idNum]))
    }

    setIsSubmitting(false)
    onBack()
  }, [
    chainId,
    name,
    symbol,
    rpcUrl,
    explorer,
    family,
    isTestnet,
    validate,
    addCustomChain,
    onBack,
  ])

  const handleBack = useCallback(() => {
    setError('')
    onBack()
  }, [onBack])

  return (
    <div className="add-chain-page">
      {/* Safe-area insets handled via CSS env() */}
      <nav className="add-chain-page__nav">
        <button
          type="button"
          className="add-chain-page__back"
          onClick={handleBack}
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="add-chain-page__title">Add Custom Chain</h1>
        <div className="add-chain-page__nav-spacer" />
      </nav>

      <div className="add-chain-page__scroll">
        <div className="add-chain-page__hero">
          <div className="add-chain-page__hero-glow" aria-hidden />
          <h2 className="add-chain-page__hero-title">Connect a New Network</h2>
          <p className="add-chain-page__hero-subtitle">
            Enter your chain details below to add a custom network to your
            wallet.
          </p>
        </div>

        <div className="add-chain-page__form-card">
          <div className="add-chain-form">
            <div className="add-chain-form__group">
              <label className="add-chain-form__label" htmlFor="add-chain-id">
                Chain ID <span className="add-chain-form__required">*</span>
              </label>
              <input
                id="add-chain-id"
                type="number"
                className="add-chain-form__input"
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
                placeholder="e.g. 1337"
                data-testid={TESTID.ADD_CHAIN_ID_INPUT}
              />
            </div>

            <div className="add-chain-form__group">
              <label className="add-chain-form__label" htmlFor="add-chain-name">
                Network Name <span className="add-chain-form__required">*</span>
              </label>
              <input
                id="add-chain-name"
                type="text"
                className="add-chain-form__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Custom Chain"
                data-testid={TESTID.ADD_CHAIN_NAME_INPUT}
              />
            </div>

            <div className="add-chain-form__group">
              <label
                className="add-chain-form__label"
                htmlFor="add-chain-symbol"
              >
                Currency Symbol{' '}
                <span className="add-chain-form__required">*</span>
              </label>
              <input
                id="add-chain-symbol"
                type="text"
                className="add-chain-form__input"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. ETH"
                data-testid={TESTID.ADD_CHAIN_SYMBOL_INPUT}
              />
            </div>

            <div className="add-chain-form__group">
              <label className="add-chain-form__label" htmlFor="add-chain-rpc">
                RPC URL <span className="add-chain-form__required">*</span>
              </label>
              <input
                id="add-chain-rpc"
                type="text"
                className="add-chain-form__input"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                placeholder="https://rpc.example.com"
                data-testid={TESTID.ADD_CHAIN_RPC_INPUT}
              />
              <span className="add-chain-form__hint">
                Separate multiple URLs with commas
              </span>
            </div>

            <div className="add-chain-form__group">
              <label
                className="add-chain-form__label"
                htmlFor="add-chain-explorer"
              >
                Block Explorer URL
              </label>
              <input
                id="add-chain-explorer"
                type="text"
                className="add-chain-form__input"
                value={explorer}
                onChange={(e) => setExplorer(e.target.value)}
                placeholder="https://explorer.example.com"
                data-testid={TESTID.ADD_CHAIN_EXPLORER_INPUT}
              />
            </div>

            <div className="add-chain-form__group">
              <label
                className="add-chain-form__label"
                htmlFor="add-chain-family"
              >
                Chain Family
              </label>
              <div className="add-chain-form__select-wrap">
                <select
                  id="add-chain-family"
                  className="add-chain-form__select"
                  value={family}
                  onChange={(e) => setFamily(e.target.value as ChainFamily)}
                  data-testid={TESTID.ADD_CHAIN_FAMILY_SELECT}
                >
                  {Object.values(ChainFamily).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <svg
                  className="add-chain-form__select-arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <div className="add-chain-form__group add-chain-form__group--toggle">
              <label
                className="add-chain-form__toggle"
                htmlFor="add-chain-testnet"
              >
                <span className="add-chain-form__toggle-label">
                  This is a testnet
                </span>
                <input
                  id="add-chain-testnet"
                  type="checkbox"
                  className="add-chain-form__toggle-input"
                  checked={isTestnet}
                  onChange={(e) => setIsTestnet(e.target.checked)}
                  data-testid={TESTID.ADD_CHAIN_TESTNET_CHECKBOX}
                />
                <span className="add-chain-form__toggle-track">
                  <span className="add-chain-form__toggle-thumb" />
                </span>
              </label>
            </div>

            {error && (
              <div
                className="add-chain-form__error"
                data-testid={TESTID.ADD_CHAIN_ERROR}
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
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="add-chain-page__actions">
          <button
            type="button"
            className="add-chain-page__submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid={TESTID.ADD_CHAIN_SUBMIT}
          >
            {isSubmitting ? 'Adding...' : 'Add Chain'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddChainPage
