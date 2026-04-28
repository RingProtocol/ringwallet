import React, { useMemo, useState } from 'react'
import {
  chainToAccountAssetsNetwork,
  NATIVE_COIN_ICON,
} from '../../config/chains'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { getTokensForNetwork } from '../../models/ChainTokens'
import EvmWalletService from '../../services/chainplugins/evm/evmPlugin'
import PasskeyService from '../../services/account/passkeyService'
import { useSendForm } from './useSendForm'
import SendFormFields from './SendFormFields'
import SendFormLayout from './SendFormLayout'
import SignedTxResult, { type TxDisplayRow } from './SignedTxResult'
import SendConfirmPreview from './SendConfirmPreview'
import TransactionSheet from './TransactionSheet'
import '../QuickActionBar.css'
import { useI18n } from '../../i18n'
import { TESTID } from '../testids'
import { emitPendingTransaction } from '../../features/history/client'
import { decodeSignedTx } from '../../utils/signedTxDecoder'
import { formatChainTokenBalance } from '../../features/balance/balanceManager'
import ChainIcon from '../ChainIcon'

function buildEvmRows(
  signedTx: string,
  nativeSymbol: string,
  t: (key: string) => string
): TxDisplayRow[] {
  const decoded = decodeSignedTx(signedTx, nativeSymbol)
  if (!decoded) return []

  const rows: TxDisplayRow[] = [
    { label: t('txFieldTo'), value: decoded.to, mono: true },
    { label: t('txFieldValue'), value: decoded.value },
  ]

  if (decoded.data) {
    rows.push(
      { label: t('txFieldMethod'), value: decoded.data.method, mono: true },
      { label: t('txFieldAction'), value: decoded.data.description }
    )
    for (const p of decoded.data.params) {
      rows.push({ label: p.name, value: p.value, mono: true, indent: true })
    }
  }

  rows.push(
    { label: t('txFieldGasLimit'), value: decoded.gasLimit },
    { label: decoded.feeLabel, value: decoded.fee },
    { label: 'Nonce', value: String(decoded.nonce) },
    { label: 'Chain ID', value: String(decoded.chainId) }
  )

  return rows
}

interface EOASendFormProps {
  onClose: () => void
  onBack?: () => void
  initialToken?: import('./types').SendTokenOption
}

const EOASendForm: React.FC<EOASendFormProps> = ({
  onClose,
  onBack,
  initialToken,
}) => {
  const { t } = useI18n()
  const [showPreview, setShowPreview] = useState(false)
  const {
    activeWallet,
    activeChainId,
    activeChain,
    user,
    toAddress,
    setToAddress,
    amount,
    setAmount,
    selectedToken,
    setSelectedToken,
    tokenOptions,
    amountLabel,
    tokenOpts,
    signedTx,
    setSignedTx,
    error,
    setError,
    isLoading,
    setIsLoading,
    broadcastHash,
    setBroadcastHash,
    isBroadcasting,
    setIsBroadcasting,
    copyToClipboard,
  } = useSendForm(initialToken)
  void onClose

  const nativeSymbol = activeChain?.symbol || 'ETH'
  const selectedSymbol =
    selectedToken.type === 'native'
      ? selectedToken.symbol
      : selectedToken.token.symbol
  const availableAmount = useMemo(() => {
    if (!activeChain) return '0'
    const network = chainToAccountAssetsNetwork(activeChain)
    if (!network) return '0'
    const tokens = getTokensForNetwork(network) ?? []
    const matched =
      selectedToken.type === 'native'
        ? tokens.find((t) => t.tokenAddress == null)
        : tokens.find(
            (t) =>
              t.tokenAddress?.toLowerCase() ===
              selectedToken.token.address.toLowerCase()
          )
    if (!matched) return '0'
    return formatChainTokenBalance(matched, activeChain, 6)
  }, [activeChain, selectedToken])
  const evmRows = useMemo(
    () =>
      signedTx && typeof signedTx === 'string'
        ? buildEvmRows(signedTx, nativeSymbol, t as (key: string) => string)
        : [],
    [signedTx, nativeSymbol, t]
  )

  if (!activeWallet) return null

  const handleSign = async () => {
    setError('')
    setSignedTx(null)
    setBroadcastHash('')
    setIsLoading(true)
    try {
      if (user?.id) {
        const verified = await PasskeyService.verifyIdentity(user.id)
        if (!verified) {
          setError(t('txCanceledBiometricFailed'))
          return
        }
      }

      const tx = await EvmWalletService.signTransaction(
        activeWallet.privateKey!,
        toAddress,
        amount,
        Number(activeChainId),
        getPrimaryRpcUrl(activeChain),
        tokenOpts
      )
      setSignedTx(tx)
    } catch (e) {
      console.error(e)
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBroadcast = async () => {
    if (!signedTx || typeof signedTx !== 'string') return
    setError('')
    setIsBroadcasting(true)
    try {
      const hash = await EvmWalletService.broadcastEOATransaction(
        signedTx,
        getPrimaryRpcUrl(activeChain)
      )
      setBroadcastHash(hash)
      emitPendingTransaction({
        hash,
        from: activeWallet.address,
        to: toAddress,
        value: amount,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
        chainId: String(activeChain?.id ?? activeChainId),
        address: activeWallet.address,
      })
    } catch (e) {
      console.error(e)
      setError('Broadcast1 failed: ' + (e as Error).message)
    } finally {
      setIsBroadcasting(false)
    }
  }

  const walletHint = `From: Wallet #${activeWallet.index + 1} (${activeWallet.address.substring(0, 6)}...${activeWallet.address.substring(activeWallet.address.length - 4)})`

  return (
    <SendFormLayout
      title="Send"
      walletHint={walletHint}
      error={error}
      onBack={onBack}
      selectedToken={selectedToken}
    >
      <SendFormFields
        toAddress={toAddress}
        onToAddressChange={setToAddress}
        selectedToken={selectedToken}
        onTokenChange={setSelectedToken}
        tokenOptions={tokenOptions}
        hideTokenSelect
        amount={amount}
        onAmountChange={setAmount}
        amountLabel={amountLabel}
        nativeSymbol={activeChain?.symbol || 'ETH'}
      />

      <div className="send-balance-bar">
        <div className="send-balance-bar__left">
          <span className="send-balance-bar__icon">
            {selectedToken.type === 'erc20' && selectedToken.token.logo ? (
              <img
                src={selectedToken.token.logo}
                alt={selectedSymbol}
                className="send-balance-bar__icon-img"
              />
            ) : NATIVE_COIN_ICON[selectedSymbol] ? (
              <img
                src={NATIVE_COIN_ICON[selectedSymbol]}
                alt={selectedSymbol}
                className="send-balance-bar__icon-img"
              />
            ) : (
              <ChainIcon
                icon={activeChain?.icon}
                symbol={selectedSymbol}
                size={36}
              />
            )}
          </span>
          <div>
            <div className="send-balance-bar__label">Balance</div>
            <div className="send-balance-bar__value">
              {availableAmount} {selectedSymbol}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="send-balance-bar__max"
          onClick={() => setAmount(availableAmount)}
        >
          Max
        </button>
      </div>
      <div className="modal-actions modal-actions--single-bottom">
        <button
          onClick={() => setShowPreview(true)}
          disabled={!toAddress}
          className="primary-btn"
          data-testid={TESTID.SEND_SIGN_BUTTON}
        >
          Continue
        </button>
      </div>

      {showPreview && (
        <TransactionSheet variant="sheet">
          <SendConfirmPreview
            selectedToken={selectedToken}
            amount={amount}
            chainName={activeChain?.name || 'Unknown'}
            fromAddress={activeWallet.address}
            toAddress={toAddress}
            onCancel={() => setShowPreview(false)}
            onConfirm={async () => {
              await handleSign()
              setShowPreview(false)
            }}
            isConfirming={isLoading}
          />
        </TransactionSheet>
      )}

      {signedTx && typeof signedTx === 'string' && (
        <SignedTxResult
          rows={evmRows}
          rawData={signedTx}
          rawFormat="hex"
          broadcastHash={broadcastHash}
          isBroadcasting={isBroadcasting}
          explorerUrl={activeChain?.explorer || 'https://etherscan.io'}
          onCopy={() => copyToClipboard(signedTx)}
          onBroadcast={handleBroadcast}
        />
      )}
    </SendFormLayout>
  )
}

export default EOASendForm
