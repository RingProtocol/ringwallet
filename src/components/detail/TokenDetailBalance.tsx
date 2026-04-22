import React from 'react'
import { useI18n } from '../../i18n'
import type { ChainToken } from '../../models/ChainTokens'
import type { Chain } from '../../models/ChainType'
import {
  chainTokenDisplaySymbol,
  formatChainTokenBalance,
  formatChainTokenPositionUsd,
} from '../../features/balance/balanceManager'

export interface TokenDetailBalanceProps {
  token: ChainToken
  chain: Chain
}

const TokenDetailBalance: React.FC<TokenDetailBalanceProps> = ({
  token,
  chain,
}) => {
  const { t } = useI18n()
  const symbol = chainTokenDisplaySymbol(token, chain)
  const balanceStr = formatChainTokenBalance(token, chain, 4)
  const positionUsd = formatChainTokenPositionUsd(token)

  return (
    <div className="token-detail__balance-section">
      <div className="token-detail__balance-label">
        {t('tokenDetailBalance')}
      </div>
      <div className="token-detail__balance-amount">
        {balanceStr}{' '}
        <span className="token-detail__balance-symbol">{symbol}</span>
      </div>
      <div className="token-detail__balance-usd">≈ {positionUsd}</div>
    </div>
  )
}

export default TokenDetailBalance
