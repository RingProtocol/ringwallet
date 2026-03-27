import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PasskeyService from '../../services/passkeyService';
import { BitcoinService, bitcoinForkForChain } from '../../services/bitcoinService';
import { BitcoinKeyService } from '../../services/bitcoinKeyService';
import '../TransactionActions.css';

interface BitcoinSendFormProps {
  onClose: () => void;
}

const FEE_TARGETS = [
  { label: 'Fast (~1 block)', blocks: 1 },
  { label: 'Medium (~3 blocks)', blocks: 3 },
  { label: 'Slow (~6 blocks)', blocks: 6 },
] as const;

const BitcoinSendForm: React.FC<BitcoinSendFormProps> = ({ onClose }) => {
  const { activeBitcoinWallet, activeChain, user } = useAuth();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [addressError, setAddressError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txId, setTxId] = useState('');
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [feeTarget, setFeeTarget] = useState(3);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  if (!activeBitcoinWallet) return null;

  const isTestnet = activeChain.network === 'testnet';

  const handleClose = () => {
    setToAddress('');
    setAmount('');
    setAddressError('');
    setError('');
    setTxId('');
    setEstimatedFee(null);
    onClose();
  };

  const validateAddress = (addr: string): boolean => {
    if (!BitcoinKeyService.isValidAddress(addr)) {
      setAddressError('Invalid Bitcoin address (only bc1q / tb1q supported)');
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
    const amountBtc = parseFloat(amount);
    if (isNaN(amountBtc) || amountBtc <= 0) return;

    try {
      const service = new BitcoinService(activeChain.rpcUrl, isTestnet, bitcoinForkForChain(activeChain));
      const amountSats = BitcoinService.btcToSats(amountBtc);
      const { feeSats, feeRate } = await service.estimateFeeSats(
        activeBitcoinWallet.address,
        amountSats,
        feeTarget,
      );
      setEstimatedFee(
        `~${BitcoinService.satsToBtc(feeSats)} BTC (${feeSats} sats, ${feeRate.toFixed(1)} sat/vB)`,
      );
    } catch {
      setEstimatedFee(null);
    }
  };

  const handleSend = async () => {
    setError('');
    setTxId('');

    if (!validateAddress(toAddress)) return;

    const amountBtc = parseFloat(amount);
    if (isNaN(amountBtc) || amountBtc <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      if (user?.id) {
        const verified = await PasskeyService.verifyIdentity(user.id);
        if (!verified) {
          setError('Biometric verification failed, transaction cancelled');
          return;
        }
      }

      const seed = user?.masterSeed;
      if (!seed) throw new Error('No master seed available');
      const masterSeed = seed instanceof Uint8Array
        ? seed
        : new Uint8Array(Object.values(seed as unknown as Record<string, number>));

      const service = new BitcoinService(activeChain.rpcUrl, isTestnet, bitcoinForkForChain(activeChain));
      const amountSats = BitcoinService.btcToSats(amountBtc);

      setIsBroadcasting(true);
      const { txHex, fee } = await service.buildAndSignTransaction({
        fromAddress: activeBitcoinWallet.address,
        toAddress,
        amountSats,
        masterSeed,
        addressIndex: activeBitcoinWallet.index,
        feeRate: undefined,
      });

      const txid = await service.broadcast(txHex);
      setTxId(txid);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
      setIsBroadcasting(false);
    }
  };

  const explorerBase = activeChain.explorer || 'https://mempool.space';
  const explorerUrl = `${explorerBase}/tx/${txId}`;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Send {activeChain.symbol}</h3>
        <div className="current-wallet-hint">
          From: {activeBitcoinWallet.address.slice(0, 10)}...
          {activeBitcoinWallet.address.slice(-6)} ({activeChain.name})
        </div>

        {!txId ? (
          <>
            <div className="form-field">
              <label>Recipient (Bitcoin address)</label>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => { setToAddress(e.target.value); setAddressError(''); }}
                onBlur={handleAddressBlur}
                placeholder={isTestnet ? 'tb1q...' : 'bc1q...'}
                className="form-input"
              />
              {addressError && <div className="field-error">{addressError}</div>}
            </div>

            <div className="form-field">
              <label>Amount ({activeChain.symbol})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={handleEstimateFee}
                placeholder="0.00000000"
                min="0"
                step="0.00000001"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label>Fee priority</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {FEE_TARGETS.map((ft) => (
                  <button
                    key={ft.blocks}
                    type="button"
                    className={`secondary-btn ${feeTarget === ft.blocks ? 'active' : ''}`}
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      padding: '6px 4px',
                      background: feeTarget === ft.blocks ? '#3b82f6' : undefined,
                      color: feeTarget === ft.blocks ? '#fff' : undefined,
                    }}
                    onClick={() => { setFeeTarget(ft.blocks); handleEstimateFee(); }}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
              {estimatedFee && (
                <div className="fee-hint">Estimated fee: {estimatedFee}</div>
              )}
            </div>

            {error && <div className="error-text">{error}</div>}

            <div className="modal-actions">
              <button
                onClick={handleSend}
                disabled={isLoading || !toAddress || !amount || !!addressError}
                className="primary-btn"
              >
                {isBroadcasting ? 'Broadcasting...' : isLoading ? 'Signing...' : 'Sign & Send'}
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
                onClick={() => navigator.clipboard.writeText(txId).then(() => alert('Copied!'))}
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
      </div>
    </div>
  );
};

export default BitcoinSendForm;
