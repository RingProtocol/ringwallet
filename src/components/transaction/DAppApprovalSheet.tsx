import React, { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { useI18n } from '../../i18n'
import { useAuth } from '../../contexts/AuthContext'
import { decodeCalldata } from '../../utils/calldataDecoder'
import type {
  ApprovalRequest,
  SignData,
  SignTypedData,
  SwitchChainData,
  TransactionData,
} from '../../features/dapps/types/approval'
import TransactionSheet from './TransactionSheet'

interface DAppApprovalSheetProps {
  request: ApprovalRequest
  onApprove: () => void
  onReject: () => void
}

function truncateAddress(value: string): string {
  if (!value || value.length < 10) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function formatOrigin(url: string): string {
  if (!url) return ''
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function formatHexValue(value: string, symbol = 'ETH'): string {
  try {
    const formatted = ethers.formatEther(BigInt(value))
    return `${formatted.replace(/\.?0+$/, '') || '0'} ${symbol}`
  } catch {
    return value
  }
}

function hexToUtf8(value: string): string {
  try {
    if (!value.startsWith('0x')) return value
    return ethers.toUtf8String(value)
  } catch {
    return value
  }
}

const ConnectContent: React.FC = () => {
  const { t } = useI18n()

  return (
    <div className="transaction-request__permissions">
      <div className="transaction-request__permission">
        ✓ {t('permViewAddress')}
      </div>
      <div className="transaction-request__permission">
        ✓ {t('permViewBalance')}
      </div>
      <div className="transaction-request__permission">
        ✓ {t('permRequestApproval')}
      </div>
    </div>
  )
}

const TransactionContent: React.FC<{ request: ApprovalRequest }> = ({
  request,
}) => {
  const { t } = useI18n()
  const { activeChain } = useAuth()
  const [showRaw, setShowRaw] = useState(false)
  const tx = request.data as TransactionData | undefined
  const nativeSymbol = activeChain?.symbol || 'ETH'

  const decoded = useMemo(
    () => (tx?.data && tx.data !== '0x' ? decodeCalldata(tx.data) : null),
    [tx?.data]
  )

  if (!tx) return null

  return (
    <div className="transaction-request__detail-box">
      {tx.from && (
        <div className="transaction-request__row">
          <span className="transaction-request__label">From</span>
          <span className="transaction-request__value">
            {truncateAddress(tx.from)}
          </span>
        </div>
      )}
      {tx.to && (
        <div className="transaction-request__row">
          <span className="transaction-request__label">To</span>
          <span className="transaction-request__value">
            {truncateAddress(tx.to)}
          </span>
        </div>
      )}
      {tx.value && tx.value !== '0x0' && (
        <div className="transaction-request__row">
          <span className="transaction-request__label">
            {t('txFieldValue')}
          </span>
          <span className="transaction-request__value">
            {formatHexValue(tx.value, nativeSymbol)}
          </span>
        </div>
      )}

      {decoded && (
        <>
          <div className="transaction-request__row">
            <span className="transaction-request__label">
              {t('txFieldMethod')}
            </span>
            <span className="transaction-request__value transaction-request__value--mono">
              {decoded.method}
            </span>
          </div>
          <div className="transaction-request__row">
            <span className="transaction-request__label">
              {t('txFieldAction')}
            </span>
            <span className="transaction-request__value">
              {decoded.description}
            </span>
          </div>
          {decoded.params.map((p, i) => (
            <div className="transaction-request__row" key={i}>
              <span className="transaction-request__label">→ {p.name}</span>
              <span className="transaction-request__value transaction-request__value--mono">
                {p.value}
              </span>
            </div>
          ))}
        </>
      )}

      {tx.data && tx.data !== '0x' && !decoded && (
        <div className="transaction-request__row">
          <span className="transaction-request__label">Data</span>
          <span className="transaction-request__value transaction-request__value--mono">
            {tx.data.slice(0, 18)}...
          </span>
        </div>
      )}

      {tx.data && tx.data !== '0x' && (
        <button
          className="signed-result__toggle"
          onClick={() => setShowRaw(!showRaw)}
          style={{ marginTop: '4px' }}
        >
          {showRaw ? t('hideRawData') : t('showRawData')}
        </button>
      )}
      {showRaw && tx.data && (
        <div className="signed-result__raw">{tx.data}</div>
      )}

      {tx.gas && (
        <div className="transaction-request__row">
          <span className="transaction-request__label">Gas</span>
          <span className="transaction-request__value transaction-request__value--mono">
            {tx.gas}
          </span>
        </div>
      )}
    </div>
  )
}

const SignContent: React.FC<{ request: ApprovalRequest }> = ({ request }) => {
  const { t } = useI18n()
  const data = request.data as SignData | undefined
  if (!data) return null

  const displayMessage = data.message.startsWith('0x')
    ? hexToUtf8(data.message)
    : data.message

  return (
    <>
      <div className="transaction-request__message-box">
        {displayMessage.length > 240
          ? `${displayMessage.slice(0, 240)}...`
          : displayMessage}
      </div>
      <div className="transaction-request__warning">
        ⚠ {t('signSafetyWarning')}
      </div>
    </>
  )
}

const SignTypedContent: React.FC<{ request: ApprovalRequest }> = ({
  request,
}) => {
  const { t } = useI18n()
  const data = request.data as SignTypedData | undefined
  if (!data) return null

  const pretty = JSON.stringify(data.typedData, null, 2)

  return (
    <>
      <div className="transaction-request__message-box transaction-request__message-box--code">
        {pretty.length > 600 ? `${pretty.slice(0, 600)}\n...` : pretty}
      </div>
      <div className="transaction-request__warning">
        ⚠ {t('typedSignSafetyWarning')}
      </div>
    </>
  )
}

const SwitchChainContent: React.FC<{ request: ApprovalRequest }> = ({
  request,
}) => {
  const data = request.data as
    | (SwitchChainData & { chainName?: string })
    | undefined
  if (!data) return null

  return (
    <div className="transaction-request__detail-box">
      <div className="transaction-request__row">
        <span className="transaction-request__label">Network</span>
        <span className="transaction-request__value">
          {data.chainName || data.chainId}
        </span>
      </div>
      <div className="transaction-request__row">
        <span className="transaction-request__label">Chain ID</span>
        <span className="transaction-request__value transaction-request__value--mono">
          {data.chainId}
        </span>
      </div>
    </div>
  )
}

const contentMap: Record<string, React.FC<{ request: ApprovalRequest }>> = {
  connect: ConnectContent,
  transaction: TransactionContent,
  sign: SignContent,
  sign_typed: SignTypedContent,
  switch_chain: SwitchChainContent,
}

const DAppApprovalSheet: React.FC<DAppApprovalSheetProps> = ({
  request,
  onApprove,
  onReject,
}) => {
  const { t } = useI18n()
  const Content = contentMap[request.type] || ConnectContent

  const approveLabel =
    request.type === 'connect'
      ? t('connectAction')
      : request.type === 'transaction'
        ? t('approveTransactionAction')
        : request.type === 'switch_chain'
          ? t('switchAction')
          : t('signAction')

  return (
    <TransactionSheet
      variant="sheet"
      contentClassName="transaction-request__sheet"
    >
      <div className="transaction-request__header">
        {request.dappIcon ? (
          <img
            className="transaction-request__icon"
            src={request.dappIcon}
            alt=""
            onError={(event) => {
              ;(event.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="transaction-request__icon transaction-request__icon--placeholder">
            {request.dappName.slice(0, 1).toUpperCase() || 'D'}
          </div>
        )}
        <div className="transaction-request__identity">
          <h3>{request.title}</h3>
          <div className="transaction-request__origin">{request.dappName}</div>
          {request.dappUrl && (
            <div className="transaction-request__origin transaction-request__origin--muted">
              {formatOrigin(request.dappUrl)}
            </div>
          )}
        </div>
      </div>

      <p className="transaction-request__description">{request.description}</p>

      <Content request={request} />

      <div className="modal-actions">
        <button className="secondary-btn" onClick={onReject}>
          {t('reject')}
        </button>
        <button className="primary-btn" onClick={onApprove}>
          {approveLabel}
        </button>
      </div>
    </TransactionSheet>
  )
}

export default DAppApprovalSheet
