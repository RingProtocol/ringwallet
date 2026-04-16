import React, { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import PasskeyService from '../../services/account/passkeyService'
import { SolanaService } from '../../services/rpc/solanaService'
import { SolanaKeyService } from '../../services/chainplugins/solana/solanaPlugin'
import SendFormLayout from './SendFormLayout'
import SignedTxResult, { type TxDisplayRow } from './SignedTxResult'
import '../TransactionActions.css'
import { useI18n } from '../../i18n'
import { decodeSolanaTx } from '../../utils/solanaTxDecoder'

interface SolanaSendFormProps {
  onClose: () => void
}

interface SignedSolanaTx {
  serializedTx: Buffer
  blockhash: string
  lastValidBlockHeight: number
}

function buildSolanaRows(
  serializedTx: Buffer,
  nativeSymbol: string,
  t: (key: string) => string
): TxDisplayRow[] {
  const decoded = decodeSolanaTx(serializedTx, nativeSymbol)
  if (!decoded) return []

  return [
    { label: t('txFieldFrom'), value: decoded.from, mono: true },
    { label: t('txFieldTo'), value: decoded.to, mono: true },
    { label: t('txFieldValue'), value: decoded.amount },
    { label: t('txFieldEstimatedFee'), value: decoded.estimatedFee },
    { label: t('txFieldProgram'), value: decoded.program, mono: true },
    { label: t('txFieldBlockhash'), value: decoded.blockhash, mono: true },
  ]
}

const SolanaSendForm: React.FC<SolanaSendFormProps> = ({ onClose }) => {
  const { activeSolanaWallet, activeChain, user } = useAuth()
  const { t } = useI18n()

  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [addressError, setAddressError] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signedTx, setSignedTx] = useState<SignedSolanaTx | null>(null)
  const [txSignature, setTxSignature] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null)

  const nativeSymbol = activeChain?.symbol || 'SOL'
  const solanaRows = useMemo(
    () =>
      signedTx
        ? buildSolanaRows(
            signedTx.serializedTx,
            nativeSymbol,
            t as (key: string) => string
          )
        : [],
    [signedTx, nativeSymbol, t]
  )

  if (!activeSolanaWallet) return null

  const handleClose = () => {
    setToAddress('')
    setAmount('')
    setAddressError('')
    setError('')
    setSignedTx(null)
    setTxSignature('')
    setEstimatedFee(null)
    onClose()
  }

  const validateAddress = (addr: string): boolean => {
    if (!SolanaKeyService.isValidAddress(addr)) {
      setAddressError(t('invalidAddress'))
      return false
    }
    setAddressError('')
    return true
  }

  const handleAddressBlur = () => {
    if (toAddress) validateAddress(toAddress)
  }

  const handleEstimateFee = async () => {
    if (!toAddress || !amount || !validateAddress(toAddress)) return
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    try {
      const keypair = SolanaKeyService.keypairFromStoredKey(
        activeSolanaWallet.privateKey!
      )
      const service = new SolanaService(getPrimaryRpcUrl(activeChain))
      const fee = await service.estimateFee(
        keypair.publicKey,
        toAddress,
        amountNum
      )
      setEstimatedFee(fee.toFixed(6))
    } catch {
      setEstimatedFee(null)
    }
  }

  const handleSign = async () => {
    setError('')
    setSignedTx(null)
    setTxSignature('')

    if (!validateAddress(toAddress)) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t('invalidAmount'))
      return
    }

    setIsLoading(true)
    try {
      if (user?.id) {
        const verified = await PasskeyService.verifyIdentity(user.id)
        if (!verified) {
          setError(t('txCanceledBiometricFailed'))
          return
        }
      }

      const keypair = SolanaKeyService.keypairFromStoredKey(
        activeSolanaWallet.privateKey!
      )
      const service = new SolanaService(getPrimaryRpcUrl(activeChain))
      const result = await service.buildAndSignSOL(
        keypair,
        toAddress,
        amountNum
      )
      setSignedTx(result)
    } catch (e) {
      console.error(e)
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBroadcast = async () => {
    if (!signedTx) return
    setError('')
    setIsBroadcasting(true)
    try {
      const service = new SolanaService(getPrimaryRpcUrl(activeChain))
      const signature = await service.broadcastRawTransaction(
        signedTx.serializedTx,
        signedTx.blockhash,
        signedTx.lastValidBlockHeight
      )
      setTxSignature(signature)
    } catch (e) {
      console.error(e)
      setError((e as Error).message)
    } finally {
      setIsBroadcasting(false)
    }
  }

  const explorerBase = activeChain.explorer || 'https://solscan.io'
  const walletHint = `From: ${activeSolanaWallet.address.slice(0, 6)}...${activeSolanaWallet.address.slice(-4)} (${activeChain.name})`

  const rawBase64 = signedTx
    ? Buffer.from(signedTx.serializedTx).toString('base64')
    : ''

  return (
    <SendFormLayout title="Send SOL" walletHint={walletHint} error={error}>
      {!signedTx && !txSignature ? (
        <>
          <div className="form-group">
            <label>Recipient (Solana address)</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => {
                setToAddress(e.target.value)
                setAddressError('')
              }}
              onBlur={handleAddressBlur}
              placeholder="Base58 address..."
              className="input-field"
            />
            {addressError && <div className="field-error">{addressError}</div>}
          </div>

          <div className="form-group">
            <label>Amount (SOL)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={handleEstimateFee}
              placeholder="0.000000"
              min="0"
              step="0.000001"
              className="input-field"
            />
            {estimatedFee && (
              <div className="fee-hint">Estimated fee: ~{estimatedFee} SOL</div>
            )}
          </div>

          <div className="modal-actions">
            <button
              onClick={handleSign}
              disabled={isLoading || !toAddress || !amount || !!addressError}
              className="primary-btn"
            >
              {isLoading ? 'Signing...' : t('signAndReview')}
            </button>
            <button onClick={handleClose} className="secondary-btn">
              Close
            </button>
          </div>
        </>
      ) : txSignature ? (
        <div className="broadcast-success">
          <h4>{t('txSubmitted')}</h4>
          <p>
            Signature:{' '}
            <span className="hash-text">
              {txSignature.slice(0, 10)}...{txSignature.slice(-8)}
            </span>
          </p>
          <a
            href={`${explorerBase}/tx/${txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-link"
          >
            View on Explorer ↗
          </a>
          <div className="modal-actions">
            <button
              onClick={() =>
                navigator.clipboard
                  .writeText(txSignature)
                  .then(() => alert(t('copied')))
              }
              className="copy-btn"
            >
              {t('copySignature')}
            </button>
            <button onClick={handleClose} className="secondary-btn">
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <SignedTxResult
            rows={solanaRows}
            rawData={rawBase64}
            rawFormat="base64"
            broadcastHash=""
            isBroadcasting={isBroadcasting}
            explorerUrl={explorerBase}
            hashLabel="Signature"
            onCopy={() =>
              navigator.clipboard
                .writeText(rawBase64)
                .then(() => alert(t('copied')))
            }
            onBroadcast={handleBroadcast}
          />
          <div className="modal-actions" style={{ marginTop: '10px' }}>
            <button onClick={handleClose} className="secondary-btn">
              Close
            </button>
          </div>
        </>
      )}
    </SendFormLayout>
  )
}

export default SolanaSendForm
