import React from 'react'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import EvmWalletService, {
  type EIP7951Result,
} from '../../services/wallet/EvmWalletService'
import { useSendForm } from './useSendForm'
import SendFormFields from './SendFormFields'
import TransactionSheet from './TransactionSheet'
import type { SignedTx } from './types'
import '../TransactionActions.css'

interface SmartAccountSendFormProps {
  onClose: () => void
  initialToken?: import('./types').SendTokenOption
}

const isEIP7951Tx = (tx: SignedTx): tx is EIP7951Result =>
  typeof tx === 'object' && tx.type === 'eip-7951'

const SmartAccountSendForm: React.FC<SmartAccountSendFormProps> = ({
  onClose,
  initialToken,
}) => {
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
      const publicKey = user?.publicKey || null
      const salt = activeWallet.index || 0
      const factoryAddress = activeChain?.factoryAddress || null

      const tx = await EvmWalletService.signEIP7951Transaction(
        activeWallet.credentialId!,
        toAddress,
        amount,
        Number(activeChainId),
        getPrimaryRpcUrl(activeChain),
        activeWallet.address,
        factoryAddress,
        publicKey as Map<number, Uint8Array>,
        salt,
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
    if (!signedTx || !isEIP7951Tx(signedTx)) return
    setError('')
    setIsBroadcasting(true)
    try {
      const hash = await EvmWalletService.broadcastSmartAccountTransaction(
        signedTx,
        getPrimaryRpcUrl(activeChain),
        activeChain?.bundlerUrl,
        activeChain?.entryPoint
      )
      setBroadcastHash(hash)
    } catch (e) {
      console.error(e)
      setError('Broadcast2 failed: ' + (e as Error).message)
    } finally {
      setIsBroadcasting(false)
    }
  }

  return (
    <TransactionSheet onClose={handleClose}>
      <h3>Send Transaction</h3>
      <div className="current-wallet-hint">
        From: Wallet #{activeWallet.index + 1} (
        {activeWallet.address.substring(0, 6)}...
        {activeWallet.address.substring(activeWallet.address.length - 4)})
      </div>

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

      {error && <div className="error-text">{error}</div>}

      <div className="modal-actions">
        <button
          onClick={handleSign}
          disabled={isLoading || !toAddress}
          className="primary-btn"
        >
          {isLoading ? 'Signing...' : 'Sign Transaction'}
        </button>
        <button onClick={handleClose} className="secondary-btn">
          Close
        </button>
      </div>

      {signedTx && isEIP7951Tx(signedTx) && (
        <div className="signed-result">
          <h4>✅ Signed Successfully</h4>

          {!signedTx.isDeployed && (
            <div
              className="warning-banner"
              style={{
                backgroundColor: '#fff3cd',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '10px',
                fontSize: '12px',
              }}
            >
              ⚠️ Account not deployed yet.{' '}
              {signedTx.userOp?.initCode && signedTx.userOp.initCode !== '0x'
                ? 'Will be deployed on first transaction.'
                : 'Factory address not configured. Please configure VITE_FACTORY_* environment variables.'}
            </div>
          )}

          <div
            className="result-area"
            style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}
          >
            {signedTx.display}
          </div>
          <div className="button-group">
            <button
              onClick={() => copyToClipboard(JSON.stringify(signedTx, null, 2))}
              className="copy-btn"
            >
              Copy JSON
            </button>
            {!broadcastHash && (
              <button
                onClick={handleBroadcast}
                className="primary-btn broadcast-btn"
                disabled={
                  isBroadcasting ||
                  (!signedTx.isDeployed &&
                    (!signedTx.userOp?.initCode ||
                      signedTx.userOp.initCode === '0x'))
                }
              >
                {isBroadcasting ? 'Broadcasting...' : '🚀 Broadcast UserOp'}
              </button>
            )}
          </div>

          {broadcastHash && (
            <div className="broadcast-success">
              <h4>🎉 Transaction Submitted!</h4>
              <p>
                Tx Hash:{' '}
                <span className="hash-text">
                  {broadcastHash.substring(0, 10)}...
                  {broadcastHash.substring(broadcastHash.length - 8)}
                </span>
              </p>
              <a
                href={`${activeChain?.explorer || 'https://etherscan.io'}/tx/${broadcastHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-link"
              >
                View on Explorer ↗
              </a>
            </div>
          )}
        </div>
      )}
    </TransactionSheet>
  )
}

export default SmartAccountSendForm
