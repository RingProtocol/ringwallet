import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { CardAccount, SpendingLimits } from '../../types'
import { useCardManagement } from '../../hooks'
import CardFreezeToggle from '../management/CardFreezeToggle'
import CardDetailsReveal from '../management/CardDetailsReveal'
import SpendingLimit from '../management/SpendingLimit'
import TitleBar from '../../../../components/common/TitleBar'
import { useI18n } from '../../../../i18n'
import '../Card.css'

interface Props {
  card: CardAccount
  onBack: () => void
}

type SubView = 'settings' | 'spending-limit' | 'card-details'

const EtherfiSettingPage: React.FC<Props> = ({ card, onBack }) => {
  const { t } = useI18n()
  const {
    cardDetail,
    freezeCard,
    unfreezeCard,
    updateSpendingLimits,
    revealCardDetails,
  } = useCardManagement()

  const [frozen, setFrozen] = useState(card.status === 'frozen')
  const [subView, setSubView] = useState<SubView>('settings')
  const [freezeLoading, setFreezeLoading] = useState(false)

  const handleFreezeToggle = useCallback(async () => {
    if (freezeLoading) return
    setFreezeLoading(true)
    try {
      if (frozen) {
        await unfreezeCard(card.id)
        setFrozen(false)
      } else {
        await freezeCard(card.id)
        setFrozen(true)
      }
    } catch (err) {
      console.error('Failed to toggle freeze:', err)
    } finally {
      setFreezeLoading(false)
    }
  }, [frozen, freezeLoading, card.id, freezeCard, unfreezeCard])

  const handleSpendingLimit = useCallback(() => {
    setSubView('spending-limit')
  }, [])

  const handleRevealDetails = useCallback(async () => {
    try {
      await revealCardDetails(card.id)
      setSubView('card-details')
    } catch (err) {
      console.error('Failed to reveal card details:', err)
    }
  }, [card.id, revealCardDetails])

  const handleSaveSpendingLimits = useCallback(
    async (limits: SpendingLimits) => {
      try {
        await updateSpendingLimits(card.id, limits)
        setSubView('settings')
      } catch (err) {
        console.error('Failed to update spending limits:', err)
      }
    },
    [card.id, updateSpendingLimits],
  )

  const handleCloseCard = useCallback(() => {
    const confirmed = window.confirm(
      t('cardCloseConfirm') ??
        'Are you sure you want to close this card? This cannot be undone.',
    )
    if (!confirmed) return
    // TODO: call adapter closeCard API when available
    onBack()
  }, [t, onBack])

  const handleSubViewBack = useCallback(() => {
    setSubView('settings')
  }, [])

  // ─── Sub-views ─────────────────────────────────────

  if (subView === 'spending-limit') {
    const limits: SpendingLimits = cardDetail?.spendingLimits ?? {
      daily: null,
      monthly: null,
      perTransaction: null,
    }
    const content = (
      <div className="card-settings-page">
        <TitleBar onBack={handleSubViewBack} backLabel={t('back')}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {t('cardSpendingLimits')}
          </span>
        </TitleBar>
        <div className="card-settings-page__content">
          <SpendingLimit limits={limits} onSave={handleSaveSpendingLimits} />
        </div>
      </div>
    )
    if (typeof document === 'undefined') return content
    return createPortal(content, document.body)
  }

  if (subView === 'card-details' && cardDetail) {
    const content = (
      <div className="card-settings-page">
        <TitleBar onBack={handleSubViewBack} backLabel={t('back')}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {t('cardRevealDetailsTitle')}
          </span>
        </TitleBar>
        <div className="card-settings-page__content">
          <CardDetailsReveal
            cardNumber={cardDetail.cardNumber ?? ''}
            cvc={cardDetail.cvc ?? ''}
            expiryMonth={cardDetail.expiryMonth ?? 0}
            expiryYear={cardDetail.expiryYear ?? 0}
          />
        </div>
      </div>
    )
    if (typeof document === 'undefined') return content
    return createPortal(content, document.body)
  }

  // ─── Main settings view ────────────────────────────

  const content = (
    <div className="card-settings-page">
      <TitleBar onBack={onBack} backLabel={t('back')}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          Ether.fi {t('cardSettings')}
        </span>
      </TitleBar>

      <div className="card-settings-page__content">
        <div className="card-settings__sections">
          <div className="card-settings__section">
            <h3 className="card-settings__section-title">Security</h3>
            <div className="card-settings__item">
              <div className="card-settings__item-info">
                <span className="card-settings__item-label">Freeze Card</span>
                <span className="card-settings__item-desc">
                  Temporarily disable all transactions
                </span>
              </div>
              <CardFreezeToggle
                frozen={frozen}
                onToggle={handleFreezeToggle}
              />
            </div>
          </div>

          <div className="card-settings__section">
            <h3 className="card-settings__section-title">Limits</h3>
            <button
              type="button"
              className="card-settings__item card-settings__item--clickable"
              onClick={handleSpendingLimit}
            >
              <div className="card-settings__item-info">
                <span className="card-settings__item-label">Spending Limits</span>
                <span className="card-settings__item-desc">
                  Set daily, monthly, and per-transaction limits
                </span>
              </div>
              <span className="card-settings__item-arrow" aria-hidden="true">
                &rsaquo;
              </span>
            </button>
          </div>

          <div className="card-settings__section">
            <h3 className="card-settings__section-title">Card Info</h3>
            <button
              type="button"
              className="card-settings__item card-settings__item--clickable"
              onClick={handleRevealDetails}
            >
              <div className="card-settings__item-info">
                <span className="card-settings__item-label">View Card Details</span>
                <span className="card-settings__item-desc">
                  Card number, CVC, and expiry date
                </span>
              </div>
              <span className="card-settings__item-arrow" aria-hidden="true">
                &rsaquo;
              </span>
            </button>
          </div>

          <div className="card-settings__section card-settings__section--danger">
            <h3 className="card-settings__section-title">Danger Zone</h3>
            <button
              type="button"
              className="card-settings__item card-settings__item--danger"
              onClick={handleCloseCard}
            >
              <div className="card-settings__item-info">
                <span className="card-settings__item-label">Close Card</span>
                <span className="card-settings__item-desc">
                  Permanently close this card. This cannot be undone.
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default EtherfiSettingPage
