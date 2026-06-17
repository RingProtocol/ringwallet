import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatEther, formatUnits } from 'viem'
import { useI18n } from '../../i18n'
import { useAuth } from '../../contexts/AuthContext'
import { useEarnSdk, useIsEarnSupported } from './useEarnSdk'
import {
  useYield,
  useStake,
  useMorphoWithdraw,
  useMorphoPosition,
} from '@ring-protocol/ringearnsdk/react'
import {
  useEarnStrategies,
  type EarnStrategy,
} from '../../hooks/useEarnStrategies'
import TitleBar from '../common/TitleBar'
import TempContent from '../common/TempContent'
import './EarnPage.css'

interface EarnPageProps {
  onClose: () => void
}

type EarnView = { kind: 'list' } | { kind: 'stake'; strategy: EarnStrategy }

/* -------------------------------------------------------------------------- */
/*  EarnListPage — list of positions + strategies                            */
/* -------------------------------------------------------------------------- */

interface EarnListPageProps {
  config: NonNullable<ReturnType<typeof useEarnSdk>>
  address: `0x${string}`
  /** Bumping this re-fetches positions + strategies. */
  refetchKey: number
  onSelectStrategy: (s: EarnStrategy) => void
  onClose: () => void
}

const EarnListPage: React.FC<EarnListPageProps> = ({
  config,
  address,
  refetchKey,
  onSelectStrategy,
  onClose,
}) => {
  const { t } = useI18n()
  const { data: yieldData, refetch: refetchYield } = useYield(config, address)
  const {
    strategies,
    isLoading: strategiesLoading,
    errors: strategyErrors,
    refetch: refetchStrategies,
  } = useEarnStrategies(config.rpcUrl)

  // External trigger (e.g. after a successful stake) re-fetches both
  // the position list and the strategies list.
  useEffect(() => {
    if (refetchKey === 0) return
    refetchYield()
    refetchStrategies()
  }, [refetchKey, refetchYield, refetchStrategies])

  return (
    <div className="earn-page">
      <TitleBar onBack={onClose} backLabel={t('close')}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{t('earnTitle')}</span>
      </TitleBar>
      <div className="earn-page__content">
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
            <TempContent status="loading">{t('loading')}</TempContent>
          )}
          {!strategiesLoading && strategies.length === 0 && (
            <TempContent status="error">
              {strategyErrors.lido
                ? `Lido: ${strategyErrors.lido}`
                : strategyErrors.morpho
                  ? `Morpho: ${strategyErrors.morpho}`
                  : t('loadingFailed', { error: 'No strategies' })}
            </TempContent>
          )}
          {strategies.map((s) => {
            // Lido is colloquially "stake" (ETH → stETH). Morpho is an
            // ERC-4626 vault, so the canonical terms are supply / withdraw.
            const cta = s.protocol === 'lido' ? t('earnStake') : t('earnSupply')
            return (
              <button
                key={s.id}
                type="button"
                className="earn-strategy-card"
                onClick={() => onSelectStrategy(s)}
                data-testid={`earn-strategy-${s.protocol}`}
              >
                <div className="earn-strategy-info">
                  <span className="earn-strategy-name">{s.name}</span>
                  <span className="earn-strategy-apy">
                    {s.apy.toFixed(2)}% APY
                  </span>
                  <span className="earn-strategy-asset">{s.asset}</span>
                  <span
                    className="earn-strategy-source"
                    title={
                      s.protocol === 'lido'
                        ? t('earnApyLidoSource')
                        : t('earnApyMorphoSource')
                    }
                  >
                    {s.protocol === 'lido'
                      ? t('earnApyLidoSource')
                      : t('earnApyMorphoSource')}
                  </span>
                </div>
                <span className="earn-strategy-cta">{cta} ›</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  EarnStakePage — single strategy stake / supply / withdraw form            */
/* -------------------------------------------------------------------------- */

type EarnStakeTab = 'supply' | 'withdraw'

interface EarnStakePageProps {
  config: NonNullable<ReturnType<typeof useEarnSdk>>
  address: `0x${string}`
  strategy: EarnStrategy
  onBack: () => void
  /** Called after a successful stake so the list can refetch. */
  onSuccess: () => void
  onClose: () => void
}

const EarnStakePage: React.FC<EarnStakePageProps> = ({
  config,
  address,
  strategy,
  onBack,
  onSuccess,
  onClose,
}) => {
  const { t } = useI18n()
  const isLido = strategy.protocol === 'lido'
  const isMorpho = strategy.protocol === 'morpho'

  // Morpho has Supply / Withdraw tabs. Lido only has Supply (unstaking
  // is queue-based and not wired in this view — we just show a notice).
  const [tab, setTab] = useState<EarnStakeTab>('supply')
  const [amount, setAmount] = useState('')

  const {
    stake,
    isLoading: stakeLoading,
    error: stakeError,
    txHash: stakeTxHash,
  } = useStake(config)
  const {
    withdraw,
    isLoading: withdrawLoading,
    error: withdrawError,
    txHash: withdrawTxHash,
  } = useMorphoWithdraw(config)

  // Lido position is read through the SDK's `useYield` (stETH balance).
  // Morpho position is read per-vault because the user may have supplied
  // to any number of MetaMorpho vaults; we only know the current one.
  const { data: yieldData } = useYield(config, address)
  const lidoPos = isLido
    ? yieldData?.positions.find((p) => p.protocol === 'lido')
    : undefined

  const morphoVault: `0x${string}` | undefined =
    isMorpho && strategy.details
      ? (strategy.details as `0x${string}`)
      : undefined
  const { data: morphoPos } = useMorphoPosition(config, address, morphoVault)

  // Once the SDK reports a successful tx, bump the list's refetch key
  // and pop back to the list. Both supply and withdraw share this path.
  useEffect(() => {
    if (stakeTxHash || withdrawTxHash) {
      onSuccess()
      onBack()
    }
  }, [stakeTxHash, withdrawTxHash, onSuccess, onBack])

  const isLoading = stakeLoading || withdrawLoading
  const error = stakeError || withdrawError

  const handleSubmit = useCallback(async () => {
    const amt = parseFloat(amount)
    if (!Number.isFinite(amt) || amt <= 0) return
    const value = BigInt(Math.floor(amt * 10 ** strategy.decimals))
    if (value <= 0n) return

    if (isLido) {
      await stake({ protocol: 'lido', amount: value, account: address })
    } else if (isMorpho) {
      if (!strategy.details) {
        throw new Error('Morpho vault address missing from strategy')
      }
      const vault = strategy.details as `0x${string}`
      if (tab === 'supply') {
        await stake({
          protocol: 'morpho',
          amount: value,
          account: address,
          vault,
        })
      } else {
        await withdraw({ vault, assets: value, account: address })
      }
    }
    // Success path is handled in the txHash effect above.
  }, [
    amount,
    strategy.decimals,
    strategy.details,
    isLido,
    isMorpho,
    tab,
    address,
    stake,
    withdraw,
  ])

  // ---- Position display (above the action form) ----------------------------
  // `null` means the position is still loading. For Lido, the SDK's
  // `fetchLidoPosition` returns null when the balance is zero, so an
  // absent lidoPos is also "empty".
  const lidoAssets = lidoPos?.balance ?? 0n
  const morphoAssets = morphoPos?.assets ?? 0n
  const hasPosition = isLido ? lidoAssets > 0n : morphoAssets > 0n
  const positionLoaded = isLido ? yieldData !== null : morphoPos !== null

  const currentValue = useMemo(() => {
    if (!hasPosition) return null
    if (isLido) {
      return `${formatEther(lidoAssets)} ${strategy.asset}`
    }
    return `${formatUnits(morphoAssets, strategy.decimals)} ${strategy.asset}`
  }, [
    hasPosition,
    isLido,
    lidoAssets,
    morphoAssets,
    strategy.asset,
    strategy.decimals,
  ])

  // Vault shares are typically 18-decimals (ERC-4626 default). The
  // morpho API doesn't expose the share decimals directly, so we use
  // 18 as the best-effort default.
  const sharesLine = useMemo(() => {
    if (!isMorpho || !morphoPos || morphoPos.shares === 0n) return null
    return t('earnPositionShares', {
      shares: formatUnits(morphoPos.shares, 18),
    })
  }, [isMorpho, morphoPos, t])

  // Title and confirm label track the active tab.
  const title = isLido
    ? t('earnStakeTitleFor', { asset: strategy.asset })
    : tab === 'supply'
      ? t('earnSupplyFor', { asset: strategy.asset })
      : t('earnWithdrawFor', { asset: strategy.asset })

  const confirmLabel = isLoading
    ? t('confirming')
    : isLido
      ? t('confirm')
      : tab === 'supply'
        ? t('earnSupply')
        : t('earnWithdraw')

  const amountValid =
    amount !== '' &&
    Number.isFinite(parseFloat(amount)) &&
    parseFloat(amount) > 0
  const submitDisabled =
    isLoading ||
    !amountValid ||
    (isMorpho && tab === 'withdraw' && !hasPosition)

  return (
    <div className="earn-page">
      <TitleBar
        onBack={onBack}
        backLabel={t('back')}
        right={
          <button
            type="button"
            className="title-bar__close"
            aria-label={t('close')}
            onClick={onClose}
          >
            ×
          </button>
        }
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
      </TitleBar>
      <div className="earn-page__content">
        <div className="earn-page__body">
          <p className="earn-strategy-hint">
            {strategy.name} · {strategy.apy.toFixed(2)}% APY
          </p>

          <div className="earn-position-card">
            <h4 className="earn-position-card__title">
              {t('earnYourPosition')}
            </h4>
            {!positionLoaded ? (
              <div className="earn-position-card__empty">…</div>
            ) : hasPosition && currentValue ? (
              <>
                <div className="earn-position-card__value">{currentValue}</div>
                <div className="earn-position-card__label">
                  {t('earnCurrentValue')}
                </div>
                {sharesLine && (
                  <div className="earn-position-card__shares">{sharesLine}</div>
                )}
              </>
            ) : (
              <div className="earn-position-card__empty">
                {t('earnPositionEmpty')}
              </div>
            )}
          </div>

          {isMorpho && (
            <div className="earn-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'supply'}
                className={
                  'earn-tab' + (tab === 'supply' ? ' earn-tab--active' : '')
                }
                onClick={() => setTab('supply')}
              >
                {t('earnSupply')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'withdraw'}
                className={
                  'earn-tab' + (tab === 'withdraw' ? ' earn-tab--active' : '')
                }
                onClick={() => setTab('withdraw')}
              >
                {t('earnWithdraw')}
              </button>
            </div>
          )}

          {isLido && <p className="earn-notice">{t('earnLidoNoWithdraw')}</p>}

          <div className="form-group">
            <label>
              {t('amount')} ({strategy.asset})
            </label>
            <input
              type="number"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.001"
              autoFocus
            />
          </div>

          {error && <p className="error-text">{error.message}</p>}

          <div className="earn-actions">
            <button className="secondary-btn" onClick={onBack} type="button">
              {t('back')}
            </button>
            <button
              className="primary-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const EarnPage: React.FC<EarnPageProps> = ({ onClose }) => {
  const { t } = useI18n()
  const { activeAccount } = useAuth()
  const config = useEarnSdk()
  const address = activeAccount?.address as `0x${string}` | undefined
  const isSupported = useIsEarnSupported()

  // "Router" state — discriminated union for safe, exhaustive switching.
  const [view, setView] = useState<EarnView>({ kind: 'list' })
  // Bumping this asks the list to refetch positions + strategies
  // (used after a successful stake or withdraw).
  const [refetchKey, setRefetchKey] = useState(0)

  const handleSelect = useCallback((s: EarnStrategy) => {
    setView({ kind: 'stake', strategy: s })
  }, [])

  const handleBackToList = useCallback(() => {
    setView({ kind: 'list' })
  }, [])

  const handleStakeSuccess = useCallback(() => {
    setRefetchKey((k) => k + 1)
  }, [])

  if (typeof document === 'undefined') {
    // SSR / pre-render path — render nothing. The real render is
    // always client-side via the portal.
    return null
  }

  let body: React.ReactNode
  if (!isSupported) {
    body = (
      <div className="earn-page">
        <TitleBar onBack={onClose} backLabel={t('close')}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {t('earnTitle')}
          </span>
        </TitleBar>
        <div className="earn-page__content">
          <TempContent status="error">
            {t('earnDisabledNonEthereum')}
          </TempContent>
        </div>
      </div>
    )
  } else if (config && address) {
    body =
      view.kind === 'list' ? (
        <EarnListPage
          config={config}
          address={address}
          refetchKey={refetchKey}
          onSelectStrategy={handleSelect}
          onClose={onClose}
        />
      ) : (
        <EarnStakePage
          config={config}
          address={address}
          strategy={view.strategy}
          onBack={handleBackToList}
          onSuccess={handleStakeSuccess}
          onClose={onClose}
        />
      )
  } else {
    body = null
  }

  return createPortal(<>{body}</>, document.body)
}

export default EarnPage
