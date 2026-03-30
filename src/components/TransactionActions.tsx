import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { WalletType } from '../models/WalletType'
import {
  EOASendForm,
  SmartAccountSendForm,
  SolanaSendForm,
  BitcoinSendForm,
  ReceiveDialog,
} from './transaction'
import './TransactionActions.css'

const TransactionActions: React.FC = () => {
  const {
    isLoggedIn,
    activeWallet,
    activeAccount,
    isSolanaChain,
    isBitcoinChain,
  } = useAuth()
  const [showSend, setShowSend] = useState(false)
  const [showReceive, setShowReceive] = useState(false)

  if (!isLoggedIn) return null
  if (!activeAccount) return null

  const isSmartAccount =
    !isSolanaChain &&
    !isBitcoinChain &&
    activeWallet?.type === WalletType.SmartContract
  const receiveAddress = activeAccount.address

  const renderSendForm = () => {
    if (isBitcoinChain)
      return <BitcoinSendForm onClose={() => setShowSend(false)} />
    if (isSolanaChain)
      return <SolanaSendForm onClose={() => setShowSend(false)} />
    if (isSmartAccount)
      return <SmartAccountSendForm onClose={() => setShowSend(false)} />
    return <EOASendForm onClose={() => setShowSend(false)} />
  }

  return (
    <div className="transaction-actions-container">
      <div className="action-buttons">
        <button
          className="action-btn send-btn"
          onClick={() => setShowSend(true)}
        >
          📤 Send
        </button>
        <button
          className="action-btn receive-btn"
          onClick={() => setShowReceive(true)}
        >
          📥 Receive
        </button>
      </div>

      {showSend && renderSendForm()}

      {showReceive && (
        <ReceiveDialog
          address={receiveAddress}
          onClose={() => setShowReceive(false)}
        />
      )}
    </div>
  )
}

export default TransactionActions
