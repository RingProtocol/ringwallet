import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import type { ChainToken } from '../../models/ChainTokens'
import type { Chain } from '../../models/ChainType'

export interface TokenDetailInfoProps {
  token: ChainToken
  chain: Chain
}

const CONTRACT_COPY_FEEDBACK_MS = 1_500

const TokenDetailInfo: React.FC<TokenDetailInfoProps> = ({ token, chain }) => {
  const { t } = useI18n()
  const [contractCopied, setContractCopied] = useState(false)
  const contractCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const isNative = token.tokenAddress == null

  const decimalsLabel =
    token.tokenMetadata.decimals != null
      ? String(token.tokenMetadata.decimals)
      : isNative
        ? '18'
        : '—'

  const handleCopyContract = useCallback(async () => {
    if (!token.tokenAddress) return
    try {
      await navigator.clipboard.writeText(token.tokenAddress)
    } catch {
      return
    }
    setContractCopied(true)
    if (contractCopyTimerRef.current != null) {
      clearTimeout(contractCopyTimerRef.current)
    }
    contractCopyTimerRef.current = setTimeout(() => {
      setContractCopied(false)
      contractCopyTimerRef.current = null
    }, CONTRACT_COPY_FEEDBACK_MS)
  }, [token.tokenAddress])

  useEffect(() => {
    return () => {
      if (contractCopyTimerRef.current != null) {
        clearTimeout(contractCopyTimerRef.current)
      }
    }
  }, [])

  return (
    <section className="token-detail__details card">
      <h2 className="token-detail__section-title">{t('tokenDetailDetails')}</h2>
      <dl className="token-detail__dl">
        <div className="token-detail__dl-row">
          <dt>{t('tokenDetailNetwork')}</dt>
          <dd>{chain.name}</dd>
        </div>
        <div className="token-detail__dl-row token-detail__dl-row--contract">
          <dt>{t('tokenDetailContract')}</dt>
          <dd className="token-detail__contract-dd">
            {isNative ? (
              <span className="token-detail__muted">
                {t('tokenDetailNativeToken')}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="token-detail__contract token-detail__contract--clickcopy"
                  onClick={() => void handleCopyContract()}
                  title={contractCopied ? t('copied') : t('copy')}
                  aria-label={contractCopied ? t('copied') : t('copy')}
                >
                  {contractCopied ? t('copied') : token.tokenAddress}
                </button>
                <button
                  type="button"
                  className="token-detail__copy"
                  onClick={() => void handleCopyContract()}
                >
                  {contractCopied ? t('copied') : t('copy')}
                </button>
              </>
            )}
          </dd>
        </div>
        <div className="token-detail__dl-row">
          <dt>{t('tokenDetailDecimals')}</dt>
          <dd>{decimalsLabel}</dd>
        </div>
        <div className="token-detail__dl-row token-detail__dl-row--allowance">
          <dt>{t('tokenDetailAllowance')}</dt>
          <dd className="token-detail__allowance-dd">
            <span>—</span>
            <button
              type="button"
              className="token-detail__edit"
              disabled
              title={t('tokenDetailAllowanceEditHint')}
            >
              {t('edit')}
            </button>
          </dd>
        </div>
      </dl>
    </section>
  )
}

export default TokenDetailInfo
