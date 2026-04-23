import React, { useState } from 'react'
import { useI18n } from '../../i18n'
import { TESTID } from '../testids'
import '../QuickActionBar.css'

export interface TxDisplayRow {
  label: string
  value: string
  mono?: boolean
  indent?: boolean
}

interface SignedTxResultProps {
  rows: TxDisplayRow[]
  rawData: string
  rawFormat?: 'hex' | 'json' | 'base64'
  broadcastHash: string
  isBroadcasting: boolean
  explorerUrl: string
  broadcastLabel?: string
  hashLabel?: string
  copyLabel?: string
  broadcastDisabled?: boolean
  disabledHint?: React.ReactNode
  onCopy: () => void
  onBroadcast: () => void
  'data-testid-broadcast'?: string
  'data-testid-success'?: string
  'data-testid-hash'?: string
}

const SignedTxResult: React.FC<SignedTxResultProps> = ({
  rows,
  rawData,
  rawFormat = 'hex',
  broadcastHash,
  isBroadcasting,
  explorerUrl,
  broadcastLabel,
  hashLabel = 'Tx Hash',
  copyLabel,
  broadcastDisabled,
  disabledHint,
  onCopy,
  onBroadcast,
  ...rest
}) => {
  const { t } = useI18n()
  const [showRaw, setShowRaw] = useState(false)

  const copyText =
    copyLabel ??
    (rawFormat === 'json'
      ? 'Copy JSON'
      : rawFormat === 'base64'
        ? 'Copy Base64'
        : 'Copy Hex')

  return (
    <div className="signed-result">
      <h4>✅ {t('signedSuccessfully')}</h4>

      {rows.length > 0 ? (
        <div className="signed-result__decoded">
          {rows.map((row, i) => (
            <div
              className={`signed-result__row${row.indent ? ' signed-result__row--indent' : ''}`}
              key={i}
            >
              <span className="signed-result__label">
                {row.indent ? '→ ' : ''}
                {row.label}
              </span>
              <span
                className={`signed-result__value${row.mono ? ' signed-result__value--mono' : ''}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <textarea readOnly value={rawData} rows={3} className="result-area" />
      )}

      <button
        className="signed-result__toggle"
        onClick={() => setShowRaw(!showRaw)}
      >
        {showRaw ? t('hideRawData') : t('showRawData')}
      </button>
      {showRaw && <div className="signed-result__raw">{rawData}</div>}

      {disabledHint}

      <div className="button-group">
        <button onClick={onCopy} className="copy-btn">
          {copyText}
        </button>
        {!broadcastHash && (
          <button
            onClick={onBroadcast}
            className="primary-btn broadcast-btn"
            disabled={isBroadcasting || broadcastDisabled}
            data-testid={
              rest['data-testid-broadcast'] ?? TESTID.SEND_BROADCAST_BUTTON
            }
          >
            {isBroadcasting
              ? 'Broadcasting...'
              : (broadcastLabel ?? t('broadcastTransaction'))}
          </button>
        )}
      </div>

      {broadcastHash && (
        <div
          className="broadcast-success"
          data-testid={rest['data-testid-success'] ?? TESTID.BROADCAST_SUCCESS}
        >
          <h4>{t('txSubmitted')}</h4>
          <p>
            {hashLabel}:{' '}
            <span
              className="hash-text"
              data-testid={rest['data-testid-hash'] ?? TESTID.BROADCAST_HASH}
            >
              {broadcastHash.substring(0, 10)}...
              {broadcastHash.substring(broadcastHash.length - 8)}
            </span>
          </p>
          <a
            href={`${explorerUrl}/tx/${broadcastHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-link"
          >
            View on Explorer ↗
          </a>
        </div>
      )}
    </div>
  )
}

export default SignedTxResult
