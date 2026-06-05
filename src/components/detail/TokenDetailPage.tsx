import React, { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useSwapSigner } from '../swap/useSwapSigner'
import SwapDialog from '../swap/SwapDialog'
import { isRingV2Supported } from '../swap/ringV2Constants'
import { isKyberAggregatorSupported } from '../swap/kyberConstants'
import { useAuth } from '../../contexts/AuthContext'
import { ChainFamily } from '../../models/ChainType'
import { WalletType } from '../../models/WalletType'
import type { ChainToken } from '../../models/ChainTokens'
import type { Chain } from '../../models/ChainType'
import RpcService from '../../services/rpc/rpcService'
import { removeToken, updateTokenLogo } from '../../utils/tokenStorage'
import {
  EOASendForm,
  SmartAccountSendForm,
  SolanaSendForm,
  BitcoinSendForm,
  DogecoinSendForm,
  ReceiveDialog,
} from '../transaction'
import type { SendTokenOption } from '../transaction/types'
import { useI18n } from '../../i18n'
import './TokenDetailPage.css'
import {
  TokenDetailHeader,
  TokenDetailBalance,
  TokenDetailPriceChart,
  TokenDetailInfo,
  TokenDetailActivity,
} from '.'
import { ActionCircleEntry } from '../common/QuickActionBar'
import { TESTID } from '../testids'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

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
  const {
    activeWallet,
    activeAccount,
    isSolanaChain,
    isBitcoinChain,
    isDogecoinChain,
  } = useAuth()
  const {
    signer: swapSigner,
    chainId: swapChainId,
    rpcUrl: swapRpcUrl,
  } = useSwapSigner()
  const [swapOpen, setSwapOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [sendFormKey, setSendFormKey] = useState(0)
  const [showReceive, setShowReceive] = useState(false)
  const [hideDialogOpen, setHideDialogOpen] = useState(false)
  const [displayToken, setDisplayToken] = useState(token)
  const [sendTokenOption, setSendTokenOption] = useState<
    SendTokenOption | undefined
  >(undefined)

  useEffect(() => {
    setDisplayToken(token)
  }, [token])

  useEffect(() => {
    const tokenAddress = token.tokenAddress
    if (!tokenAddress) return
    if (token.tokenMetadata.logo?.trim()) return
    if (!ethers.isAddress(tokenAddress)) return
    if (chain.family !== ChainFamily.EVM && chain.family !== ChainFamily.Prisma)
      return

    let cancelled = false
    const run = async () => {
      try {
        const evmService = RpcService.fromChain(chain).getEvmService()
        const logo = await evmService.getTokenLogo(tokenAddress)
        if (!logo || cancelled) return

        setDisplayToken((prev) => ({
          ...prev,
          tokenMetadata: {
            ...prev.tokenMetadata,
            logo,
          },
        }))

        if (activeAccount?.address) {
          const updated = updateTokenLogo(
            activeAccount.address,
            chain.id,
            tokenAddress,
            logo
          )
          if (updated) {
            window.dispatchEvent(new Event('ring:tokens-updated'))
          }
        }
      } catch {
        // Ignore logo lookup failures to keep detail page responsive.
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [activeAccount?.address, chain, token])

  const isNative = displayToken.tokenAddress == null
  const symbol =
    displayToken.tokenMetadata.symbol ?? displayToken.tokenMetadata.name ?? ''

  const canUseRingSwap =
    isRingV2Supported(swapChainId) || isKyberAggregatorSupported(swapChainId)
  const swapButtonTitle = canUseRingSwap
    ? t('swapOpenTitle')
    : t('swapDisabledNonEvm')

  const handleViewInExplorer = useCallback(() => {
    const explorerBase = chain.explorer?.replace(/\/$/, '')
    if (!explorerBase) return

    let url = explorerBase
    if (displayToken.tokenAddress) {
      if (chain.family === ChainFamily.Solana) {
        url = `${explorerBase}/address/${displayToken.tokenAddress}`
      } else {
        url = `${explorerBase}/token/${displayToken.tokenAddress}`
      }
    } else if (activeAccount?.address) {
      url = `${explorerBase}/address/${activeAccount.address}`
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }, [
    activeAccount?.address,
    chain.explorer,
    chain.family,
    displayToken.tokenAddress,
  ])

  const handleRequestHideToken = useCallback(() => {
    if (!displayToken.tokenAddress || !activeAccount?.address) return
    setHideDialogOpen(true)
  }, [activeAccount?.address, displayToken.tokenAddress])

  const handleHideToken = useCallback(() => {
    if (!displayToken.tokenAddress || !activeAccount?.address) return
    removeToken(activeAccount.address, chain.id, displayToken.tokenAddress)
    window.dispatchEvent(new Event('ring:tokens-updated'))
    setHideDialogOpen(false)
    onBack()
  }, [activeAccount?.address, chain.id, displayToken.tokenAddress, onBack])

  const handleCloseSend = useCallback(() => {
    setSendOpen(false)
    setSendTokenOption(undefined)
  }, [])

  const receiveAddress = activeAccount?.address

  const handleOpenSend = useCallback(() => {
    if (isNative) {
      setSendTokenOption({ type: 'native', symbol })
    } else {
      const logo = displayToken.tokenMetadata.logo?.trim() || null
      setSendTokenOption({
        type: 'erc20',
        token: {
          address: displayToken.tokenAddress!,
          symbol,
          name: displayToken.tokenMetadata.name ?? '',
          decimals: displayToken.tokenMetadata.decimals ?? 18,
          logo,
        },
      })
    }
    setSendFormKey((k) => k + 1)
    setSendOpen(true)
  }, [displayToken, isNative, symbol])

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
    if (isBitcoinChain)
      return (
        <BitcoinSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={handleCloseSend}
        />
      )
    if (isDogecoinChain)
      return (
        <DogecoinSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={handleCloseSend}
        />
      )
    if (isSolanaChain)
      return (
        <SolanaSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={handleCloseSend}
        />
      )
    if (isSmartAccount)
      return (
        <SmartAccountSendForm
          key={sendFormKey}
          onClose={handleCloseSend}
          onBack={handleCloseSend}
          initialToken={sendTokenOption}
        />
      )
    return (
      <EOASendForm
        key={sendFormKey}
        onClose={handleCloseSend}
        onBack={handleCloseSend}
        initialToken={sendTokenOption}
      />
    )
  }

  return (
    <div className="token-detail" role="dialog" aria-modal="true">
      {swapOpen && swapSigner && (
        <SwapDialog
          signer={swapSigner}
          chainId={swapChainId}
          rpcUrl={swapRpcUrl}
          onClose={() => setSwapOpen(false)}
        />
      )}

      <TokenDetailHeader
        token={displayToken}
        chain={chain}
        onBack={handleNavBack}
        onViewInExplorer={handleViewInExplorer}
        onHideToken={handleRequestHideToken}
        canHideToken={Boolean(
          displayToken.tokenAddress && activeAccount?.address
        )}
      />

      <div className="token-detail__scroll">
        <TokenDetailBalance token={displayToken} chain={chain} />
        <TokenDetailPriceChart token={displayToken} chain={chain} />

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
            onClick={() => setShowReceive(true)}
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

        <TokenDetailInfo token={displayToken} chain={chain} />
        <TokenDetailActivity token={displayToken} />
      </div>

      {sendOpen && renderSendForm()}

      {showReceive && receiveAddress && (
        <ReceiveDialog
          address={receiveAddress}
          chainName={chain.name}
          onClose={() => setShowReceive(false)}
        />
      )}

      <AlertDialog open={hideDialogOpen} onOpenChange={setHideDialogOpen}>
        <AlertDialogContent className="token-hide-dialog">
          <AlertDialogHeader className="token-hide-dialog__header">
            <AlertDialogTitle className="token-hide-dialog__title">
              {t('tokenDetailHideConfirmTitle')}
            </AlertDialogTitle>
            <div className="token-hide-dialog__token">
              {displayToken.tokenMetadata.logo?.trim() ? (
                <img
                  src={displayToken.tokenMetadata.logo.trim()}
                  alt={symbol}
                  className="token-hide-dialog__token-logo"
                />
              ) : (
                <span className="token-hide-dialog__token-fallback">
                  {symbol.charAt(0)}
                </span>
              )}
              <span className="token-hide-dialog__token-symbol">{symbol}</span>
            </div>
            <AlertDialogDescription className="token-hide-dialog__description">
              {t('tokenDetailHideConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="token-hide-dialog__actions">
            <AlertDialogCancel className="token-hide-dialog__cancel">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="token-hide-dialog__confirm"
              onClick={handleHideToken}
            >
              {t('tokenDetailHideConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TokenDetailPage
