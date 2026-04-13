import React, { useCallback, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { addToken } from '../utils/tokenStorage'
import type { DisplayToken } from '../features/balance/balanceTypes'
import ImportTokenDialog from './ImportTokenDialog'
import ChainIcon from './ChainIcon'
import './TokenBalance.css'
import { useI18n } from '../i18n'

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
      {tokens.length === 0 ? (
        <div className="token-empty">{t('noTokensFound')}</div>
      ) : (
        tokens.map((token) => (
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
            <div className="token-amount">{token.balance}</div>
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
