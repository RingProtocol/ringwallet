import React from 'react';
import '../TransactionActions.css';

interface ReceiveDialogProps {
  address: string;
  onClose: () => void;
}

const ReceiveDialog: React.FC<ReceiveDialogProps> = ({ address, onClose }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    alert('已复制到剪贴板');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Receive Address</h3>
        <div className="qr-placeholder">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`}
            alt="Wallet Address QR"
            style={{ borderRadius: '8px' }}
          />
        </div>
        <p className="address-display">{address}</p>
        <div className="modal-actions">
          <button onClick={copyToClipboard} className="primary-btn">
            Copy Address
          </button>
          <button onClick={onClose} className="secondary-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveDialog;
