import React, { useState, useMemo } from 'react'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { getTokensForNetwork } from '../../models/ChainTokens'
import PasskeyService from '../../services/account/passkeyService'
import { SolanaService } from '../../services/rpc/solanaService'
import { SolanaKeyService } from '../../services/chainplugins/solana/solanaPlugin'
import SendFormLayout from './SendFormLayout'
import SignedTxResult, { type TxDisplayRow } from './SignedTxResult'
import SendConfirmPreview from './SendConfirmPreview'
import TransactionSheet from './TransactionSheet'
import ChainIcon from '../ChainIcon'
import '../QuickActionBar.css'
import { useI18n } from '../../i18n'
import { decodeSolanaTx } from '../../utils/solanaTxDecoder'
import { formatChainTokenBalance } from '../../features/balance/balanceManager'

interface SolanaSendFormProps {
  onClose: () => void
  onBack?: () => void
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

const SolanaSendForm: React.FC<SolanaSendFormProps> = ({ onClose, onBack }) => {
  const {
    activeSolanaWallet,
    solanaWallets,
    activeWalletIndex,
    activeChain,
    user,
  } = useAuth()
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
  const [showPreview, setShowPreview] = useState(false)
  const [showOwnWalletSheet, setShowOwnWalletSheet] = useState(false)

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
  const availableAmount = useMemo(() => {
    const network = chainToAccountAssetsNetwork(activeChain)
    if (!network) return '0'
    const native = (getTokensForNetwork(network) ?? []).find(
      (t) => t.tokenAddress == null
    )
    if (!native) return '0'
    return formatChainTokenBalance(native, activeChain, 6)
  }, [activeChain])

  if (!activeSolanaWallet) return null
  const selectableWallets = solanaWallets.filter(
    (wallet) =>
      wallet.address.toLowerCase() !== activeSolanaWallet.address.toLowerCase()
  )

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
    <SendFormLayout
      title="Send"
      walletHint={walletHint}
      error={error}
      onBack={onBack}
      selectedToken={{ type: 'native', symbol: nativeSymbol }}
    >
      {!signedTx && !txSignature ? (
        <>
          <div className="form-group">
            <label>Recipient (Solana address)</label>
            <div className="to-address-input-wrap">
              <input
                type="text"
                value={toAddress}
                onChange={(e) => {
                  setToAddress(e.target.value)
                  setAddressError('')
                }}
                onBlur={handleAddressBlur}
                placeholder="Base58 address..."
                className="input-field to-address-input"
              />
              <button
                type="button"
                className="to-address-wallet-btn"
                onClick={() => setShowOwnWalletSheet(true)}
                aria-label="Select from my wallets"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h5.5A1.75 1.75 0 0 1 12 6.75v10.5A1.75 1.75 0 0 0 10.25 19h-5.5A1.75 1.75 0 0 1 3 17.25z" />
                  <path d="M21 6.75A1.75 1.75 0 0 0 19.25 5h-5.5A1.75 1.75 0 0 0 12 6.75v10.5A1.75 1.75 0 0 1 13.75 19h5.5A1.75 1.75 0 0 0 21 17.25z" />
                </svg>
              </button>
            </div>
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

          <div className="send-balance-bar">
            <div className="send-balance-bar__left">
              <span className="send-balance-bar__icon">
                <ChainIcon
                  icon={activeChain.icon}
                  symbol={nativeSymbol}
                  size={36}
                />
              </span>
              <div>
                <div className="send-balance-bar__label">Balance</div>
                <div className="send-balance-bar__value">
                  {availableAmount} {nativeSymbol}
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
              disabled={!toAddress || !amount || !!addressError}
              className="primary-btn"
            >
              Continue
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

      {showPreview && !signedTx && !txSignature && (
        <TransactionSheet variant="sheet">
          <SendConfirmPreview
            selectedToken={{ type: 'native', symbol: nativeSymbol }}
            amount={amount}
            chainName={activeChain.name}
            fromAddress={activeSolanaWallet.address}
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

      {showOwnWalletSheet && (
        <TransactionSheet variant="sheet">
          <div className="own-wallet-sheet">
            <div className="own-wallet-sheet__head">
              <h4>Select My Wallet Address</h4>
            </div>
            <div className="own-wallet-sheet__list">
              {selectableWallets.length === 0 ? (
                <div className="own-wallet-sheet__empty">
                  No selectable addresses (cannot send to current wallet
                  address)
                </div>
              ) : (
                selectableWallets.map((wallet) => (
                  <button
                    key={`${wallet.address}:${wallet.index}`}
                    type="button"
                    className={`own-wallet-sheet__item ${wallet.index === activeWalletIndex ? 'active' : ''}`}
                    onClick={() => {
                      setToAddress(wallet.address)
                      setAddressError('')
                      setShowOwnWalletSheet(false)
                    }}
                  >
                    <span className="own-wallet-sheet__item-title">
                      Wallet #{wallet.index + 1}
                    </span>
                    <span className="own-wallet-sheet__item-address">
                      {wallet.address.substring(0, 6)}…
                      {wallet.address.slice(-4)}
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              className="secondary-btn own-wallet-sheet__close"
              onClick={() => setShowOwnWalletSheet(false)}
            >
              Cancel
            </button>
          </div>
        </TransactionSheet>
      )}
    </SendFormLayout>
  )
}

export default SolanaSendForm
