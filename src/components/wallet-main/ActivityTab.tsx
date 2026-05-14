import React from 'react'
import TransactionHistory from '../history/TransactionHistory'
import { useI18n } from '../../i18n'
import { useAuth } from '../../contexts/AuthContext'
import ChainSwitcher from '../chains/ChainSwitcher'

interface ActivityTabHeaderProps {
  selectedChainId: number | string | null
  onChainSelect: (id: number | string) => void
}

interface ActivityTabBodyProps {
  selectedChainId: number | string | null
}

export const ActivityTabHeader: React.FC<ActivityTabHeaderProps> = ({
  selectedChainId,
  onChainSelect,
}) => {
  const { t } = useI18n()
  const { activeChain } = useAuth()

  return (
    <header className="wallet-main-page__top-bar wallet-main-page__top-bar--collapsed">
      <h1 className="wallet-main-page__tab-title">{t('activityTab')}</h1>
      <ChainSwitcher
        selectedChainId={selectedChainId ?? activeChain?.id}
        onSelect={onChainSelect}
      />
    </header>
  )
}

export const ActivityTabBody: React.FC<ActivityTabBodyProps> = ({
  selectedChainId,
}) => {
  const { CHAINS } = useAuth()
  const chainOverride =
    selectedChainId !== null
      ? CHAINS.find((c) => c.id === selectedChainId)
      : undefined

  return (
    <div className="wallet-main-page__activity">
      <TransactionHistory chainOverride={chainOverride} />
    </div>
  )
}

const ActivityTab: React.FC = () => {
  const { activeChain } = useAuth()
  const [selectedChainId, setSelectedChainId] = React.useState<
    number | string | null
  >(null)

  return (
    <>
      <ActivityTabHeader
        selectedChainId={selectedChainId ?? activeChain?.id ?? null}
        onChainSelect={setSelectedChainId}
      />
      <ActivityTabBody selectedChainId={selectedChainId} />
    </>
  )
}

export default ActivityTab
