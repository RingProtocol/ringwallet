import React, { useState } from 'react'
import DAppList from './DAppList'
import DAppContainer from './DAppContainer'
import type { DAppInfo } from '../types/dapp'
import './DApps.css'

const DAppsPage: React.FC = () => {
  const [activeDApp, setActiveDApp] = useState<DAppInfo | null>(null)

  if (activeDApp) {
    return (
      <DAppContainer
        dapp={activeDApp}
        onBack={() => setActiveDApp(null)}
      />
    )
  }

  return <DAppList onSelectDApp={setActiveDApp} />
}

export default DAppsPage
