import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WalletType } from '../models/WalletType';
import { EOASendForm, SmartAccountSendForm, SolanaSendForm, ReceiveDialog } from './transaction';
import './TransactionActions.css';

const TransactionActions: React.FC = () => {
  const { isLoggedIn, activeWallet, activeSolanaWallet, isSolanaChain } = useAuth();
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  if (!isLoggedIn) return null;
  if (isSolanaChain && !activeSolanaWallet) return null;
  if (!isSolanaChain && !activeWallet) return null;

  const isSmartAccount = !isSolanaChain && activeWallet?.type === WalletType.SmartContract;
  const receiveAddress = isSolanaChain
    ? (activeSolanaWallet?.address ?? '')
    : (activeWallet?.address ?? '');

  return (
    <div className="transaction-actions-container">
      <div className="action-buttons">
        <button className="action-btn send-btn" onClick={() => setShowSend(true)}>
          📤 Send
        </button>
        <button className="action-btn receive-btn" onClick={() => setShowReceive(true)}>
          📥 Receive
        </button>
      </div>

      {showSend && (
        isSolanaChain ? (
          <SolanaSendForm onClose={() => setShowSend(false)} />
        ) : isSmartAccount ? (
          <SmartAccountSendForm onClose={() => setShowSend(false)} />
        ) : (
          <EOASendForm onClose={() => setShowSend(false)} />
        )
      )}

      {showReceive && (
        <ReceiveDialog
          address={receiveAddress}
          onClose={() => setShowReceive(false)}
        />
      )}
    </div>
  );
};

export default TransactionActions;
