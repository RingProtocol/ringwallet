import React from 'react'
import type { TopUpAsset } from '../../types'
import '../Card.css'

interface Props {
  assets: TopUpAsset[]
  selected?: TopUpAsset
  onSelect: (asset: TopUpAsset) => void
  onBack: () => void
}

const CHAIN_ICONS: Record<string, string> = {
  ethereum: '\u269E\uFE0F',
  polygon: '\uD83D\uDFE7',
  arbitrum: '\uD83D\uDFE3',
  optimism: '\uD83D\uDFE2',
  solana: '\uD83D\uDFE0',
  base: '\uD83D\uDFE4',
}

const TopUpAssetSelect: React.FC<Props> = ({
  assets,
  selected,
  onSelect,
  onBack,
}) => {
  return (
    <div className="topup-asset-select">
      <div className="topup-asset-select__header">
        <button
          type="button"
          className="topup-asset-select__back"
          onClick={onBack}
          aria-label="Back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h3 className="topup-asset-select__title">Select Asset</h3>
      </div>

      <div className="topup-asset-select__list">
        {assets.map((asset) => {
          const isSelected = selected?.symbol === asset.symbol && selected?.chain === asset.chain

          return (
            <button
              key={`${asset.symbol}-${asset.chain}`}
              type="button"
              className={`topup-asset-select__item ${
                isSelected ? 'topup-asset-select__item--selected' : ''
              }`}
              onClick={() => onSelect(asset)}
            >
              <span className="topup-asset-select__item-icon">
                {CHAIN_ICONS[asset.chain.toLowerCase()] || '\uD83D\uDCB0'}
              </span>
              <div className="topup-asset-select__item-info">
                <span className="topup-asset-select__item-symbol">
                  {asset.symbol}
                </span>
                <span className="topup-asset-select__item-chain">
                  {asset.chain}
                </span>
              </div>
              <span className="topup-asset-select__item-balance">
                {parseFloat(asset.balance).toFixed(4)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TopUpAssetSelect
