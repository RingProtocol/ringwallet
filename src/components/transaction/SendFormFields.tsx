import React from 'react';
import type { SendTokenOption } from './types';

interface SendFormFieldsProps {
  toAddress: string;
  onToAddressChange: (value: string) => void;
  selectedToken: SendTokenOption;
  onTokenChange: (value: SendTokenOption) => void;
  tokenOptions: SendTokenOption[];
  amount: string;
  onAmountChange: (value: string) => void;
  amountLabel: string;
  nativeSymbol: string;
}

const SendFormFields: React.FC<SendFormFieldsProps> = ({
  toAddress,
  onToAddressChange,
  selectedToken,
  onTokenChange,
  tokenOptions,
  amount,
  onAmountChange,
  amountLabel,
  nativeSymbol,
}) => (
  <>
    <div className="form-group">
      <label>To Address:</label>
      <input
        type="text"
        value={toAddress}
        onChange={(e) => onToAddressChange(e.target.value)}
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
            onTokenChange({ type: 'native', symbol: nativeSymbol });
          } else {
            const t = tokenOptions.find((o) => o.type === 'erc20' && o.token.address === v);
            if (t && t.type === 'erc20') onTokenChange(t);
          }
        }}
        className="input-field token-select"
      >
        <option value="native">{nativeSymbol} (Native)</option>
        {tokenOptions
          .filter((o) => o.type === 'erc20')
          .map((o) => (
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
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="0.0"
        className="input-field"
      />
    </div>
  </>
);

export default SendFormFields;
