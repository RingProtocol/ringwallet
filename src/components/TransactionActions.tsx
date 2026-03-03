import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WalletType } from '../models/WalletType';
import { EOASendForm, SmartAccountSendForm, ReceiveDialog } from './transaction';
import './TransactionActions.css';

const TransactionActions: React.FC = () => {
  const { isLoggedIn, activeWallet } = useAuth();
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  if (!isLoggedIn || !activeWallet) return null;

  const isSmartAccount = activeWallet.type === WalletType.SmartContract;

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

      {showSend &&
        (isSmartAccount ? (
          <SmartAccountSendForm onClose={() => setShowSend(false)} />
        ) : (
          <EOASendForm onClose={() => setShowSend(false)} />
        ))}

      {showReceive && (
        <ReceiveDialog
          address={activeWallet.address}
          onClose={() => setShowReceive(false)}
        />
      )}
    </div>
  );
};

export default TransactionActions;
