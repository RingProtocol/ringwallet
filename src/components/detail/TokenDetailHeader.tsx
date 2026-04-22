import React from 'react'
import ChainIcon from '../ChainIcon'
import { useI18n } from '../../i18n'
import { TESTID } from '../testids'
import type { ChainToken } from '../../models/ChainTokens'
import type { Chain } from '../../models/ChainType'
import {
  chainTokenDisplayName,
  chainTokenDisplaySymbol,
} from '../../features/balance/balanceManager'

export interface TokenDetailHeaderProps {
  token: ChainToken
  chain: Chain
  onBack: () => void
}

const TokenDetailHeader: React.FC<TokenDetailHeaderProps> = ({
  token,
  chain,
  onBack,
}) => {
  const { t } = useI18n()
  const symbol = chainTokenDisplaySymbol(token, chain)
  const name = chainTokenDisplayName(token, chain)
  const isNative = token.tokenAddress == null
  const logoUrl = token.tokenMetadata.logo?.trim()

  return (
    <header className="token-detail__nav">
      <button
        type="button"
        className="token-detail__back"
        onClick={onBack}
        aria-label={t('tokenDetailBack')}
        data-testid={TESTID.TOKEN_DETAIL_BACK}
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
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className="token-detail__header-title">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="token-detail__header-logo" />
        ) : isNative && chain.icon ? (
          <ChainIcon icon={chain.icon} symbol={symbol} size={32} />
        ) : (
          <span className="token-detail__header-logo-fallback">
            {symbol.charAt(0)}
          </span>
        )}
        <div className="token-detail__header-name">
          <div className="token-detail__header-name-text">{name}</div>
          <div className="token-detail__header-name-sub">
            {symbol} · {chain.name}
          </div>
        </div>
      </div>
      <div className="token-detail__menu-btn" aria-hidden="true" />
    </header>
  )
}

export default TokenDetailHeader
