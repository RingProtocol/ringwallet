import React from 'react'
import AccountDrawerPanel from './AccountDrawerPanel'
import './AccountDrawer.css'
import { useI18n } from '../i18n'

interface AccountDrawerProps {
  isOpen: boolean
  onClose: () => void
  expandWalletListOnOpen?: boolean
  pulseExpandWalletList?: number
}

const AccountDrawer: React.FC<AccountDrawerProps> = ({
  isOpen,
  onClose,
  expandWalletListOnOpen = false,
  pulseExpandWalletList = 0,
}) => {
  const { t } = useI18n()

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`account-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>{t('account')}</h3>
          <button className="drawer-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <AccountDrawerPanel
          active={isOpen}
          expandWalletListOnOpen={expandWalletListOnOpen}
          pulseExpandWalletList={pulseExpandWalletList}
          onLogout={onClose}
        />
      </div>
    </>
  )
}

export default AccountDrawer
