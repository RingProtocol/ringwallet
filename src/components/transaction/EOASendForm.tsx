import React, { useMemo } from 'react'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import EvmWalletService from '../../services/chainplugins/evm/evmPlugin'
import PasskeyService from '../../services/account/passkeyService'
import { useSendForm } from './useSendForm'
import SendFormFields from './SendFormFields'
import SendFormLayout from './SendFormLayout'
import SignedTxResult, { type TxDisplayRow } from './SignedTxResult'
import '../QuickActionBar.css'
import { useI18n } from '../../i18n'
import { TESTID } from '../testids'
import { emitPendingTransaction } from '../../features/history/client'
import { decodeSignedTx } from '../../utils/signedTxDecoder'

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

  const nativeSymbol = activeChain?.symbol || 'ETH'
  const evmRows = useMemo(
    () =>
      signedTx && typeof signedTx === 'string'
        ? buildEvmRows(signedTx, nativeSymbol, t as (key: string) => string)
        : [],
    [signedTx, nativeSymbol, t]
  )

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
