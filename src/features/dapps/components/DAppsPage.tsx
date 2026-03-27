import React, { useState, useCallback } from 'react'
import DAppList from './DAppList'
import DAppContainer from './DAppContainer'
import type { DAppInfo } from '../types/dapp'
import './DApps.css'

function getTestIndex(): number | null {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search)
  const v = p.get('test')
  if (v === null) return null
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

const DAppsPage: React.FC = () => {
  const [activeDApp, setActiveDApp] = useState<DAppInfo | null>(null)
  const [testFired, setTestFired] = useState(false)

  const onDAppsReady = useCallback((dapps: DAppInfo[]) => {
    if (testFired) return
    const idx = getTestIndex()
    if (idx === null) return
    if (idx < 0 || idx >= dapps.length) return
    setTestFired(true)
    const target = dapps[idx]
    setTimeout(() => setActiveDApp(target), 5000)
  }, [testFired])

  if (activeDApp) {
    return (
      <DAppContainer
        dapp={activeDApp}
        onBack={() => setActiveDApp(null)}
      />
    )
  }

  return <DAppList onSelectDApp={setActiveDApp} onDAppsReady={onDAppsReady} />
}

export default DAppsPage
