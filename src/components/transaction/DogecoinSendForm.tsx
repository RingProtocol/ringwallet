import React, { useState } from 'react'
import { chainToAccountAssetsNetwork } from '../../config/chains'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { getTokensForNetwork } from '../../models/ChainTokens'
import PasskeyService from '../../services/account/passkeyService'
import { DogecoinService } from '../../services/rpc/dogecoinService'
import { isValidDogecoinAddress } from '../../services/chainplugins/dogecoin/dogecoinPlugin'
import SendFormLayout from './SendFormLayout'
import SendConfirmPreview from './SendConfirmPreview'
import TransactionSheet from './TransactionSheet'
import ChainIcon from '../ChainIcon'
import '../QuickActionBar.css'
import { formatChainTokenBalance } from '../../features/balance/balanceManager'

interface DogecoinSendFormProps {
  onClose: () => void
  onBack?: () => void
}

const DogecoinSendForm: React.FC<DogecoinSendFormProps> = ({
  onClose,
  onBack,
}) => {
  const {
    activeDogecoinWallet,
    dogecoinWallets,
    activeWalletIndex,
    activeChain,
    user,
  } = useAuth()

  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [addressError, setAddressError] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [txId, setTxId] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showOwnWalletSheet, setShowOwnWalletSheet] = useState(false)

  if (!activeDogecoinWallet) return null
  const selectableWallets = dogecoinWallets.filter(
    (wallet) =>
      wallet.address.toLowerCase() !==
      activeDogecoinWallet.address.toLowerCase()
  )
  const network = chainToAccountAssetsNetwork(activeChain)
  const nativeToken = network
    ? (getTokensForNetwork(network) ?? []).find((t) => t.tokenAddress == null)
    : null
  const availableAmount = nativeToken
    ? formatChainTokenBalance(nativeToken, activeChain, 8)
    : '0'

  const isTestnet = activeChain.network === 'testnet'

  const handleClose = () => {
    setToAddress('')
    setAmount('')
    setAddressError('')
    setError('')
    setTxId('')
    onClose()
  }

  const validateAddress = (addr: string): boolean => {
    if (!isValidDogecoinAddress(addr, isTestnet)) {
      setAddressError(
        isTestnet
          ? 'Invalid Dogecoin testnet address (n-prefix expected)'
          : 'Invalid Dogecoin address (D-prefix expected)'
      )
      return false
    }
    setAddressError('')
    return true
  }

  const handleAddressBlur = () => {
    if (toAddress) validateAddress(toAddress)
  }

  const handleSend = async () => {
    setError('')
    setTxId('')

    if (!validateAddress(toAddress)) return

    const amountDoge = parseFloat(amount)
    if (isNaN(amountDoge) || amountDoge <= 0) {
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

      const service = new DogecoinService(
        getPrimaryRpcUrl(activeChain),
        isTestnet
      )
      const amountSats = DogecoinService.dogeToSats(amountDoge)

      setIsBroadcasting(true)
      const { txHex } = await service.buildAndSignTransaction({
        fromAddress: activeDogecoinWallet.address,
        toAddress,
        amountSats,
        masterSeed,
        addressIndex: activeDogecoinWallet.index,
      })

      const txid = await service.broadcast(txHex)
      setTxId(txid)
    } catch (e) {
      console.error(e)
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
      setIsBroadcasting(false)
    }
  }

  const explorerBase = activeChain.explorer || 'https://dogechain.info'
  const explorerUrl = `${explorerBase}/tx/${txId}`

  const walletHint = `From: ${activeDogecoinWallet.address.slice(0, 10)}...${activeDogecoinWallet.address.slice(-6)} (${activeChain.name})`

  return (
    <SendFormLayout
      title="Send"
      walletHint={walletHint}
      error={error}
      onBack={onBack}
      selectedToken={{ type: 'native', symbol: activeChain.symbol }}
    >
      {!txId ? (
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
                placeholder={isTestnet ? 'n...' : 'D...'}
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
            <label>Amount ({activeChain.symbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00000000"
              min="0"
              step="0.00000001"
              className="input-field"
            />
          </div>

          <div className="send-balance-bar">
            <div className="send-balance-bar__left">
              <span className="send-balance-bar__icon">
                <ChainIcon
                  icon={activeChain.icon}
                  symbol={activeChain.symbol}
                  size={36}
                />
              </span>
              <div>
                <div className="send-balance-bar__label">Balance</div>
                <div className="send-balance-bar__value">
                  {availableAmount} {activeChain.symbol}
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
      ) : (
        <div className="broadcast-success">
          <h4>Transaction Submitted!</h4>
          <p>
            TxID:{' '}
            <span className="hash-text">
              {txId.slice(0, 10)}...{txId.slice(-8)}
            </span>
          </p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="view-link"
          >
            View on Explorer
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
      )}

      {showPreview && !txId && (
        <TransactionSheet variant="sheet">
          <SendConfirmPreview
            selectedToken={{ type: 'native', symbol: activeChain.symbol }}
            amount={amount}
            chainName={activeChain.name}
            fromAddress={activeDogecoinWallet.address}
            toAddress={toAddress}
            onCancel={() => setShowPreview(false)}
            onConfirm={async () => {
              await handleSend()
              setShowPreview(false)
            }}
            isConfirming={isLoading || isBroadcasting}
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

export default DogecoinSendForm
