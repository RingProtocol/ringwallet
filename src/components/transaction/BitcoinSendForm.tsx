import React, { useState, useMemo } from 'react'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import * as bitcoin from 'bitcoinjs-lib'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { getTokensForNetwork } from '../../models/ChainTokens'
import PasskeyService from '../../services/account/passkeyService'
import {
  BitcoinService,
  bitcoinForkForChain,
} from '../../services/rpc/bitcoinService'
import { BitcoinKeyService } from '../../services/chainplugins/bitcoin/bitcoinPlugin'
import SendFormLayout from './SendFormLayout'
import SignedTxResult from './SignedTxResult'
import SendConfirmPreview from './SendConfirmPreview'
import TransactionSheet from './TransactionSheet'
import ChainIcon from '../ChainIcon'
import '../QuickActionBar.css'
import { useI18n } from '../../i18n'
import { decodeBitcoinTx, buildBitcoinRows } from '../../utils/bitcoinTxDecoder'
import { formatChainTokenBalance } from '../../features/balance/balanceManager'

interface BitcoinSendFormProps {
  onClose: () => void
  onBack?: () => void
}

interface SignedBitcoinTx {
  txHex: string
  fee: number
}

const FEE_TARGETS = [
  { label: 'Fast', hint: '~1 block', icon: '🚀', blocks: 1 },
  { label: 'Medium', hint: '~3 blocks', icon: '🐇', blocks: 3 },
  { label: 'Slow', hint: '~6 blocks', icon: '🐢', blocks: 6 },
] as const

const BitcoinSendForm: React.FC<BitcoinSendFormProps> = ({
  onClose,
  onBack,
}) => {
  const {
    activeBitcoinWallet,
    bitcoinWallets,
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
  const [signedTx, setSignedTx] = useState<SignedBitcoinTx | null>(null)
  const [txId, setTxId] = useState('')
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null)
  const [feeTarget, setFeeTarget] = useState(3)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showOwnWalletSheet, setShowOwnWalletSheet] = useState(false)

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
  const availableAmount = useMemo(() => {
    const network = chainToAccountAssetsNetwork(activeChain)
    if (!network) return '0'
    const tokens = getTokensForNetwork(network) ?? []
    const native = tokens.find((t) => t.tokenAddress == null)
    if (!native) return '0'
    return formatChainTokenBalance(native, activeChain, 8)
  }, [activeChain])

  if (!activeBitcoinWallet) return null
  const selectableWallets = bitcoinWallets.filter(
    (wallet) =>
      wallet.address.toLowerCase() !== activeBitcoinWallet.address.toLowerCase()
  )

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
      title="Send"
      walletHint={walletHint}
      error={error}
      onBack={onBack}
      selectedToken={{ type: 'native', symbol: nativeSymbol }}
    >
      {!signedTx && !txId ? (
        <>
          <div className="form-group">
            <label>Recipient</label>
            <div className="to-address-input-wrap">
              <input
                type="text"
                value={toAddress}
                onChange={(e) => {
                  setToAddress(e.target.value)
                  setAddressError('')
                }}
                onBlur={handleAddressBlur}
                placeholder={isTestnet ? 'tb1q...' : 'bc1q...'}
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
            <div className="fee-priority-group">
              {FEE_TARGETS.map((ft) => (
                <button
                  key={ft.blocks}
                  type="button"
                  className={`fee-priority-btn ${feeTarget === ft.blocks ? 'active' : ''}`}
                  onClick={() => {
                    setFeeTarget(ft.blocks)
                    handleEstimateFee()
                  }}
                >
                  <span className="fee-priority-btn__icon">{ft.icon}</span>
                  <span className="fee-priority-btn__label">{ft.label}</span>
                  <span className="fee-priority-btn__hint">{ft.hint}</span>
                </button>
              ))}
            </div>
            {estimatedFee && (
              <div className="fee-hint">Estimated fee: {estimatedFee}</div>
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

      {showPreview && !signedTx && !txId && (
        <TransactionSheet variant="sheet">
          <SendConfirmPreview
            selectedToken={{ type: 'native', symbol: nativeSymbol }}
            amount={amount}
            chainName={activeChain.name}
            fromAddress={activeBitcoinWallet.address}
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

export default BitcoinSendForm
