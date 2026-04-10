import React, { useState, useRef, useEffect } from 'react'
import { useAuth, type Chain } from '../../contexts/AuthContext'
import { FEATURED_CHAIN_IDS, FEATURED_TESTNET_IDS } from '../../config/chains'
import { safeGetItem, safeSetItem } from '../../utils/safeStorage'
import ChainIcon from '../ChainIcon'
import { TESTID } from '../testids'
import './ChainSwitcher.css'

const USER_CHAINS_KEY = 'user_added_chain_ids'
const OPEN_CHAIN_SWITCHER_EVENT = 'ring:open-chain-switcher'

type DropdownPosition = {
  top: number
  left: number
}

type OpenChainSwitcherDetail = {
  anchorRect?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

function loadUserAddedIds(): (number | string)[] {
  try {
    const raw = safeGetItem(USER_CHAINS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const ALL_FEATURED = new Set([...FEATURED_CHAIN_IDS, ...FEATURED_TESTNET_IDS])

const ChainSwitcher: React.FC = () => {
  const { activeChain, switchChain, CHAINS } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'mainnet' | 'testnet'>('mainnet')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addSearchTerm, setAddSearchTerm] = useState('')
  const [userAddedIds, setUserAddedIds] =
    useState<(number | string)[]>(loadUserAddedIds)
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent | TouchEvent | PointerEvent
    ) => {
      // Handle in capture phase so this still runs even if bubbling is stopped
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (isOpen) {
          setIsOpen(false)
        }
      }
    }

    if (isOpen) {
      // Force capture listeners so child e.stopPropagation() can't block closing
      document.addEventListener('pointerdown', handleClickOutside, {
        capture: true,
      })
      document.addEventListener('touchstart', handleClickOutside, {
        capture: true,
      })
      document.addEventListener('mousedown', handleClickOutside, {
        capture: true,
      })
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, {
        capture: true,
      })
      document.removeEventListener('touchstart', handleClickOutside, {
        capture: true,
      })
      document.removeEventListener('mousedown', handleClickOutside, {
        capture: true,
      })
    }
  }, [isOpen])

  useEffect(() => {
    const handleOpenSwitcher = (event: Event) => {
      const customEvent = event as CustomEvent<OpenChainSwitcherDetail>
      const anchorRect = customEvent.detail?.anchorRect

      setIsOpen(true)
      setSearchTerm('')
      setAddSearchTerm('')
      setShowAddPanel(false)
      setActiveTab(isTestnet(activeChain) ? 'testnet' : 'mainnet')

      if (anchorRect && typeof window !== 'undefined') {
        const menuWidth = 280
        const viewportPadding = 12
        const left = Math.min(
          Math.max(viewportPadding, anchorRect.right - menuWidth),
          window.innerWidth - menuWidth - viewportPadding
        )
        const top = anchorRect.bottom + 8
        setDropdownPosition({ top, left })
      } else {
        setDropdownPosition(null)
      }
    }

    window.addEventListener(OPEN_CHAIN_SWITCHER_EVENT, handleOpenSwitcher)
    return () => {
      window.removeEventListener(OPEN_CHAIN_SWITCHER_EVENT, handleOpenSwitcher)
    }
  }, [activeChain])

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
      setAddSearchTerm('')
      setShowAddPanel(false)
      setActiveTab(isTestnet(activeChain) ? 'testnet' : 'mainnet')
      setDropdownPosition(null)
    }
  }

  const handleSelect = (chainId: number | string) => {
    switchChain(chainId)
    setIsOpen(false)
    setDropdownPosition(null)
  }

  const isTestnet = (chain: Chain): boolean => {
    const name = chain.name.toLowerCase()
    return (
      name.includes('testnet') ||
      name.includes('sepolia') ||
      name.includes('goerli') ||
      name.includes('mumbai') ||
      name.includes('devnet')
    )
  }

  const featuredIds =
    activeTab === 'testnet' ? FEATURED_TESTNET_IDS : FEATURED_CHAIN_IDS

  const enabledChains = (() => {
    const ordered: Chain[] = []
    const seen = new Set<number | string>()

    for (const id of featuredIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const chain = CHAINS.find((c) => c.id === id)
      if (chain) ordered.push(chain)
    }

    //custom chain
    for (const id of userAddedIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const chain = CHAINS.find((c) => c.id === id)
      if (chain) {
        const matchesTab =
          activeTab === 'testnet' ? isTestnet(chain) : !isTestnet(chain)
        if (matchesTab) ordered.push(chain)
      }
    }

    return ordered
  })()

  const filteredChains = enabledChains.filter((chain) =>
    chain.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const enabledIdSet = new Set([...ALL_FEATURED, ...userAddedIds])
  const availableToAdd = CHAINS.filter((chain) => {
    if (enabledIdSet.has(chain.id)) return false
    const matchesTab =
      activeTab === 'testnet' ? isTestnet(chain) : !isTestnet(chain)
    if (!matchesTab) return false
    if (addSearchTerm) {
      return chain.name.toLowerCase().includes(addSearchTerm.toLowerCase())
    }
    return true
  })

  const handleAddChain = (chainId: number | string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = [...userAddedIds, chainId]
    setUserAddedIds(updated)
    safeSetItem(USER_CHAINS_KEY, JSON.stringify(updated))
  }

  const handleRemoveChain = (chainId: number | string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = userAddedIds.filter((id) => id !== chainId)
    setUserAddedIds(updated)
    safeSetItem(USER_CHAINS_KEY, JSON.stringify(updated))
  }

  return (
    <div className="chain-switcher-container" ref={containerRef}>
      <div
        className="chain-switcher-trigger"
        onClick={toggleDropdown}
        data-testid={TESTID.CHAIN_SWITCHER_TRIGGER}
      >
        <div className="chain-icon">
          <ChainIcon
            icon={activeChain.icon}
            symbol={activeChain.symbol}
            size={20}
          />
        </div>
        <div className="chain-info">
          <span className="chain-name">{activeChain.name}</span>
        </div>
        <div className={`arrow ${isOpen ? 'up' : 'down'}`}>▼</div>
      </div>

      {isOpen && (
        <>
          <button
            type="button"
            className="chain-switcher-backdrop"
            aria-label="Close chain switcher"
            onClick={() => {
              setIsOpen(false)
              setDropdownPosition(null)
            }}
          />
          <div
            className={`chain-dropdown ${dropdownPosition ? 'chain-dropdown--anchored' : ''}`}
            style={
              dropdownPosition
                ? {
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    right: 'auto',
                  }
                : undefined
            }
          >
            <div className="dropdown-top-section">
              {!showAddPanel ? (
                <div className="search-row">
                  <input
                    type="text"
                    placeholder="Search chains..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="chain-search-input"
                    data-testid={TESTID.CHAIN_SEARCH_INPUT}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    className="add-network-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddPanel(true)
                      setAddSearchTerm('')
                    }}
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="search-row">
                  <button
                    className="back-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddPanel(false)
                    }}
                  >
                    ←
                  </button>
                  <input
                    type="text"
                    placeholder="Search all networks..."
                    value={addSearchTerm}
                    onChange={(e) => setAddSearchTerm(e.target.value)}
                    className="chain-search-input"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              )}
              <div className="tabs-row">
                <button
                  className={`tab-btn ${activeTab === 'mainnet' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab('mainnet')
                  }}
                >
                  Mainnet
                </button>
                <button
                  className={`tab-btn ${activeTab === 'testnet' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab('testnet')
                  }}
                  data-testid={TESTID.CHAIN_TAB_TESTNET}
                >
                  Testnet
                </button>
              </div>
            </div>

            <div className="chain-list-scroll">
              {!showAddPanel ? (
                filteredChains.length > 0 ? (
                  filteredChains.map((chain) => (
                    <div
                      key={chain.id}
                      className={`chain-option ${chain.id === activeChain.id ? 'active' : ''}`}
                      onClick={() => handleSelect(chain.id)}
                      data-testid={TESTID.CHAIN_OPTION}
                      data-chain-id={chain.id}
                    >
                      <div className="option-row">
                        <span className="option-icon">
                          <ChainIcon
                            icon={chain.icon}
                            symbol={chain.symbol}
                            size={18}
                          />
                        </span>
                        <span className="option-name">{chain.name}</span>
                        <span className="option-actions">
                          {chain.id === activeChain.id && (
                            <span className="check-mark">✓</span>
                          )}
                          {!ALL_FEATURED.has(chain.id) && (
                            <button
                              className="remove-chain-btn"
                              onClick={(e) => handleRemoveChain(chain.id, e)}
                              title="Remove"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-chains-found">No chains found</div>
                )
              ) : availableToAdd.length > 0 ? (
                availableToAdd.map((chain) => (
                  <div
                    key={chain.id}
                    className="chain-option add-chain-option"
                    onClick={(e) => handleAddChain(chain.id, e)}
                  >
                    <div className="option-row">
                      <span className="option-icon">
                        <ChainIcon
                          icon={chain.icon}
                          symbol={chain.symbol}
                          size={18}
                        />
                      </span>
                      <span className="option-name">{chain.name}</span>
                      <span className="add-chain-icon">+</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-chains-found">
                  {addSearchTerm ? 'No chains found' : 'All networks added'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ChainSwitcher
