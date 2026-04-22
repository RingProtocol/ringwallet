import React, { useCallback, useState } from 'react'
import DAppContainer from '@/features/dapps/components/DAppContainer'
import { useAuth } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import type { ChainToken } from '../models/ChainTokens'
import type { Chain } from '../models/ChainType'
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
import './TokenDetailPage.css'
import {
  TokenDetailHeader,
  TokenDetailBalance,
  TokenDetailPriceChart,
  TokenDetailInfo,
  TokenDetailActivity,
} from './detail'
import { ActionCircleEntry } from './ActionCircleEntry'
import { TESTID } from './testids'

export interface TokenDetailPageProps {
  token: ChainToken
  chain: Chain
  onBack: () => void
}

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

  const isNative = token.tokenAddress == null
  const symbol = token.tokenMetadata.symbol ?? token.tokenMetadata.name ?? ''

  const canUseRingSwap = !isSolanaChain && !isBitcoinChain && !isDogecoinChain
  const swapButtonTitle = canUseRingSwap
    ? t('swapOpenTitle')
    : t('swapDisabledNonEvm')

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
          name: token.tokenMetadata.name ?? '',
          decimals: token.tokenMetadata.decimals ?? 18,
        },
      })
    }
    setSendOpen(true)
  }, [isNative, symbol, token])

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

  return (
    <div className="token-detail" role="dialog" aria-modal="true">
      {swapOpen && (
        <DAppContainer
          dapp={RING_SWAP_DAPP}
          onBack={() => setSwapOpen(false)}
        />
      )}

      <TokenDetailHeader token={token} chain={chain} onBack={handleNavBack} />

      <div className="token-detail__scroll">
        <TokenDetailBalance token={token} chain={chain} />
        <TokenDetailPriceChart token={token} />

        <div
          className="token-detail__actions"
          role="toolbar"
          aria-label={t('wallet')}
        >
          <ActionCircleEntry
            variantClass="action-circle-entry--send"
            icon={
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
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            }
            label={t('send')}
            onClick={handleOpenSend}
            testId={TESTID.TOKEN_DETAIL_SEND}
          />
          <ActionCircleEntry
            variantClass="action-circle-entry--receive"
            icon={
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
                <polyline points="8 17 12 21 16 17" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
              </svg>
            }
            label={t('receive')}
            onClick={() => {}}
          />
          <ActionCircleEntry
            variantClass="action-circle-entry--swap"
            icon={
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
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            }
            label={t('walletActionRingSwap')}
            onClick={() => canUseRingSwap && setSwapOpen(true)}
            disabled={!canUseRingSwap}
            title={swapButtonTitle}
          />
        </div>

        <TokenDetailInfo token={token} chain={chain} />
        <TokenDetailActivity token={token} />
      </div>

      {sendOpen && renderSendForm()}
    </div>
  )
}

export default TokenDetailPage
