import React, { useState, useMemo } from 'react'
import * as bitcoin from 'bitcoinjs-lib'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import PasskeyService from '../../services/account/passkeyService'
import {
  BitcoinService,
  bitcoinForkForChain,
} from '../../services/rpc/bitcoinService'
import { BitcoinKeyService } from '../../services/chainplugins/bitcoin/bitcoinPlugin'
import SendFormLayout from './SendFormLayout'
import SignedTxResult from './SignedTxResult'
import '../QuickActionBar.css'
import { useI18n } from '../../i18n'
import { decodeBitcoinTx, buildBitcoinRows } from '../../utils/bitcoinTxDecoder'

interface BitcoinSendFormProps {
  onClose: () => void
}

interface SignedBitcoinTx {
  txHex: string
  fee: number
}

const FEE_TARGETS = [
  { label: 'Fast (~1 block)', blocks: 1 },
  { label: 'Medium (~3 blocks)', blocks: 3 },
  { label: 'Slow (~6 blocks)', blocks: 6 },
] as const

const BitcoinSendForm: React.FC<BitcoinSendFormProps> = ({ onClose }) => {
  const { activeBitcoinWallet, activeChain, user } = useAuth()
  const { t } = useI18n()

  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [addressError, setAddressError] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signedTx, setSignedTx] = useState<SignedBitcoinTx | null>(null)
  const [txId, setTxId] = useState('')
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null)
  const [feeTarget, setFeeTarget] = useState(3)
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const isTestnet = activeChain?.network === 'testnet'
  const nativeSymbol = activeChain?.symbol || 'BTC'
  const btcNetwork = isTestnet
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin

  const btcRows = useMemo(() => {
    if (!signedTx || !activeBitcoinWallet) return []
    const decoded = decodeBitcoinTx(
      signedTx.txHex,
      activeBitcoinWallet.address,
      signedTx.fee,
      btcNetwork
    )
    if (!decoded) return []
    return buildBitcoinRows(decoded, nativeSymbol, t as (key: string) => string)
  }, [signedTx, activeBitcoinWallet, nativeSymbol, btcNetwork, t])

  if (!activeBitcoinWallet) return null

  const handleClose = () => {
    setToAddress('')
    setAmount('')
    setAddressError('')
    setError('')
    setSignedTx(null)
    setTxId('')
    setEstimatedFee(null)
    onClose()
  }

  const validateAddress = (addr: string): boolean => {
    if (!BitcoinKeyService.isValidAddress(addr)) {
      setAddressError('Invalid Bitcoin address (only bc1q / tb1q supported)')
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
    const amountBtc = parseFloat(amount)
    if (isNaN(amountBtc) || amountBtc <= 0) return

    try {
      const service = new BitcoinService(
        getPrimaryRpcUrl(activeChain),
        isTestnet,
        bitcoinForkForChain(activeChain)
      )
      const amountSats = BitcoinService.btcToSats(amountBtc)
      const { feeSats, feeRate } = await service.estimateFeeSats(
        activeBitcoinWallet.address,
        amountSats,
        feeTarget
      )
      setEstimatedFee(
        `~${BitcoinService.satsToBtc(feeSats)} BTC (${feeSats} sats, ${feeRate.toFixed(1)} sat/vB)`
      )
    } catch {
      setEstimatedFee(null)
    }
  }

  const handleSign = async () => {
    setError('')
    setSignedTx(null)
    setTxId('')

    if (!validateAddress(toAddress)) return

    const amountBtc = parseFloat(amount)
    if (isNaN(amountBtc) || amountBtc <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setIsLoading(true)
    try {
      if (user?.id) {
        const verified = await PasskeyService.verifyIdentity(user.id)
        if (!verified) {
          setError('Biometric verification failed, transaction cancelled')
          return
        }
      }

      const seed = user?.masterSeed
      if (!seed) throw new Error('No master seed available')
      const masterSeed =
        seed instanceof Uint8Array
          ? seed
          : new Uint8Array(
              Object.values(seed as unknown as Record<string, number>)
            )

      const service = new BitcoinService(
        getPrimaryRpcUrl(activeChain),
        isTestnet,
        bitcoinForkForChain(activeChain)
      )
      const amountSats = BitcoinService.btcToSats(amountBtc)

      const result = await service.buildAndSignTransaction({
        fromAddress: activeBitcoinWallet.address,
        toAddress,
        amountSats,
        masterSeed,
        addressIndex: activeBitcoinWallet.index,
        feeRate: undefined,
      })

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
      const service = new BitcoinService(
        getPrimaryRpcUrl(activeChain),
        isTestnet,
        bitcoinForkForChain(activeChain)
      )
      const txid = await service.broadcast(signedTx.txHex)
      setTxId(txid)
    } catch (e) {
      console.error(e)
      setError((e as Error).message)
    } finally {
      setIsBroadcasting(false)
    }
  }

  const explorerBase = activeChain?.explorer || 'https://mempool.space'
  const walletHint = `From: ${activeBitcoinWallet.address.slice(0, 10)}...${activeBitcoinWallet.address.slice(-6)} (${activeChain.name})`

  return (
    <SendFormLayout
      title={`Send ${nativeSymbol}`}
      walletHint={walletHint}
      error={error}
    >
      {!signedTx && !txId ? (
        <>
          <div className="form-group">
            <label>Recipient</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => {
                setToAddress(e.target.value)
                setAddressError('')
              }}
              onBlur={handleAddressBlur}
              placeholder={isTestnet ? 'tb1q...' : 'bc1q...'}
              className="input-field"
            />
            {addressError && <div className="field-error">{addressError}</div>}
          </div>

          <div className="form-group">
            <label>Amount ({nativeSymbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={handleEstimateFee}
              placeholder="0.00000000"
              min="0"
              step="0.00000001"
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label>Fee priority</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {FEE_TARGETS.map((ft) => (
                <button
                  key={ft.blocks}
                  type="button"
                  className={`secondary-btn ${feeTarget === ft.blocks ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    padding: '6px 4px',
                    background: feeTarget === ft.blocks ? '#3b82f6' : undefined,
                    color: feeTarget === ft.blocks ? '#fff' : undefined,
                  }}
                  onClick={() => {
                    setFeeTarget(ft.blocks)
                    handleEstimateFee()
                  }}
                >
                  {ft.label}
                </button>
              ))}
            </div>
            {estimatedFee && (
              <div className="fee-hint">Estimated fee: {estimatedFee}</div>
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
      ) : txId ? (
        <div className="broadcast-success">
          <h4>{t('txSubmitted')}</h4>
          <p>
            TxID:{' '}
            <span className="hash-text">
              {txId.slice(0, 10)}...{txId.slice(-8)}
            </span>
          </p>
          <a
            href={`${explorerBase}/tx/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-link"
          >
            View on Explorer ↗
          </a>
          <div className="modal-actions">
            <button
              onClick={() =>
                navigator.clipboard.writeText(txId).then(() => alert('Copied!'))
              }
              className="copy-btn"
            >
              Copy TxID
            </button>
            <button onClick={handleClose} className="secondary-btn">
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <SignedTxResult
            rows={btcRows}
            rawData={signedTx!.txHex}
            rawFormat="hex"
            broadcastHash=""
            isBroadcasting={isBroadcasting}
            explorerUrl={explorerBase}
            hashLabel="TxID"
            onCopy={() =>
              navigator.clipboard
                .writeText(signedTx!.txHex)
                .then(() => alert('Copied!'))
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

export default BitcoinSendForm
