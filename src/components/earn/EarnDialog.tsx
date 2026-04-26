import React, { useState, useCallback } from 'react'
import { useI18n } from '../../i18n'
import { useAuth } from '../../contexts/AuthContext'
import { useEarnSdk, useIsEarnSupported } from './useEarnSdk'
import { useStrategies, useYield, useStake } from '@ringearn/sdk/react'
import { formatEther } from 'viem'
import './EarnDialog.css'

interface EarnDialogProps {
  onClose: () => void
}

const EarnContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useI18n()
  const { activeAccount } = useAuth()
  const config = useEarnSdk()
  const address = activeAccount?.address as `0x${string}` | undefined

  const { data: strategies, isLoading: strategiesLoading } = useStrategies()
  const { data: yieldData, refetch } = useYield(
    config!,
    address ?? '0x0000000000000000000000000000000000000000'
  )
  const {
    stake,
    isLoading: stakeLoading,
    error: stakeError,
    txHash,
  } = useStake(config!)

  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'overview' | 'stake'>('overview')

  const handleStake = useCallback(async () => {
    if (!address || !amount) return
    const value = BigInt(Math.floor(parseFloat(amount) * 1e18))
    await stake({ protocol: 'lido', amount: value, account: address })
    refetch()
    setStep('overview')
    setAmount('')
  }, [address, amount, stake, refetch])

  return (
    <>
      {step === 'overview' && (
        <>
          <h3>{t('earnTitle')}</h3>
          {yieldData && yieldData.positions.length > 0 && (
            <div className="earn-positions">
              <h4>{t('earnPositions')}</h4>
              {yieldData.positions.map((pos, i) => (
                <div key={i} className="earn-position-row">
                  <span className="earn-position-protocol">{pos.protocol}</span>
                  <span className="earn-position-balance">
                    {formatEther(pos.balance)} {pos.asset}
                  </span>
                </div>
              ))}
              <div className="earn-total-yield">
                <span>{t('earnTotalYield')}</span>
                <span>${yieldData.totalEarnedUsd.toFixed(4)}</span>
              </div>
            </div>
          )}

          <div className="earn-strategies">
            <h4>{t('earnStrategies')}</h4>
            {strategiesLoading && (
              <p className="earn-loading">{t('loading')}</p>
            )}
            {strategies?.map((s) => (
              <div key={s.id} className="earn-strategy-card">
                <div className="earn-strategy-info">
                  <span className="earn-strategy-name">{s.name}</span>
                  <span className="earn-strategy-apy">
                    {(s.apy * 100).toFixed(2)}% APY
                  </span>
                </div>
                <button
                  className="earn-stake-btn"
                  onClick={() => setStep('stake')}
                >
                  {t('earnStake')}
                </button>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button className="secondary-btn" onClick={onClose}>
              {t('close')}
            </button>
          </div>
        </>
      )}

      {step === 'stake' && (
        <>
          <h3>{t('earnStakeTitle')}</h3>
          <div className="form-group">
            <label>{t('amount')} (ETH)</label>
            <input
              type="number"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.001"
            />
          </div>
          {stakeError && <p className="error-text">{stakeError.message}</p>}
          {txHash && (
            <p className="earn-tx-hash">
              Tx:{' '}
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash.slice(0, 10)}...
              </a>
            </p>
          )}
          <div className="modal-actions">
            <button
              className="secondary-btn"
              onClick={() => setStep('overview')}
            >
              {t('back')}
            </button>
            <button
              className="primary-btn"
              onClick={handleStake}
              disabled={stakeLoading || !amount || parseFloat(amount) <= 0}
            >
              {stakeLoading ? t('confirming') : t('confirm')}
            </button>
          </div>
        </>
      )}
    </>
  )
}

const EarnDialog: React.FC<EarnDialogProps> = ({ onClose }) => {
  const { t } = useI18n()
  const isSupported = useIsEarnSupported()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content earn-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {isSupported ? (
          <EarnContent onClose={onClose} />
        ) : (
          <>
            <h3>{t('earnTitle')}</h3>
            <p className="earn-hint">{t('earnDisabledNonEthereum')}</p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={onClose}>
                {t('close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default EarnDialog
