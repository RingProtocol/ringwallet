import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../contexts/AuthContext';
import WalletService from '../services/walletService';
import './TransactionActions.css';

const TransactionActions = () => {
  const { isLoggedIn, activeWallet, activeChainId, activeChain, user } = useAuth();
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  
  // Send state
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [signedTx, setSignedTx] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastHash, setBroadcastHash] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  if (!isLoggedIn || !activeWallet) return null;

  const handleSign = async () => {
    setError('');
    setSignedTx('');
    setBroadcastHash('');
    setIsLoading(true);
    try {
      console.log("before sign:", activeWallet.credentialId);
      console.log("activeWallet.type:", activeWallet.type);
      console.log("activeChainId:", activeChainId);
      console.log("activeChain:", activeChain);
      console.log("amount:", amount);
      if (activeWallet.credentialId || activeWallet.type === 'eip-7951') {
        // Get publicKey and salt for initCode generation if needed
        const publicKey = user?.publicKey || null;
        const salt = activeWallet.index || 0;
        const factoryAddress = activeChain?.factoryAddress || null;

        const tx = await WalletService.signEIP7951Transaction(
          activeWallet.credentialId,
          toAddress,
          amount,
          activeChainId,
          activeChain?.rpcUrl,
          activeWallet.address,
          factoryAddress,
          publicKey,
          salt
        );
        setSignedTx(tx);
      } else {
        const tx = await WalletService.signTransaction(activeWallet.privateKey, toAddress, amount, activeChainId, activeChain?.rpcUrl);
        setSignedTx(tx);
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!signedTx) return;
    
    setError('');
    setIsBroadcasting(true);
    try {
      const hash = typeof signedTx === 'object' && signedTx.type === 'eip-7951'
        ? await WalletService.broadcastTransaction(signedTx, activeChain?.rpcUrl, activeChain?.bundlerUrl, activeChain?.entryPoint)
        : await WalletService.broadcastTransaction(signedTx, activeChain?.rpcUrl);
      setBroadcastHash(hash);
    } catch (e) {
      console.error(e);
      setError('Broadcast failed: ' + e.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const resetSendForm = () => {
    setToAddress('');
    setAmount('');
    setSignedTx('');
    setBroadcastHash('');
    setError('');
    setShowSend(false);
  };

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

      {/* Send Modal */}
      {showSend && (
        <div className="modal-overlay" onClick={resetSendForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Send Transaction</h3>
            <div className="current-wallet-hint">
              From: Wallet #{activeWallet.index + 1} ({activeWallet.address.substring(0, 6)}...{activeWallet.address.substring(activeWallet.address.length - 4)})
            </div>
            
            <div className="form-group">
              <label>To Address:</label>
              <input 
                type="text" 
                value={toAddress} 
                onChange={e => setToAddress(e.target.value)} 
                placeholder="0x..." 
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label>Amount (ETH):</label>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                placeholder="0.0" 
                className="input-field"
              />
            </div>
            
            {error && <div className="error-text">{error}</div>}
            
            <div className="modal-actions">
               <button 
                 onClick={handleSign} 
                 disabled={isLoading || !toAddress}
                 className="primary-btn"
               >
                 {isLoading ? 'Signing...' : 'Sign Transaction'}
               </button>
               <button onClick={resetSendForm} className="secondary-btn">Close</button>
            </div>

            {signedTx && (
              <div className="signed-result">
                <h4>✅ Signed Successfully</h4>
                
                {/* EIP-7951 展示优化 */}
                {typeof signedTx === 'object' && signedTx.type === 'eip-7951' ? (
                   <>
                    {!signedTx.isDeployed && (
                      <div className="warning-banner" style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '12px' }}>
                        ⚠️ Account not deployed yet. {signedTx.userOp?.initCode && signedTx.userOp.initCode !== '0x' ? 'Will be deployed on first transaction.' : 'Factory address not configured. Please configure VITE_FACTORY_* environment variables.'}
                      </div>
                    )}
                     <div className="result-area" style={{fontSize: '12px', whiteSpace: 'pre-wrap'}}>
                       {signedTx.display}
                     </div>
                     <div className="button-group">
                       <button onClick={() => copyToClipboard(JSON.stringify(signedTx, null, 2))} className="copy-btn">
                         Copy JSON
                       </button>
                       {!broadcastHash && (
                         <button 
                           onClick={handleBroadcast} 
                           className="primary-btn broadcast-btn"
                          disabled={isBroadcasting || (!signedTx.isDeployed && (!signedTx.userOp?.initCode || signedTx.userOp.initCode === '0x'))}
                         >
                           {isBroadcasting ? 'Broadcasting...' : '🚀 Broadcast UserOp'}
                         </button>
                       )}
                     </div>
                   </>
                ) : (
                   /* 传统 EOA 展示 */
                   <>
                     <textarea readOnly value={signedTx} rows={3} className="result-area" />
                     <div className="button-group">
                       <button onClick={() => copyToClipboard(signedTx)} className="copy-btn">
                         Copy Hex
                       </button>
                       {!broadcastHash && (
                         <button 
                           onClick={handleBroadcast} 
                           className="primary-btn broadcast-btn"
                           disabled={isBroadcasting}
                         >
                           {isBroadcasting ? 'Broadcasting...' : '🚀 Broadcast Transaction'}
                         </button>
                       )}
                     </div>
                   </>
                )}

                {/* 广播结果展示 */}
                {broadcastHash && (
                  <div className="broadcast-success">
                    <h4>🎉 Transaction Submitted!</h4>
                    <p>Tx Hash: <span className="hash-text">{broadcastHash.substring(0, 10)}...{broadcastHash.substring(broadcastHash.length - 8)}</span></p>
                    <a 
                      href={`${(activeChain && activeChain.explorer) ? activeChain.explorer : 'https://etherscan.io'}/tx/${broadcastHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="view-link"
                    >
                      View on Explorer ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div className="modal-overlay" onClick={() => setShowReceive(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Receive Address</h3>
            <div className="qr-placeholder">
              {/* 简单模拟 QR Code 区域 */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${activeWallet.address}`} 
                alt="Wallet Address QR" 
                style={{ borderRadius: '8px' }}
              />
            </div>
            <p className="address-display">{activeWallet.address}</p>
            <div className="modal-actions">
              <button onClick={() => copyToClipboard(activeWallet.address)} className="primary-btn">
                Copy Address
              </button>
              <button onClick={() => setShowReceive(false)} className="secondary-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionActions;
