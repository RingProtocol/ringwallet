import React from 'react';
import { getPrimaryRpcUrl } from '../../models/ChainType';
import EvmWalletService from '../../services/wallet/EvmWalletService';
import PasskeyService from '../../services/account/passkeyService';
import { useSendForm } from './useSendForm';
import SendFormFields from './SendFormFields';
import '../TransactionActions.css';
import { useI18n } from '../../i18n';
import { emitPendingTransaction } from '../../features/history/client';

interface EOASendFormProps {
  onClose: () => void;
}

const EOASendForm: React.FC<EOASendFormProps> = ({ onClose }) => {
  const { t } = useI18n()
  const {
    activeWallet,
    activeChainId,
    activeChain,
    user,
    toAddress,
    setToAddress,
    amount,
    setAmount,
    selectedToken,
    setSelectedToken,
    tokenOptions,
    amountLabel,
    tokenOpts,
    signedTx,
    setSignedTx,
    error,
    setError,
    isLoading,
    setIsLoading,
    broadcastHash,
    setBroadcastHash,
    isBroadcasting,
    setIsBroadcasting,
    resetForm,
    copyToClipboard,
  } = useSendForm();

  if (!activeWallet) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSign = async () => {
    setError('');
    setSignedTx(null);
    setBroadcastHash('');
    setIsLoading(true);
    try {
      if (user?.id) {
        const verified = await PasskeyService.verifyIdentity(user.id);
        if (!verified) {
          setError(t('txCanceledBiometricFailed'));
          return;
        }
      }

      const tx = await EvmWalletService.signTransaction(
        activeWallet.privateKey!,
        toAddress,
        amount,
        Number(activeChainId),
        getPrimaryRpcUrl(activeChain),
        tokenOpts,
      );
      setSignedTx(tx);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!signedTx || typeof signedTx !== 'string') return;
    setError('');
    setIsBroadcasting(true);
    try {
      const hash = await EvmWalletService.broadcastEOATransaction(signedTx, getPrimaryRpcUrl(activeChain));
      setBroadcastHash(hash);
      emitPendingTransaction({
        hash,
        from: activeWallet.address,
        to: toAddress,
        value: amount,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
        chainId: String(activeChain?.id ?? activeChainId),
        address: activeWallet.address,
      });
    } catch (e) {
      console.error(e);
      setError('Broadcast1 failed: ' + (e as Error).message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Send Transaction</h3>
        <div className="current-wallet-hint">
          From: Wallet #{activeWallet.index + 1} ({activeWallet.address.substring(0, 6)}...
          {activeWallet.address.substring(activeWallet.address.length - 4)})
        </div>

        <SendFormFields
          toAddress={toAddress}
          onToAddressChange={setToAddress}
          selectedToken={selectedToken}
          onTokenChange={setSelectedToken}
          tokenOptions={tokenOptions}
          amount={amount}
          onAmountChange={setAmount}
          amountLabel={amountLabel}
          nativeSymbol={activeChain?.symbol || 'ETH'}
        />

        {error && <div className="error-text">{error}</div>}

        <div className="modal-actions">
          <button
            onClick={handleSign}
            disabled={isLoading || !toAddress}
            className="primary-btn"
          >
            {isLoading ? 'Signing...' : 'Sign Transaction'}
          </button>
          <button onClick={handleClose} className="secondary-btn">
            Close
          </button>
        </div>

        {signedTx && typeof signedTx === 'string' && (
          <div className="signed-result">
            <h4>✅ Signed Successfully</h4>
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

            {broadcastHash && (
              <div className="broadcast-success">
                <h4>🎉 Transaction Submitted!</h4>
                <p>
                  Tx Hash:{' '}
                  <span className="hash-text">
                    {broadcastHash.substring(0, 10)}...
                    {broadcastHash.substring(broadcastHash.length - 8)}
                  </span>
                </p>
                <a
                  href={`${activeChain?.explorer || 'https://etherscan.io'}/tx/${broadcastHash}`}
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
  );
};

export default EOASendForm;
