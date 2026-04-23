import React, { useCallback, useMemo, useState } from 'react'
import {
  chainToAccountAssetsNetwork,
  FEATURED_TESTNET_IDS,
} from '../config/chains'
import { useAuth } from '../contexts/AuthContext'
import {
  chainTokenChangePercentLabel,
  chainTokenDisplayName,
  chainTokenDisplaySymbol,
  formatChainTokenBalance,
  formatChainTokenPositionUsd,
  formatUsdUnitPrice,
  sortChainTokensForDisplay,
  partitionTokens,
} from '../features/balance/balanceManager'
import type { ChainToken } from '../models/ChainTokens'
import { useTokenCacheNotifier } from '../hooks/useTokenCacheNotifier'
import { getTokensForNetwork } from '../models/ChainTokens'
import { addToken } from '../utils/tokenStorage'
import ImportTokenDialog from './ImportTokenDialog'
import ChainIcon from './ChainIcon'
import './TokenBalance.css'
import { useI18n } from '../i18n'
import { TESTID } from './testids'

interface TokenBalanceProps {
  tokens: ChainToken[]
  isLoading?: boolean
  supportsTokens: boolean
  /** When set, tapping a row opens token detail (fullscreen). */
  onTokenSelect?: (token: ChainToken) => void
}

const TokenBalance: React.FC<TokenBalanceProps> = ({
  tokens,
  supportsTokens,
  onTokenSelect,
}) => {
  const { activeChain, activeAccount } = useAuth()
  const { t } = useI18n()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const cacheGen = useTokenCacheNotifier()

  const allRows = useMemo(() => {
    void cacheGen
    if (!activeChain) return tokens
    const net = chainToAccountAssetsNetwork(activeChain)
    if (!net) return tokens
    const raw = getTokensForNetwork(net)
    if (raw && raw.length > 0) {
      return sortChainTokensForDisplay(raw)
    }
    return sortChainTokensForDisplay(tokens)
  }, [activeChain, tokens, cacheGen])

  const isTestnet = activeChain
    ? FEATURED_TESTNET_IDS.includes(activeChain.id)
    : false

  const { visible: visibleRows, hidden: hiddenRows } = useMemo(
    () =>
      isTestnet
        ? { visible: allRows, hidden: [] as ChainToken[] }
        : partitionTokens(allRows),
    [allRows, isTestnet]
  )

  const handleImportToken = useCallback(
    (token: {
      address: string
      symbol: string
      name: string
      decimals: number
    }) => {
      if (!activeAccount || !activeChain || !supportsTokens) return
      addToken(activeAccount.address, activeChain.id, token)
      window.dispatchEvent(new Event('ring:tokens-updated'))
    },
    [activeAccount, activeChain, supportsTokens]
  )

  if (!activeAccount || !activeChain) return null

  const renderTokenRow = (token: ChainToken) => {
    const symbol = chainTokenDisplaySymbol(token, activeChain)
    const name = chainTokenDisplayName(token, activeChain)
    const balanceStr = formatChainTokenBalance(token, activeChain, 4)
    const usdStr = formatChainTokenPositionUsd(token)
    const usdUnitStr = formatUsdUnitPrice(token)
    const changeStr = chainTokenChangePercentLabel(token)
    const logoUrl = token.tokenMetadata.logo?.trim()
    const isNative = token.tokenAddress == null
    const pos = changeStr && changeStr.startsWith('+')

    return (
      <div
        key={`${token.network}-${token.tokenAddress ?? 'native'}`}
        className={`token-row${onTokenSelect ? ' token-row--clickable' : ''}`}
        onClick={onTokenSelect ? () => onTokenSelect(token) : undefined}
      >
        <div className="token-row__brand">
          <div className="token-icon-wrap">
            {logoUrl ? (
              <img src={logoUrl} alt={symbol} className="token-logo-img" />
            ) : isNative && activeChain.icon ? (
              <ChainIcon icon={activeChain.icon} symbol={symbol} size={40} />
            ) : (
              <span className="token-icon-placeholder">{symbol.charAt(0)}</span>
            )}
          </div>
          <div className="token-info">
            <span className="token-name">{name}</span>
            <span className="token-meta">
              <span className="token-usd-unit">{usdUnitStr}</span>
              {changeStr && (
                <span
                  className={`token-change ${pos ? 'token-change--positive' : 'token-change--negative'}`}
                >
                  {changeStr}
                </span>
              )}
            </span>
          </div>
        </div>
        <div
          className="token-row__balance"
          data-testid={isNative ? TESTID.TOKEN_NATIVE_BALANCE : undefined}
        >
          <span className="token-amount">
            {balanceStr} {symbol}
          </span>
          <span className="token-value">{usdStr}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="token-balance-list">
      <div className="token-list-header">
        {supportsTokens && (
          <button
            type="button"
            className="token-import-btn"
            onClick={() => setShowImportDialog(true)}
          >
            + {t('importToken')}
          </button>
        )}
      </div>

      {allRows.length === 0 ? (
        <div className="token-empty">{t('noTokensFound')}</div>
      ) : visibleRows.length === 0 ? (
        <div className="token-empty">{t('noVisibleTokens')}</div>
      ) : (
        visibleRows.map(renderTokenRow)
      )}

      {/* Hidden suspicious tokens section */}
      {hiddenRows.length > 0 && (
        <div className="token-hidden-section">
          <button
            type="button"
            className="token-hidden-toggle"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
          >
            <span className="token-hidden-toggle__icon">
              {showHidden ? '▼' : '▶'}
            </span>
            <span className="token-hidden-toggle__text">
              {t('suspiciousTokens', { count: hiddenRows.length })}
            </span>
            <span className="token-hidden-toggle__hint">
              {showHidden ? t('clickToCollapse') : t('clickToExpand')}
            </span>
          </button>

          {showHidden && (
            <div className="token-hidden-rows">
              {hiddenRows.map(renderTokenRow)}
            </div>
          )}
        </div>
      )}

      {supportsTokens && (
        <ImportTokenDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportToken}
          chain={activeChain}
        />
      )}
    </div>
  )
}

export default TokenBalance
