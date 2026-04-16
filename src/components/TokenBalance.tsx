import React, { useCallback, useMemo, useState } from 'react'
import { chainToAccountAssetsNetwork } from '../config/chains'
import { useAuth } from '../contexts/AuthContext'
import {
  chainTokenChangePercentLabel,
  chainTokenDisplayName,
  chainTokenDisplaySymbol,
  formatChainTokenBalance,
  formatChainTokenPositionUsd,
  formatUsdUnitPrice,
  sortChainTokensForDisplay,
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
  const cacheGen = useTokenCacheNotifier()

  const rows = useMemo(() => {
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

  return (
    <div className="token-balance-list">
      <div className="token-list-header">
        {supportsTokens && (
          <button
            type="button"
            className="token-import-btn"
            onClick={() => setShowImportDialog(true)}
          >
            {t('importToken')}
          </button>
        )}
      </div>
      <div className="token-columns-header" role="row">
        <div
          className="token-columns-header__name token-columns-header__name--hidden"
          role="columnheader"
          aria-hidden="true"
        />
        <div className="token-columns-header__amount" role="columnheader">
          {t('tokenColumnAmountValue')}
        </div>
        <div className="token-columns-header__price" role="columnheader">
          {t('tokenColumnPriceChangeRate')}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="token-empty">{t('noTokensFound')}</div>
      ) : (
        rows.map((token) => {
          const symbol = chainTokenDisplaySymbol(token, activeChain)
          const name = chainTokenDisplayName(token, activeChain)
          const balanceStr = formatChainTokenBalance(token, activeChain, 4)
          const usdStr = formatChainTokenPositionUsd(token)
          const usdUnitStr = formatUsdUnitPrice(token)
          const changeStr = chainTokenChangePercentLabel(token)
          const logoUrl = token.tokenMetadata.logo?.trim()
          const isNative = token.tokenAddress == null

          return (
            <div
              key={`${token.network}-${token.tokenAddress ?? 'native'}`}
              className={`token-row${onTokenSelect ? ' token-row--clickable' : ''}`}
              onClick={onTokenSelect ? () => onTokenSelect(token) : undefined}
            >
              <div className="token-row__brand">
                <div className="token-icon-wrap">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={symbol}
                      className="token-logo-img"
                    />
                  ) : isNative && activeChain.icon ? (
                    <ChainIcon
                      icon={activeChain.icon}
                      symbol={symbol}
                      size={38}
                    />
                  ) : (
                    <span className="token-icon-placeholder">
                      {symbol.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="token-info">
                  <span className="token-symbol">{symbol}</span>
                  <span className="token-name">{name}</span>
                </div>
              </div>
              <div
                className="token-row__balance"
                data-testid={isNative ? TESTID.TOKEN_NATIVE_BALANCE : undefined}
              >
                <span className="token-amount">{balanceStr}</span>
                <span className="token-value">{usdStr}</span>
              </div>
              <div className="token-row__fiat">
                <span className="token-usd">{usdUnitStr}</span>
                <span className="token-change">{changeStr ?? '—'}</span>
              </div>
            </div>
          )
        })
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
