import React, { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import {
  chainToAccountAssetsNetwork,
  NATIVE_COIN_ICON,
} from '../../config/chains'
import { getPrimaryRpcUrl } from '../../models/ChainType'
import { getTokensForNetwork } from '../../models/ChainTokens'
import EvmWalletService, {
  type EIP7951Result,
} from '../../services/chainplugins/evm/evmPlugin'
import { useSendForm } from './useSendForm'
import SendFormFields from './SendFormFields'
import SendFormLayout from './SendFormLayout'
import SignedTxResult, { type TxDisplayRow } from './SignedTxResult'
import SendConfirmPreview from './SendConfirmPreview'
import TransactionSheet from './TransactionSheet'
import type { SignedTx } from './types'
import '../QuickActionBar.css'
import { useI18n } from '../../i18n'
import { decodeUserOp } from '../../utils/userOpDecoder'
import { formatChainTokenBalance } from '../../features/balance/balanceManager'
import ChainIcon from '../ChainIcon'

interface SmartAccountSendFormProps {
  onClose: () => void
  onBack?: () => void
  initialToken?: import('./types').SendTokenOption
}

const isEIP7951Tx = (tx: SignedTx): tx is EIP7951Result =>
  typeof tx === 'object' && tx.type === 'eip-7951'

function buildUserOpRows(
  result: EIP7951Result,
  nativeSymbol: string,
  t: (key: string) => string
): TxDisplayRow[] {
  const decoded = decodeUserOp(result.userOp, result.isDeployed, nativeSymbol)
  if (!decoded) return []

  const rows: TxDisplayRow[] = [
    { label: t('txFieldSender'), value: decoded.sender, mono: true },
    { label: t('txFieldTo'), value: decoded.to, mono: true },
    { label: t('txFieldValue'), value: decoded.value },
  ]

  if (decoded.innerCalldata) {
    rows.push(
      {
        label: t('txFieldMethod'),
        value: decoded.innerCalldata.method,
        mono: true,
      },
      {
        label: t('txFieldAction'),
        value: decoded.innerCalldata.description,
      }
    )
    for (const p of decoded.innerCalldata.params) {
      rows.push({ label: p.name, value: p.value, mono: true, indent: true })
    }
  }

  rows.push(
    { label: t('txFieldCallGasLimit'), value: decoded.callGasLimit },
    {
      label: t('txFieldVerificationGas'),
      value: decoded.verificationGasLimit,
    },
    {
      label: t('txFieldPreVerificationGas'),
      value: decoded.preVerificationGas,
    },
    { label: 'Max Fee', value: decoded.maxFeePerGas },
    { label: 'Priority Fee', value: decoded.maxPriorityFeePerGas },
    { label: 'Nonce', value: decoded.nonce },
    {
      label: t('txFieldAccountStatus'),
      value: decoded.isDeployed
        ? t('txFieldDeployed')
        : t('txFieldNotDeployed'),
    }
  )

  return rows
}

const SmartAccountSendForm: React.FC<SmartAccountSendFormProps> = ({
  onClose,
  onBack,
  initialToken,
}) => {
  const { t } = useI18n()
  const [showPreview, setShowPreview] = useState(false)
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
    copyToClipboard,
  } = useSendForm(initialToken)
  void onClose

  const nativeSymbol = activeChain?.symbol || 'ETH'
  const selectedSymbol =
    selectedToken.type === 'native'
      ? selectedToken.symbol
      : selectedToken.token.symbol
  const recipientAddress = toAddress.trim()
  const addressError =
    recipientAddress && !ethers.isAddress(recipientAddress)
      ? 'Invalid EVM address'
      : ''
  const availableAmount = useMemo(() => {
    if (!activeChain) return '0'
    const network = chainToAccountAssetsNetwork(activeChain)
    if (!network) return '0'
    const tokens = getTokensForNetwork(network) ?? []
    const matched =
      selectedToken.type === 'native'
        ? tokens.find((t) => t.tokenAddress == null)
        : tokens.find(
            (t) =>
              t.tokenAddress?.toLowerCase() ===
              selectedToken.token.address.toLowerCase()
          )
    if (!matched) return '0'
    return formatChainTokenBalance(matched, activeChain, 6)
  }, [activeChain, selectedToken])
  const userOpRows = useMemo(
    () =>
      signedTx && isEIP7951Tx(signedTx)
        ? buildUserOpRows(signedTx, nativeSymbol, t as (key: string) => string)
        : [],
    [signedTx, nativeSymbol, t]
  )

  if (!activeWallet) return null

  const handleSign = async () => {
    setError('')
    setSignedTx(null)
    setBroadcastHash('')
    setIsLoading(true)
    try {
      const publicKey = user?.publicKey || null
      const salt = activeWallet.index || 0
      const factoryAddress = activeChain?.factoryAddress || null

      const tx = await EvmWalletService.signEIP7951Transaction(
        activeWallet.credentialId!,
        recipientAddress,
        amount,
        Number(activeChainId),
        getPrimaryRpcUrl(activeChain),
        activeWallet.address,
        factoryAddress,
        publicKey as Map<number, Uint8Array>,
        salt,
        tokenOpts
      )
      setSignedTx(tx)
    } catch (e) {
      console.error(e)
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBroadcast = async () => {
    if (!signedTx || !isEIP7951Tx(signedTx)) return
    setError('')
    setIsBroadcasting(true)
    try {
      const hash = await EvmWalletService.broadcastSmartAccountTransaction(
        signedTx,
        getPrimaryRpcUrl(activeChain),
        activeChain?.bundlerUrl,
        activeChain?.entryPoint
      )
      setBroadcastHash(hash)
    } catch (e) {
      console.error(e)
      setError('Broadcast2 failed: ' + (e as Error).message)
    } finally {
      setIsBroadcasting(false)
    }
  }

  const walletHint = `From: Wallet #${activeWallet.index + 1} (${activeWallet.address.substring(0, 6)}...${activeWallet.address.substring(activeWallet.address.length - 4)})`

  const isBroadcastDisabled =
    signedTx &&
    isEIP7951Tx(signedTx) &&
    !signedTx.isDeployed &&
    (!signedTx.userOp?.initCode || signedTx.userOp.initCode === '0x')

  const deployWarning =
    signedTx && isEIP7951Tx(signedTx) && !signedTx.isDeployed ? (
      <div
        className="warning-banner"
        style={{
          backgroundColor: '#fff3cd',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '12px',
        }}
      >
        ⚠️ Account not deployed yet.{' '}
        {signedTx.userOp?.initCode && signedTx.userOp.initCode !== '0x'
          ? 'Will be deployed on first transaction.'
          : 'Factory address not configured. Please configure VITE_FACTORY_* environment variables.'}
      </div>
    ) : null

  return (
    <SendFormLayout
      title="Send"
      walletHint={walletHint}
      error={error}
      onBack={onBack}
      selectedToken={selectedToken}
    >
      <SendFormFields
        toAddress={toAddress}
        onToAddressChange={setToAddress}
        addressError={addressError}
        selectedToken={selectedToken}
        onTokenChange={setSelectedToken}
        tokenOptions={tokenOptions}
        hideTokenSelect
        amount={amount}
        onAmountChange={setAmount}
        amountLabel={amountLabel}
        nativeSymbol={activeChain?.symbol || 'ETH'}
      />

      <div className="send-balance-bar">
        <div className="send-balance-bar__left">
          <span className="send-balance-bar__icon">
            {selectedToken.type === 'erc20' && selectedToken.token.logo ? (
              <img
                src={selectedToken.token.logo}
                alt={selectedSymbol}
                className="send-balance-bar__icon-img"
              />
            ) : NATIVE_COIN_ICON[selectedSymbol] ? (
              <img
                src={NATIVE_COIN_ICON[selectedSymbol]}
                alt={selectedSymbol}
                className="send-balance-bar__icon-img"
              />
            ) : (
              <ChainIcon
                icon={activeChain?.icon}
                symbol={selectedSymbol}
                size={36}
              />
            )}
          </span>
          <div>
            <div className="send-balance-bar__label">Balance</div>
            <div className="send-balance-bar__value">
              {availableAmount} {selectedSymbol}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="send-balance-bar__max"
          onClick={() => setAmount(availableAmount)}
        >
          Max
        </button>
      </div>
      <div className="modal-actions modal-actions--single-bottom">
        <button
          onClick={() => setShowPreview(true)}
          disabled={!recipientAddress || !!addressError}
          className="primary-btn"
        >
          Continue
        </button>
      </div>

      {showPreview && (
        <TransactionSheet variant="sheet">
          <SendConfirmPreview
            selectedToken={selectedToken}
            amount={amount}
            chainName={activeChain?.name || 'Unknown'}
            fromAddress={activeWallet.address}
            toAddress={recipientAddress}
            onCancel={() => setShowPreview(false)}
            onConfirm={async () => {
              await handleSign()
              setShowPreview(false)
            }}
            isConfirming={isLoading}
          />
        </TransactionSheet>
      )}

      {signedTx && isEIP7951Tx(signedTx) && (
        <SignedTxResult
          rows={userOpRows}
          rawData={JSON.stringify(signedTx, null, 2)}
          rawFormat="json"
          copyLabel="Copy JSON"
          broadcastLabel="Broadcast UserOp"
          broadcastHash={broadcastHash}
          isBroadcasting={isBroadcasting}
          broadcastDisabled={!!isBroadcastDisabled}
          disabledHint={deployWarning}
          explorerUrl={activeChain?.explorer || 'https://etherscan.io'}
          onCopy={() => copyToClipboard(JSON.stringify(signedTx, null, 2))}
          onBroadcast={handleBroadcast}
        />
      )}
    </SendFormLayout>
  )
}

export default SmartAccountSendForm
