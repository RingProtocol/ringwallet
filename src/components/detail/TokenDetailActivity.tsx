import React from 'react'
import { useI18n } from '../../i18n'
import TransactionHistory, {
  type TransactionHistoryAssetFilter,
} from '../TransactionHistory'
import type { ChainToken } from '../../models/ChainTokens'

export interface TokenDetailActivityProps {
  token: ChainToken
}

const TokenDetailActivity: React.FC<TokenDetailActivityProps> = ({ token }) => {
  const { t } = useI18n()
  const isNative = token.tokenAddress == null

  const assetFilter: TransactionHistoryAssetFilter = isNative
    ? { kind: 'native' }
    : { kind: 'erc20', address: token.tokenAddress! }

  return (
    <section className="token-detail__activity">
      <h2 className="token-detail__section-title">
        {t('tokenDetailActivity')}
      </h2>
      <div className="token-detail__activity-inner card">
        <TransactionHistory assetFilter={assetFilter} />
      </div>
    </section>
  )
}

export default TokenDetailActivity
