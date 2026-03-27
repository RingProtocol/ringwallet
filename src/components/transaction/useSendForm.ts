import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTokenList } from '../../utils/tokenStorage';
import type { SignedTx, SendTokenOption } from './types';
import { useI18n } from '../../i18n';

export function useSendForm() {
  const { activeWallet, activeChainId, activeChain, user } = useAuth();
  const { t } = useI18n()

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<SendTokenOption>({
    type: 'native',
    symbol: activeChain?.symbol || 'ETH',
  });

  const tokenOptions: SendTokenOption[] = useMemo(() => {
    const native: SendTokenOption = { type: 'native', symbol: activeChain?.symbol || 'ETH' };
    const imported =
      activeWallet && activeChain
        ? getTokenList(activeWallet.address, activeChain.id).map(
            (t) => ({ type: 'erc20' as const, token: t }),
          )
        : [];
    return [native, ...imported];
  }, [activeWallet?.address, activeChain?.id, activeChain?.symbol]);

  const amountLabel =
    selectedToken.type === 'native'
      ? `Amount (${selectedToken.symbol})`
      : `Amount (${selectedToken.token.symbol})`;

  useEffect(() => {
    if (selectedToken.type === 'erc20') {
      const found = tokenOptions.some(
        (o) => o.type === 'erc20' && o.token.address === selectedToken.token.address,
      );
      if (!found) setSelectedToken({ type: 'native', symbol: activeChain?.symbol || 'ETH' });
    }
  }, [tokenOptions, activeChain?.symbol, selectedToken]);

  const [signedTx, setSignedTx] = useState<SignedTx | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastHash, setBroadcastHash] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const tokenOpts =
    selectedToken.type === 'erc20'
      ? { address: selectedToken.token.address, decimals: selectedToken.token.decimals }
      : undefined;

  const resetForm = () => {
    setToAddress('');
    setAmount('');
    setSelectedToken({ type: 'native', symbol: activeChain?.symbol || 'ETH' });
    setSignedTx(null);
    setBroadcastHash('');
    setError('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(t('copiedToClipboard'));
  };

  return {
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
  };
}
