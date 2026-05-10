import React from 'react'
import TitleBar from './TitleBar'
import TransactionSheet from '../transaction/TransactionSheet'
import './PopupListLayout.css'

export interface PopupListLayoutProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

const PopupListLayout: React.FC<PopupListLayoutProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  if (!open) return null

  return (
    <TransactionSheet variant="sheet">
      <div className="popup-list-layout">
        <TitleBar
          right={
            <button
              type="button"
              className="popup-list-layout__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          }
        >
          <span className="popup-list-layout__title">{title}</span>
        </TitleBar>
        <div className="popup-list-layout__content">{children}</div>
      </div>
    </TransactionSheet>
  )
}

export default PopupListLayout
