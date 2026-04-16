import React, { useCallback, useEffect, useRef, useState } from 'react'
import DAppContainer from '@/features/dapps/components/DAppContainer'
import { useAuth } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import {
  chainTokenChangePercentLabel,
  chainTokenDisplayName,
  chainTokenDisplaySymbol,
  formatChainTokenBalance,
  formatChainTokenPositionUsd,
  formatUsdUnitPrice,
} from '../features/balance/balanceManager'
import type { ChainToken } from '../models/ChainTokens'
import type { Chain } from '../models/ChainType'
import ChainIcon from './ChainIcon'
import TransactionHistory, {
  type TransactionHistoryAssetFilter,
} from './TransactionHistory'
import { ActionCircleEntry } from './ActionCircleEntry'
import { RING_SWAP_DAPP } from './TransactionActions'
import {
  EOASendForm,
  SmartAccountSendForm,
  SolanaSendForm,
  BitcoinSendForm,
  DogecoinSendForm,
} from './transaction'
import type { SendTokenOption } from './transaction/types'
import { useI18n } from '../i18n'
import { TESTID } from './testids'
import './TokenDetailPage.css'

export interface TokenDetailPageProps {
  token: ChainToken
  chain: Chain
  onBack: () => void
}

const CONTRACT_COPY_FEEDBACK_MS = 1_500

const TokenDetailPage: React.FC<TokenDetailPageProps> = ({
  token,
  chain,
  onBack,
}) => {
  const { t } = useI18n()
  const { activeWallet, isSolanaChain, isBitcoinChain, isDogecoinChain } =
    useAuth()
  const [swapOpen, setSwapOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [sendTokenOption, setSendTokenOption] = useState<
    SendTokenOption | undefined
  >(undefined)
  const [contractCopied, setContractCopied] = useState(false)
  const contractCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const isNative = token.tokenAddress == null
  const symbol = chainTokenDisplaySymbol(token, chain)
  const name = chainTokenDisplayName(token, chain)
  const balanceStr = formatChainTokenBalance(token, chain, 4)
  const positionUsd = formatChainTokenPositionUsd(token)
  const changeStr = chainTokenChangePercentLabel(token)
  const unitPrice = formatUsdUnitPrice(token)
  const logoUrl = token.tokenMetadata.logo?.trim()

  const canUseRingSwap = !isSolanaChain && !isBitcoinChain && !isDogecoinChain
  const swapButtonTitle = canUseRingSwap
    ? t('swapOpenTitle')
    : t('swapDisabledNonEvm')

  const assetFilter: TransactionHistoryAssetFilter = isNative
    ? { kind: 'native' }
    : { kind: 'erc20', address: token.tokenAddress! }

  const handleCloseSend = useCallback(() => {
    setSendOpen(false)
    setSendTokenOption(undefined)
  }, [])

  const handleOpenSend = useCallback(() => {
    if (isNative) {
      setSendTokenOption({ type: 'native', symbol })
    } else {
      setSendTokenOption({
        type: 'erc20',
        token: {
          address: token.tokenAddress!,
          symbol,
          name,
          decimals: token.tokenMetadata.decimals ?? 18,
        },
      })
    }
    setSendOpen(true)
  }, [isNative, name, symbol, token])

  const handleNavBack = useCallback(() => {
    if (sendOpen) {
      handleCloseSend()
      return
    }
    onBack()
  }, [sendOpen, handleCloseSend, onBack])

  const isSmartAccount =
    !isSolanaChain &&
    !isBitcoinChain &&
    !isDogecoinChain &&
    activeWallet?.type === WalletType.SmartContract

  const renderSendForm = () => {
    if (isBitcoinChain) return <BitcoinSendForm onClose={handleCloseSend} />
    if (isDogecoinChain) return <DogecoinSendForm onClose={handleCloseSend} />
    if (isSolanaChain) return <SolanaSendForm onClose={handleCloseSend} />
    if (isSmartAccount)
      return (
        <SmartAccountSendForm
          onClose={handleCloseSend}
          initialToken={sendTokenOption}
        />
      )
    return (
      <EOASendForm onClose={handleCloseSend} initialToken={sendTokenOption} />
    )
  }

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

  const decimalsLabel =
    token.tokenMetadata.decimals != null
      ? String(token.tokenMetadata.decimals)
      : isNative
        ? '18'
        : '—'

  return (
    <div className="token-detail" role="dialog" aria-modal="true">
      {swapOpen && (
        <DAppContainer
          dapp={RING_SWAP_DAPP}
          onBack={() => setSwapOpen(false)}
        />
      )}
      <header className="token-detail__nav">
        <button
          type="button"
          className="token-detail__back"
          onClick={handleNavBack}
          aria-label={t('tokenDetailBack')}
          data-testid={TESTID.TOKEN_DETAIL_BACK}
        >
          ←
        </button>
      </header>

      <div className="token-detail__scroll">
        <div className="token-detail__title">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="token-detail__logo" />
          ) : isNative && chain.icon ? (
            <ChainIcon icon={chain.icon} symbol={symbol} size={44} />
          ) : (
            <span className="token-detail__logo-fallback">
              {symbol.charAt(0)}
            </span>
          )}
          <span className="token-detail__title-name">{name}</span>
        </div>
        <div className="token-detail__metric-card token-detail__price-block">
          <div className="token-detail__metric-row">
            <span className="token-detail__metric-label">
              {t('tokenColumnPrice')}
            </span>
            <span className="token-detail__metric-value token-detail__unit-price">
              {unitPrice}
            </span>
          </div>
          <div className="token-detail__metric-row">
            <span className="token-detail__metric-label">
              {t('tokenColumnChangeRate')}
            </span>
            <span className="token-detail__metric-value token-detail__change">
              {changeStr ?? '—'}
            </span>
          </div>
          <div className="token-detail__metric-row">
            <span className="token-detail__metric-label">
              {t('tokenDetailHoldingsUsd')}
            </span>
            <span className="token-detail__metric-value token-detail__position-value">
              {positionUsd}
            </span>
          </div>
          <div className="token-detail__metric-row">
            <span className="token-detail__metric-label">
              {t('tokenDetailBalance')}
            </span>
            <span className="token-detail__metric-value token-detail__balance-value">
              {symbol} {balanceStr}
            </span>
          </div>
        </div>

        <div
          className="token-detail__actions token-detail__actions--circle-row"
          role="toolbar"
          aria-label={t('wallet')}
        >
          <ActionCircleEntry
            variantClass="action-circle-entry--swap"
            icon="⇄"
            label={t('walletActionRingSwap')}
            onClick={() => canUseRingSwap && setSwapOpen(true)}
            disabled={!canUseRingSwap}
            title={swapButtonTitle}
          />
          <ActionCircleEntry
            variantClass="action-circle-entry--send"
            icon="📤"
            label={t('send')}
            onClick={handleOpenSend}
            testId={TESTID.TOKEN_DETAIL_SEND}
          />
        </div>

        <section className="token-detail__details card">
          <h2 className="token-detail__section-title">
            {t('tokenDetailDetails')}
          </h2>
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

        <section className="token-detail__activity">
          <h2 className="token-detail__section-title">
            {t('tokenDetailActivity')}
          </h2>
          <div className="token-detail__activity-inner card">
            <TransactionHistory assetFilter={assetFilter} />
          </div>
        </section>
      </div>

      {sendOpen && renderSendForm()}
    </div>
  )
}

export default TokenDetailPage
