import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WalletService, { type EIP7951Result } from '../services/walletService';
import { getTokenList, type TokenInfo } from '../utils/tokenStorage';
import './TransactionActions.css';

type SignedTx = string | EIP7951Result;

type SendTokenOption = { type: 'native'; symbol: string } | { type: 'erc20'; token: TokenInfo };

const TransactionActions: React.FC = () => {
  const { isLoggedIn, activeWallet, activeChainId, activeChain, user } = useAuth();
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<SendTokenOption>({ type: 'native', symbol: 'ETH' });

  const tokenOptions: SendTokenOption[] = useMemo(() => {
    const native: SendTokenOption = { type: 'native', symbol: activeChain?.symbol || 'ETH' };
    const imported = activeWallet && activeChain
      ? getTokenList(activeWallet.address, activeChain.id).map((t) => ({ type: 'erc20' as const, token: t }))
      : [];
    return [native, ...imported];
  }, [activeWallet?.address, activeChain?.id, activeChain?.symbol]);

  const amountLabel = selectedToken.type === 'native'
    ? `Amount (${selectedToken.symbol})`
    : `Amount (${selectedToken.token.symbol})`;

  useEffect(() => {
    if (selectedToken.type === 'erc20') {
      const found = tokenOptions.some(
        (o) => o.type === 'erc20' && o.token.address === selectedToken.token.address
      );
      if (!found) setSelectedToken({ type: 'native', symbol: activeChain?.symbol || 'ETH' });
    }
  }, [tokenOptions, activeChain?.symbol, selectedToken]);

  const [signedTx, setSignedTx] = useState<SignedTx | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastHash, setBroadcastHash] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  if (!isLoggedIn || !activeWallet) return null;

  const tokenOpts = selectedToken.type === 'erc20'
    ? { address: selectedToken.token.address, decimals: selectedToken.token.decimals }
    : undefined;

  const handleSign = async () => {
    setError('');
    setSignedTx(null);
    setBroadcastHash('');
    setIsLoading(true);
    try {
      if (activeWallet.credentialId || activeWallet.type === 'eip-7951') {
        const publicKey = user?.publicKey || null;
        const salt = activeWallet.index || 0;
        const factoryAddress = activeChain?.factoryAddress || null;

        const tx = await WalletService.signEIP7951Transaction(
          activeWallet.credentialId!,
          toAddress,
          amount,
          activeChainId,
          activeChain?.rpcUrl,
          activeWallet.address,
          factoryAddress,
          publicKey as Map<number, Uint8Array>,
          salt,
          tokenOpts
        );
        setSignedTx(tx);
      } else {
        const tx = await WalletService.signTransaction(
          activeWallet.privateKey!,
          toAddress,
          amount,
          activeChainId,
          activeChain?.rpcUrl,
          tokenOpts
        );
        setSignedTx(tx);
      }
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!signedTx) return;

    setError('');
    setIsBroadcasting(true);
    try {
      const isEIP7951 = typeof signedTx === 'object' && signedTx.type === 'eip-7951';
      const hash = isEIP7951
        ? await WalletService.broadcastTransaction(signedTx, activeChain?.rpcUrl, activeChain?.bundlerUrl, activeChain?.entryPoint)
        : await WalletService.broadcastTransaction(signedTx as string, activeChain?.rpcUrl);
      setBroadcastHash(hash);
    } catch (e) {
      console.error(e);
      setError('Broadcast failed: ' + (e as Error).message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const resetSendForm = () => {
    setToAddress('');
    setAmount('');
    setSelectedToken({ type: 'native', symbol: activeChain?.symbol || 'ETH' });
    setSignedTx(null);
    setBroadcastHash('');
    setError('');
    setShowSend(false);
  };

  const isEIP7951Tx = (tx: SignedTx): tx is EIP7951Result =>
    typeof tx === 'object' && tx.type === 'eip-7951';

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
              <label>Token:</label>
              <select
                value={selectedToken.type === 'native' ? 'native' : selectedToken.token.address}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'native') {
                    setSelectedToken({ type: 'native', symbol: activeChain?.symbol || 'ETH' });
                  } else {
                    const t = tokenOptions.find((o) => o.type === 'erc20' && o.token.address === v);
                    if (t && t.type === 'erc20') setSelectedToken(t);
                  }
                }}
                className="input-field token-select"
              >
                <option value="native">{activeChain?.symbol || 'ETH'} (Native)</option>
                {tokenOptions.filter((o) => o.type === 'erc20').map((o) => (
                  <option key={o.token.address} value={o.token.address}>
                    {o.token.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{amountLabel}:</label>
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

                {isEIP7951Tx(signedTx) ? (
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
                   <>
                     <textarea readOnly value={signedTx as string} rows={3} className="result-area" />
                     <div className="button-group">
                       <button onClick={() => copyToClipboard(signedTx as string)} className="copy-btn">
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

      {showReceive && (
        <div className="modal-overlay" onClick={() => setShowReceive(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Receive Address</h3>
            <div className="qr-placeholder">
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
