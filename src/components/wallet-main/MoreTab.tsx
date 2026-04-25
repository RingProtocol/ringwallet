import React from 'react'
import AccountDrawerPanel from '../AccountDrawerPanel'
import { useI18n } from '../../i18n'

export interface MoreTabProps {
  appVersion?: string
  expandWalletListOnOpen: boolean
  pulseExpandWalletList: number
}

export const MoreTabHeader: React.FC = () => {
  const { t } = useI18n()

  return (
    <header className="wallet-main-page__top-bar wallet-main-page__top-bar--collapsed">
      <h1 className="wallet-main-page__tab-title">{t('moreTab')}</h1>
    </header>
  )
}

export const MoreTabBody: React.FC<MoreTabProps> = ({
  appVersion,
  expandWalletListOnOpen,
  pulseExpandWalletList,
}) => {
  return (
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
  )
}

const MoreTab: React.FC<MoreTabProps> = (props) => {
  return (
    <>
      <MoreTabHeader />
      <MoreTabBody {...props} />
    </>
  )
}

export default MoreTab
