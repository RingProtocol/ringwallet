import React, { useCallback, useMemo, useState } from 'react'
import { chainToAccountAssetsNetwork } from '../config/chains'
import { useAuth } from '../contexts/AuthContext'
import { displayTokensFromChainTokens } from '../features/balance/balanceManager'
import type { DisplayToken } from '../features/balance/balanceTypes'
import { useTokenCacheNotifier } from '../hooks/useTokenCacheNotifier'
import { getTokensForNetwork } from '../models/ChainTokens'
import { addToken } from '../utils/tokenStorage'
import ImportTokenDialog from './ImportTokenDialog'
import ChainIcon from './ChainIcon'
import './TokenBalance.css'
import { useI18n } from '../i18n'
import { TESTID } from './testids'

interface TokenBalanceProps {
  tokens: DisplayToken[]
  isLoading?: boolean
  supportsTokens: boolean
  onTokenSend?: (token: DisplayToken) => void
}

const TokenBalance: React.FC<TokenBalanceProps> = ({
  tokens,
  supportsTokens,
  onTokenSend,
}) => {
  const { activeChain, activeAccount } = useAuth()
  const { t } = useI18n()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const cacheGen = useTokenCacheNotifier()

  const displayTokens = useMemo(() => {
    void cacheGen
    if (!activeChain) return tokens
    const net = chainToAccountAssetsNetwork(activeChain)
    if (!net) return tokens
    const raw = getTokensForNetwork(net)
    if (raw && raw.length > 0) {
      return displayTokensFromChainTokens(raw, activeChain, 4)
    }
    return tokens
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

  if (!activeAccount) return null

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
      {displayTokens.length === 0 ? (
        <div className="token-empty">{t('noTokensFound')}</div>
      ) : (
        displayTokens.map((token) => (
          <div
            key={token.isNative ? 'native' : token.address}
            className={`token-row${onTokenSend ? ' token-row--clickable' : ''}`}
            onClick={onTokenSend ? () => onTokenSend(token) : undefined}
          >
            <div className="token-row__main">
              <div className="token-icon-wrap">
                {token.isNative && activeChain?.icon ? (
                  <ChainIcon
                    icon={activeChain.icon}
                    symbol={token.symbol}
                    size={38}
                  />
                ) : (
                  <span className="token-icon-placeholder">
                    {token.symbol.charAt(0)}
                  </span>
                )}
              </div>
              <div className="token-info">
                <span className="token-symbol">{token.symbol}</span>
                <span className="token-name">{token.name}</span>
              </div>
            </div>
            <div
              className="token-amount"
              data-testid={
                token.isNative ? TESTID.TOKEN_NATIVE_BALANCE : undefined
              }
            >
              {token.balance}
            </div>
          </div>
        ))
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
