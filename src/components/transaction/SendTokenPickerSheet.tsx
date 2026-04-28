import React, { useEffect, useMemo, useState } from 'react'
import {
  chainToAccountAssetsNetwork,
  NATIVE_COIN_ICON,
} from '../../config/chains'
import { useAuth } from '../../contexts/AuthContext'
import {
  chainTokenDisplayName,
  chainTokenDisplaySymbol,
  formatChainTokenBalance,
  formatChainTokenPositionUsd,
} from '../../features/balance/balanceManager'
import { getTokensForNetwork } from '../../models/ChainTokens'
import ChainIcon from '../ChainIcon'
import TransactionSheet from './TransactionSheet'
import type { SendTokenOption } from './types'

interface SendTokenPickerSheetProps {
  onClose: () => void
  onSelectToken: (token: SendTokenOption) => void
}

const SendTokenPickerSheet: React.FC<SendTokenPickerSheetProps> = ({
  onClose,
  onSelectToken,
}) => {
  const { activeChain, CHAINS, switchChain } = useAuth()
  const [activeTab, setActiveTab] = useState<'mainnet' | 'testnet'>('mainnet')
  const [searchTerm, setSearchTerm] = useState('')
  const networkOptions = useMemo(() => {
    const seen = new Set<string>()
    return CHAINS.map((chain) => {
      const network = chainToAccountAssetsNetwork(chain)
      if (!network || seen.has(network)) return null
      seen.add(network)
      return { network, label: chain.name, chain }
    }).filter(
      (
        v
      ): v is {
        network: string
        label: string
        chain: (typeof CHAINS)[number]
      } => v != null
    )
  }, [CHAINS])
  const [selectedChainId, setSelectedChainId] = useState<number | string>(
    activeChain?.id
  )
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false)

  useEffect(() => {
    setSelectedChainId(activeChain?.id)
  }, [activeChain?.id])

  const isTestnet = (name: string): boolean => {
    const n = name.toLowerCase()
    return (
      n.includes('testnet') ||
      n.includes('sepolia') ||
      n.includes('goerli') ||
      n.includes('mumbai') ||
      n.includes('devnet')
    )
  }

  const menuOptions = useMemo(() => {
    const byTab = networkOptions.filter((x) =>
      activeTab === 'testnet'
        ? isTestnet(x.chain.name)
        : !isTestnet(x.chain.name)
    )
    if (!searchTerm.trim()) return byTab
    const q = searchTerm.trim().toLowerCase()
    return byTab.filter((x) => x.chain.name.toLowerCase().includes(q))
  }, [activeTab, networkOptions, searchTerm])

  const mainnetCount = useMemo(
    () => networkOptions.filter((x) => !isTestnet(x.chain.name)).length,
    [networkOptions]
  )
  const testnetCount = useMemo(
    () => networkOptions.filter((x) => isTestnet(x.chain.name)).length,
    [networkOptions]
  )

  const rows = useMemo(() => {
    const selectedOption = networkOptions.find(
      (x) => x.chain.id === selectedChainId
    )
    if (!selectedOption) return []
    const cached = getTokensForNetwork(selectedOption.network) ?? []
    if (cached.length > 0) return cached
    return [
      {
        address: '',
        network: selectedOption.network,
        tokenAddress: null,
        tokenBalance: '0x0',
        tokenMetadata: {
          decimals: 18,
          logo: null,
          name: selectedOption.chain.name,
          symbol: selectedOption.chain.symbol,
        },
        tokenPrices: [],
      },
    ]
  }, [networkOptions, selectedChainId])

  const selectedChain =
    networkOptions.find((x) => x.chain.id === selectedChainId)?.chain ??
    activeChain
  const selectedNetworkOption = networkOptions.find(
    (x) => x.chain.id === selectedChainId
  )
  const selectedNetworkLabel =
    selectedNetworkOption?.label ?? activeChain?.name ?? 'Current Chain'

  return (
    <TransactionSheet variant="fullscreen">
      <div className="send-picker__header">
        <button
          type="button"
          className="send-picker__back"
          onClick={onClose}
          aria-label="Back"
        >
          ‹
        </button>
      </div>
      <h2 className="send-picker__title">Select Token</h2>
      <div className="send-picker__network-select-wrap">
        <button
          type="button"
          className="send-picker__network-select"
          onClick={() => setNetworkMenuOpen((v) => !v)}
          aria-expanded={networkMenuOpen}
        >
          <span className="send-picker__network-selected">
            {selectedNetworkOption && (
              <span className="send-picker__network-selected-icon">
                <ChainIcon
                  icon={selectedNetworkOption.chain.icon}
                  symbol={selectedNetworkOption.chain.symbol}
                  size={20}
                />
              </span>
            )}
            <span>{selectedNetworkLabel}</span>
          </span>
          <span className="send-picker__network-arrow">▾</span>
        </button>
        {networkMenuOpen && (
          <>
            <button
              type="button"
              className="send-picker__network-backdrop"
              onClick={() => setNetworkMenuOpen(false)}
              aria-label="Close network selector"
            />
            <div className="send-picker__network-dropdown">
              <div className="send-picker__network-search-wrap">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="send-picker__network-search"
                  placeholder="Search chains..."
                />
              </div>
              <div className="send-picker__network-tabs">
                <button
                  type="button"
                  className={`send-picker__network-tab ${activeTab === 'mainnet' ? 'active' : ''}`}
                  onClick={() => setActiveTab('mainnet')}
                >
                  Mainnet ({mainnetCount})
                </button>
                <button
                  type="button"
                  className={`send-picker__network-tab ${activeTab === 'testnet' ? 'active' : ''}`}
                  onClick={() => setActiveTab('testnet')}
                >
                  Testnet ({testnetCount})
                </button>
              </div>
              <div className="send-picker__network-list">
                {menuOptions.map((opt) => (
                  <button
                    key={opt.network}
                    type="button"
                    className={`send-picker__network-option ${selectedChainId === opt.chain.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedChainId(opt.chain.id)
                      switchChain(opt.chain.id)
                      setNetworkMenuOpen(false)
                    }}
                  >
                    <span className="send-picker__network-option-row">
                      <span className="option-icon">
                        <ChainIcon
                          icon={opt.chain.icon}
                          symbol={opt.chain.symbol}
                          size={24}
                        />
                      </span>
                      <span className="send-picker__network-option-name">
                        {opt.label}
                      </span>
                      {selectedChainId === opt.chain.id && (
                        <span className="check-mark">✓</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="send-picker__list">
        {selectedChain &&
          rows.map((token) => {
            const symbol = chainTokenDisplaySymbol(token, selectedChain)
            const name = chainTokenDisplayName(token, selectedChain)
            const amount = formatChainTokenBalance(token, selectedChain, 6)
            const usd = formatChainTokenPositionUsd(token)
            const logoUrl = token.tokenMetadata.logo?.trim()
            const symbolIcon = NATIVE_COIN_ICON[symbol]
            const isNative = token.tokenAddress == null
            const sendToken: SendTokenOption =
              token.tokenAddress == null
                ? { type: 'native', symbol: selectedChain.symbol }
                : {
                    type: 'erc20',
                    token: {
                      address: token.tokenAddress,
                      symbol,
                      name,
                      decimals: token.tokenMetadata.decimals ?? 18,
                      logo: token.tokenMetadata.logo,
                    },
                  }

            return (
              <button
                key={`${token.network}:${token.tokenAddress ?? 'native'}`}
                type="button"
                className="send-picker__row"
                onClick={() => onSelectToken(sendToken)}
              >
                <span className="send-picker__avatar">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={symbol}
                      className="send-picker__logo"
                    />
                  ) : symbolIcon ? (
                    <img
                      src={symbolIcon}
                      alt={symbol}
                      className="send-picker__logo"
                    />
                  ) : isNative ? (
                    <ChainIcon
                      icon={selectedChain.icon}
                      symbol={symbol}
                      size={40}
                    />
                  ) : (
                    <span className="send-picker__avatar-fallback">
                      {symbol.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="send-picker__meta">
                  <span className="send-picker__symbol">{symbol}</span>
                  <span className="send-picker__name">{name}</span>
                </span>
                <span className="send-picker__value">
                  <span>{amount}</span>
                  <span>{usd}</span>
                </span>
              </button>
            )
          })}
      </div>
    </TransactionSheet>
  )
}

export default SendTokenPickerSheet
