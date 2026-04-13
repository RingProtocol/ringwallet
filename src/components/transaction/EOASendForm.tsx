import React, { useMemo, useState } from 'react'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import EvmWalletService from '../../services/chainplugins/evm/evmPlugin'
import PasskeyService from '../../services/account/passkeyService'
import { useSendForm } from './useSendForm'
import SendFormFields from './SendFormFields'
import SendFormLayout from './SendFormLayout'
import '../TransactionActions.css'
import { useI18n } from '../../i18n'
import { TESTID } from '../testids'
import { emitPendingTransaction } from '../../features/history/client'
import { decodeSignedTx } from '../../utils/signedTxDecoder'

interface SignedTxResultProps {
  signedTx: string
  nativeSymbol: string
  broadcastHash: string
  isBroadcasting: boolean
  explorerUrl: string
  onCopy: () => void
  onBroadcast: () => void
}

const SignedTxResult: React.FC<SignedTxResultProps> = ({
  signedTx,
  nativeSymbol,
  broadcastHash,
  isBroadcasting,
  explorerUrl,
  onCopy,
  onBroadcast,
}) => {
  const { t } = useI18n()
  const [showRaw, setShowRaw] = useState(false)
  const decoded = useMemo(
    () => decodeSignedTx(signedTx, nativeSymbol),
    [signedTx, nativeSymbol]
  )

  return (
    <div className="signed-result">
      <h4>✅ {t('signedSuccessfully')}</h4>
      {decoded ? (
        <div className="signed-result__decoded">
          <div className="signed-result__row">
            <span className="signed-result__label">{t('txFieldTo')}</span>
            <span className="signed-result__value signed-result__value--mono">
              {decoded.to}
            </span>
          </div>
          <div className="signed-result__row">
            <span className="signed-result__label">{t('txFieldValue')}</span>
            <span className="signed-result__value">{decoded.value}</span>
          </div>
          {decoded.data && (
            <>
              <div className="signed-result__row">
                <span className="signed-result__label">
                  {t('txFieldMethod')}
                </span>
                <span className="signed-result__value signed-result__value--mono">
                  {decoded.data.method}
                </span>
              </div>
              <div className="signed-result__row">
                <span className="signed-result__label">
                  {t('txFieldAction')}
                </span>
                <span className="signed-result__value">
                  {decoded.data.description}
                </span>
              </div>
              {decoded.data.params.map((p, i) => (
                <div
                  className="signed-result__row signed-result__row--indent"
                  key={i}
                >
                  <span className="signed-result__label">→ {p.name}</span>
                  <span className="signed-result__value signed-result__value--mono">
                    {p.value}
                  </span>
                </div>
              ))}
            </>
          )}
          <div className="signed-result__row">
            <span className="signed-result__label">{t('txFieldGasLimit')}</span>
            <span className="signed-result__value">{decoded.gasLimit}</span>
          </div>
          <div className="signed-result__row">
            <span className="signed-result__label">{decoded.feeLabel}</span>
            <span className="signed-result__value">{decoded.fee}</span>
          </div>
          <div className="signed-result__row">
            <span className="signed-result__label">Nonce</span>
            <span className="signed-result__value">{decoded.nonce}</span>
          </div>
          <div className="signed-result__row">
            <span className="signed-result__label">Chain ID</span>
            <span className="signed-result__value">{decoded.chainId}</span>
          </div>
        </div>
      ) : (
        <textarea readOnly value={signedTx} rows={3} className="result-area" />
      )}

      <button
        className="signed-result__toggle"
        onClick={() => setShowRaw(!showRaw)}
      >
        {showRaw ? t('hideRawData') : t('showRawData')}
      </button>
      {showRaw && <div className="signed-result__raw">{signedTx}</div>}

      <div className="button-group">
        <button onClick={onCopy} className="copy-btn">
          Copy Hex
        </button>
        {!broadcastHash && (
          <button
            onClick={onBroadcast}
            className="primary-btn broadcast-btn"
            disabled={isBroadcasting}
            data-testid={TESTID.SEND_BROADCAST_BUTTON}
          >
            {isBroadcasting ? 'Broadcasting...' : t('broadcastTransaction')}
          </button>
        )}
      </div>

      {broadcastHash && (
        <div
          className="broadcast-success"
          data-testid={TESTID.BROADCAST_SUCCESS}
        >
          <h4>{t('txSubmitted')}</h4>
          <p>
            Tx Hash:{' '}
            <span className="hash-text" data-testid={TESTID.BROADCAST_HASH}>
              {broadcastHash.substring(0, 10)}...
              {broadcastHash.substring(broadcastHash.length - 8)}
            </span>
          </p>
          <a
            href={`${explorerUrl}/tx/${broadcastHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-link"
          >
            View on Explorer ↗
          </a>
        </div>
      )}
    </div>
  )
}

interface EOASendFormProps {
  onClose: () => void
  initialToken?: import('./types').SendTokenOption
}

const EOASendForm: React.FC<EOASendFormProps> = ({ onClose, initialToken }) => {
  const { t } = useI18n()
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
    resetForm,
    copyToClipboard,
  } = useSendForm(initialToken)

  if (!activeWallet) return null

  const handleClose = () => {
    resetForm()
    onClose()
  }

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
      title="Send Transaction"
      walletHint={walletHint}
      error={error}
    >
      <SendFormFields
        toAddress={toAddress}
        onToAddressChange={setToAddress}
        selectedToken={selectedToken}
        onTokenChange={setSelectedToken}
        tokenOptions={tokenOptions}
        amount={amount}
        onAmountChange={setAmount}
        amountLabel={amountLabel}
        nativeSymbol={activeChain?.symbol || 'ETH'}
      />

      <div className="modal-actions">
        <button
          onClick={handleSign}
          disabled={isLoading || !toAddress}
          className="primary-btn"
          data-testid={TESTID.SEND_SIGN_BUTTON}
        >
          {isLoading ? 'Signing...' : 'Sign Transaction'}
        </button>
        <button
          onClick={handleClose}
          className="secondary-btn"
          data-testid={TESTID.SEND_CLOSE_BUTTON}
        >
          Close
        </button>
      </div>

      {signedTx && typeof signedTx === 'string' && (
        <SignedTxResult
          signedTx={signedTx}
          nativeSymbol={activeChain?.symbol || 'ETH'}
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
