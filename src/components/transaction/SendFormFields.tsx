import React, { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { SendTokenOption } from './types'
import TransactionSheet from './TransactionSheet'
import { TESTID } from '../testids'

interface SendFormFieldsProps {
  toAddress: string
  onToAddressChange: (value: string) => void
  addressError?: string
  selectedToken: SendTokenOption
  onTokenChange: (value: SendTokenOption) => void
  tokenOptions: SendTokenOption[]
  hideTokenSelect?: boolean
  amount: string
  onAmountChange: (value: string) => void
  amountLabel: string
  nativeSymbol: string
}

function shortenAddress(address: string): string {
  if (!address) return ''
  return `${address.substring(0, 7)}…${address.substring(address.length - 5)}`
}

const SendFormFields: React.FC<SendFormFieldsProps> = ({
  toAddress,
  onToAddressChange,
  addressError,
  selectedToken,
  onTokenChange,
  tokenOptions,
  hideTokenSelect = false,
  amount,
  onAmountChange,
  amountLabel,
  nativeSymbol,
}) => {
  const {
    wallets,
    solanaWallets,
    bitcoinWallets,
    dogecoinWallets,
    activeAccount,
    isSolanaChain,
    isBitcoinChain,
    isDogecoinChain,
    activeWalletIndex,
  } = useAuth()
  const [showOwnWalletSheet, setShowOwnWalletSheet] = useState(false)

  const ownWallets = useMemo(() => {
    if (isBitcoinChain) return bitcoinWallets
    if (isDogecoinChain) return dogecoinWallets
    if (isSolanaChain) return solanaWallets
    return wallets
  }, [
    isBitcoinChain,
    isDogecoinChain,
    isSolanaChain,
    bitcoinWallets,
    dogecoinWallets,
    solanaWallets,
    wallets,
  ])
  const senderAddress = activeAccount?.address?.toLowerCase() ?? ''
  const selectableWallets = useMemo(
    () =>
      ownWallets.filter(
        (wallet) => wallet.address.toLowerCase() !== senderAddress
      ),
    [ownWallets, senderAddress]
  )
  const ownMatchedWallet = useMemo(() => {
    const target = toAddress.trim().toLowerCase()
    if (!target) return null
    return (
      ownWallets.find((wallet) => wallet.address.toLowerCase() === target) ??
      null
    )
  }, [ownWallets, toAddress])

  return (
    <>
      <div className="form-group">
        <label>To Address:</label>
        <div className="to-address-input-wrap">
          {ownMatchedWallet ? (
            <div className="input-field to-address-wallet-selected">
              <div className="to-address-wallet-selected__meta">
                <span className="to-address-wallet-selected__name">
                  Wallet #{ownMatchedWallet.index + 1}
                </span>
                <span className="to-address-wallet-selected__address">
                  {shortenAddress(ownMatchedWallet.address)}
                </span>
              </div>
              <button
                type="button"
                className="to-address-wallet-clear-btn"
                onClick={() => onToAddressChange('')}
                aria-label="Clear selected wallet"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => onToAddressChange(e.target.value)}
                placeholder="Enter or paste address"
                className="input-field to-address-input"
                aria-invalid={addressError ? 'true' : undefined}
                data-testid={TESTID.SEND_TO_INPUT}
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
            </>
          )}
        </div>
        {addressError && <div className="field-error">{addressError}</div>}
      </div>
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
                selectableWallets.map((wallet) => {
                  const isActive = wallet.index === activeWalletIndex
                  return (
                    <button
                      key={`${wallet.address}:${wallet.index}`}
                      type="button"
                      className={`own-wallet-sheet__item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onToAddressChange(wallet.address)
                        setShowOwnWalletSheet(false)
                      }}
                    >
                      <span className="own-wallet-sheet__item-title">
                        Wallet #{wallet.index + 1}
                      </span>
                      <span className="own-wallet-sheet__item-address">
                        {shortenAddress(wallet.address)}
                      </span>
                    </button>
                  )
                })
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
      {!hideTokenSelect && (
        <div className="form-group">
          <label>Token:</label>
          <select
            value={
              selectedToken.type === 'native'
                ? 'native'
                : selectedToken.token.address
            }
            data-testid={TESTID.SEND_TOKEN_SELECT}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'native') {
                onTokenChange({ type: 'native', symbol: nativeSymbol })
              } else {
                const t = tokenOptions.find(
                  (o) => o.type === 'erc20' && o.token.address === v
                )
                if (t && t.type === 'erc20') onTokenChange(t)
              }
            }}
            className="input-field token-select"
          >
            <option value="native">{nativeSymbol} (Native)</option>
            {tokenOptions
              .filter((o) => o.type === 'erc20')
              .map((o) => (
                <option key={o.token.address} value={o.token.address}>
                  {o.token.symbol}
                </option>
              ))}
          </select>
        </div>
      )}
      <div className="form-group">
        <label>{amountLabel}:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.0"
          className="input-field"
          data-testid={TESTID.SEND_AMOUNT_INPUT}
        />
      </div>
    </>
  )
}

export default SendFormFields
