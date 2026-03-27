import React, { useState, useMemo, useEffect } from 'react'
import { useDAppList } from '../hooks/useDAppList'
import DAppCard from './DAppCard'
import type { DAppInfo } from '../types/dapp'

interface Props {
  onSelectDApp: (dapp: DAppInfo) => void
  onDAppsReady?: (dapps: DAppInfo[]) => void
}

const DAppList: React.FC<Props> = ({ onSelectDApp, onDAppsReady }) => {
  const { dapps, categories, loading, error, reload } = useDAppList()

  useEffect(() => {
    if (!loading && dapps.length > 0 && onDAppsReady) {
      onDAppsReady(dapps)
    }
  }, [loading, dapps, onDAppsReady])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = dapps
    if (activeCategory !== 'all') {
      list = list.filter(d => d.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
      )
    }
    return list
  }, [dapps, activeCategory, search])

  const featured = useMemo(() => dapps.filter(d => d.featured), [dapps])

  if (loading) {
    return (
      <div className="dapp-list">
        <div className="dapp-list__loading">
          <div className="dapp-list__spinner" />
          <span>加载 DApps...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dapp-list">
        <div className="dapp-list__error">
          <span>加载失败: {error}</span>
          <button className="dapp-list__retry-btn" onClick={reload}>重试</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dapp-list">
      <div className="dapp-list__search">
        <input
          type="text"
          placeholder="搜索 DApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="dapp-list__search-input"
        />
      </div>

      {!search && featured.length > 0 && (
        <div className="dapp-list__featured">
          {featured.map(d => (
            <button key={d.id} className="dapp-featured-card" onClick={() => onSelectDApp(d)}>
              <img className="dapp-featured-card__icon" src={d.icon || undefined} alt={d.name} />
              <span className="dapp-featured-card__name">{d.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="dapp-list__categories">
        <button
          className={`dapp-category-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`dapp-category-btn ${activeCategory === c.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="dapp-list__grid">
        {filtered.length === 0 ? (
          <div className="dapp-list__empty">暂无 DApp</div>
        ) : (
          filtered.map(d => (
            <DAppCard key={d.id} dapp={d} onClick={onSelectDApp} />
          ))
        )}
      </div>
    </div>
  )
}

export default DAppList
