import React from 'react'
import TransactionSheet from './TransactionSheet'

interface SendFormLayoutProps {
  title: string
  walletHint: string
  error?: string
  children: React.ReactNode
}

const SendFormLayout: React.FC<SendFormLayoutProps> = ({
  title,
  walletHint,
  error,
  children,
}) => (
  <TransactionSheet>
    <h3>{title}</h3>
    <div className="current-wallet-hint">{walletHint}</div>
    {children}
    {error && <div className="error-text">{error}</div>}
  </TransactionSheet>
)

export default SendFormLayout
