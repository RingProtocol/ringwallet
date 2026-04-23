import React from 'react'
import AccountDrawerPanel from '../AccountDrawerPanel'
import { useI18n } from '../../i18n'

export interface MoreTabProps {
  appVersion?: string
  expandWalletListOnOpen: boolean
  pulseExpandWalletList: number
}

const MoreTab: React.FC<MoreTabProps> = ({
  appVersion,
  expandWalletListOnOpen,
  pulseExpandWalletList,
}) => {
  const { t } = useI18n()

  return (
    <>
      <header className="wallet-main-page__top-bar wallet-main-page__top-bar--collapsed">
        <h1 className="wallet-main-page__tab-title">{t('moreTab')}</h1>
      </header>

      <div className="wallet-main-page__more-outer">
        <div className="wallet-main-page__more">
          <AccountDrawerPanel
            active
            expandWalletListOnOpen={expandWalletListOnOpen}
            pulseExpandWalletList={pulseExpandWalletList}
          />
          {appVersion != null && appVersion !== '' && (
            <footer className="wallet-main-page__more-version app-version">
              version:{appVersion}
            </footer>
          )}
        </div>
      </div>
    </>
  )
}

export default MoreTab
