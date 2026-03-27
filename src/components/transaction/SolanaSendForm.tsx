import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PasskeyService from '../../services/passkeyService';
import { SolanaService } from '../../services/solanaService';
import { SolanaKeyService } from '../../services/solanaKeyService';
import '../TransactionActions.css';
import { useI18n } from '../../i18n';

interface SolanaSendFormProps {
  onClose: () => void;
}

const SolanaSendForm: React.FC<SolanaSendFormProps> = ({ onClose }) => {
  const { activeSolanaWallet, activeChain, user } = useAuth();
  const { t } = useI18n()

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [addressError, setAddressError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState('');
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);

  if (!activeSolanaWallet) return null;

  const handleClose = () => {
    setToAddress('');
    setAmount('');
    setAddressError('');
    setError('');
    setTxSignature('');
    setEstimatedFee(null);
    onClose();
  };

  const validateAddress = (addr: string): boolean => {
    if (!SolanaKeyService.isValidAddress(addr)) {
      setAddressError(t('invalidAddress'));
      return false;
    }
    setAddressError('');
    return true;
  };

  const handleAddressBlur = () => {
    if (toAddress) validateAddress(toAddress);
  };

  const handleEstimateFee = async () => {
    if (!toAddress || !amount || !validateAddress(toAddress)) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      const keypair = SolanaKeyService.keypairFromStoredKey(activeSolanaWallet.privateKey!);
      const service = new SolanaService(activeChain.rpcUrl);
      const fee = await service.estimateFee(keypair.publicKey, toAddress, amountNum);
      setEstimatedFee(fee.toFixed(6));
    } catch {
      setEstimatedFee(null);
    }
  };

  const handleSend = async () => {
    setError('');
    setTxSignature('');

    if (!validateAddress(toAddress)) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t('invalidAmount'));
      return;
    }

    setIsLoading(true);
    try {
      if (user?.id) {
        const verified = await PasskeyService.verifyIdentity(user.id);
        if (!verified) {
          setError(t('txCanceledBiometricFailed'));
          return;
        }
      }

      // Reconstruct Keypair from the in-memory private seed
      const keypair = SolanaKeyService.keypairFromStoredKey(activeSolanaWallet.privateKey!);
      const service = new SolanaService(activeChain.rpcUrl);
      const signature = await service.sendSOL(keypair, toAddress, amountNum);
      setTxSignature(signature);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const explorerBase = activeChain.explorer || 'https://solscan.io';
  const explorerUrl = `${explorerBase}/tx/${txSignature}`;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Send SOL</h3>
        <div className="current-wallet-hint">
          From: {activeSolanaWallet.address.slice(0, 6)}...
          {activeSolanaWallet.address.slice(-4)} ({activeChain.name})
        </div>

        {!txSignature ? (
          <>
            <div className="form-field">
              <label>Recipient (Solana address)</label>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => { setToAddress(e.target.value); setAddressError(''); }}
                onBlur={handleAddressBlur}
                placeholder="Base58 address..."
                className="form-input"
              />
              {addressError && <div className="field-error">{addressError}</div>}
            </div>

            <div className="form-field">
              <label>Amount (SOL)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={handleEstimateFee}
                placeholder="0.000000"
                min="0"
                step="0.000001"
                className="form-input"
              />
              {estimatedFee && (
                <div className="fee-hint">Estimated fee: ~{estimatedFee} SOL</div>
              )}
            </div>

            {error && <div className="error-text">{error}</div>}

            <div className="modal-actions">
              <button
                onClick={handleSend}
                disabled={isLoading || !toAddress || !amount || !!addressError}
                className="primary-btn"
              >
                {isLoading ? 'Sending...' : 'Sign & Send'}
              </button>
              <button onClick={handleClose} className="secondary-btn">
                Close
              </button>
            </div>
          </>
        ) : (
          <div className="broadcast-success">
            <h4>🎉 Transaction Submitted!</h4>
            <p>
              Signature:{' '}
              <span className="hash-text">
                {txSignature.slice(0, 10)}...{txSignature.slice(-8)}
              </span>
            </p>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="view-link"
            >
              View on Explorer ↗
            </a>
            <div className="modal-actions">
              <button
                onClick={() => navigator.clipboard.writeText(txSignature).then(() => alert(t('copied')))}
                className="copy-btn"
              >
                {t('copySignature')}
              </button>
              <button onClick={handleClose} className="secondary-btn">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolanaSendForm;
