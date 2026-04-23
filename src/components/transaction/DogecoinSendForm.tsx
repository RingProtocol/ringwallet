import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import PasskeyService from '../../services/account/passkeyService'
import { DogecoinService } from '../../services/rpc/dogecoinService'
import { isValidDogecoinAddress } from '../../services/chainplugins/dogecoin/dogecoinPlugin'
import SendFormLayout from './SendFormLayout'
import '../QuickActionBar.css'

interface DogecoinSendFormProps {
  onClose: () => void
}

const DogecoinSendForm: React.FC<DogecoinSendFormProps> = ({ onClose }) => {
  const { activeDogecoinWallet, activeChain, user } = useAuth()

  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [addressError, setAddressError] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [txId, setTxId] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  if (!activeDogecoinWallet) return null

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
      title={`Send ${activeChain.symbol}`}
      walletHint={walletHint}
      error={error}
    >
      {!txId ? (
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
              placeholder={isTestnet ? 'n...' : 'D...'}
              className="input-field"
            />
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

          <div className="modal-actions">
            <button
              onClick={handleSend}
              disabled={isLoading || !toAddress || !amount || !!addressError}
              className="primary-btn"
            >
              {isBroadcasting
                ? 'Broadcasting...'
                : isLoading
                  ? 'Signing...'
                  : 'Sign & Send'}
            </button>
            <button onClick={handleClose} className="secondary-btn">
              Close
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
    </SendFormLayout>
  )
}

export default DogecoinSendForm
