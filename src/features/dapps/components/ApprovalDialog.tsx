import React from 'react'
import type { ApprovalRequest } from '../types/approval'
import type { TransactionData, SignData, SignTypedData, SwitchChainData } from '../types/approval'
import { useI18n } from '../../../i18n'

interface Props {
  request: ApprovalRequest
  onApprove: () => void
  onReject: () => void
}

function formatHexValue(hex: string): string {
  try {
    const wei = BigInt(hex)
    const eth = Number(wei) / 1e18
    if (eth === 0) return '0 ETH'
    return eth.toFixed(6).replace(/\.?0+$/, '') + ' ETH'
  } catch {
    return hex
  }
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function hexToUtf8(hex: string): string {
  try {
    if (!hex.startsWith('0x')) return hex
    const bytes = []
    for (let i = 2; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substring(i, i + 2), 16))
    }
    return new TextDecoder().decode(new Uint8Array(bytes))
  } catch {
    return hex
  }
}

const ConnectContent: React.FC<{ request: ApprovalRequest }> = () => {
  const { t } = useI18n()
  return (
    <div className="approval-content">
      <div className="approval-content__permissions">
        <div className="approval-content__perm-item">✓ {t('permViewAddress')}</div>
        <div className="approval-content__perm-item">✓ {t('permViewBalance')}</div>
        <div className="approval-content__perm-item">✓ {t('permRequestApproval')}</div>
      </div>
    </div>
  )
}

const TransactionContent: React.FC<{ request: ApprovalRequest }> = ({ request }) => {
  const tx = request.data as TransactionData | undefined
  if (!tx) return null
  return (
    <div className="approval-content">
      <div className="approval-content__detail-box">
        {tx.to && (
          <div className="approval-content__row">
            <span className="approval-content__label">To</span>
            <span className="approval-content__value">{truncateAddress(tx.to)}</span>
          </div>
        )}
        {tx.value && tx.value !== '0x0' && (
          <div className="approval-content__row">
            <span className="approval-content__label">Value</span>
            <span className="approval-content__value">{formatHexValue(tx.value)}</span>
          </div>
        )}
        {tx.data && tx.data !== '0x' && (
          <div className="approval-content__row">
            <span className="approval-content__label">Data</span>
            <span className="approval-content__value approval-content__value--mono">
              {tx.data.slice(0, 10)}...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const SignContent: React.FC<{ request: ApprovalRequest }> = ({ request }) => {
  const { t } = useI18n()
  const data = request.data as SignData | undefined
  if (!data) return null
  const displayMsg = data.message.startsWith('0x') ? hexToUtf8(data.message) : data.message
  return (
    <div className="approval-content">
      <div className="approval-content__message-box">
        {displayMsg.length > 200 ? displayMsg.slice(0, 200) + '...' : displayMsg}
      </div>
      <div className="approval-content__warning">
        ⚠ {t('signSafetyWarning')}
      </div>
    </div>
  )
}

const SignTypedContent: React.FC<{ request: ApprovalRequest }> = ({ request }) => {
  const { t } = useI18n()
  const data = request.data as SignTypedData | undefined
  if (!data) return null
  const pretty = JSON.stringify(data.typedData, null, 2)
  return (
    <div className="approval-content">
      <div className="approval-content__message-box approval-content__message-box--code">
        {pretty.length > 500 ? pretty.slice(0, 500) + '\n...' : pretty}
      </div>
      <div className="approval-content__warning">
        ⚠ {t('typedSignSafetyWarning')}
      </div>
    </div>
  )
}

const SwitchChainContent: React.FC<{ request: ApprovalRequest }> = ({ request }) => {
  const data = request.data as SwitchChainData & { chainName?: string } | undefined
  if (!data) return null
  return (
    <div className="approval-content">
      <div className="approval-content__detail-box">
        <div className="approval-content__row">
          <span className="approval-content__label">Network</span>
          <span className="approval-content__value">{data.chainName || data.chainId}</span>
        </div>
        <div className="approval-content__row">
          <span className="approval-content__label">Chain ID</span>
          <span className="approval-content__value">{data.chainId}</span>
        </div>
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

const ApprovalDialog: React.FC<Props> = ({ request, onApprove, onReject }) => {
  const ContentComponent = contentMap[request.type] || ConnectContent
  const { t } = useI18n()

  return (
    <div className="approval-overlay" onClick={onReject}>
      <div className="approval-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="approval-dialog__header">
          <img
            className="approval-dialog__icon"
            src={request.dappIcon || undefined}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="approval-dialog__header-text">
            <h3 className="approval-dialog__title">{request.title}</h3>
            <span className="approval-dialog__origin">{request.dappName}</span>
          </div>
        </div>

        <p className="approval-dialog__desc">{request.description}</p>

        <ContentComponent request={request} />

        <div className="approval-dialog__actions">
          <button className="approval-btn approval-btn--reject" onClick={onReject}>
            {t('reject')}
          </button>
          <button className="approval-btn approval-btn--approve" onClick={onApprove}>
            {request.type === 'connect' ? t('connectAction') :
             request.type === 'transaction' ? t('approveTransactionAction') :
             request.type === 'switch_chain' ? t('switchAction') : t('signAction')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ApprovalDialog
