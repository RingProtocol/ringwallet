import React from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

interface WalletCandidate {
  address: string
  index: number
}

interface OwnWalletAddressDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallets: WalletCandidate[]
  activeWalletIndex: number
  onSelect: (address: string) => void
  shortenAddress?: (address: string) => string
}

const defaultShortenAddress = (address: string): string => {
  if (!address) return ''
  return `${address.substring(0, 6)}…${address.substring(address.length - 4)}`
}

const OwnWalletAddressDrawer: React.FC<OwnWalletAddressDrawerProps> = ({
  open,
  onOpenChange,
  wallets,
  activeWalletIndex,
  onSelect,
  shortenAddress = defaultShortenAddress,
}) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="own-wallet-sheet">
          <DrawerHeader className="own-wallet-sheet__head px-0 pb-1 pt-2 text-left">
            <DrawerTitle>Select My Wallet Address</DrawerTitle>
          </DrawerHeader>

          <div className="own-wallet-sheet__list">
            {wallets.length === 0 ? (
              <div className="own-wallet-sheet__empty">
                No selectable addresses (cannot send to current wallet address)
              </div>
            ) : (
              wallets.map((wallet) => (
                <button
                  key={`${wallet.address}:${wallet.index}`}
                  type="button"
                  className={`own-wallet-sheet__item ${wallet.index === activeWalletIndex ? 'active' : ''}`}
                  onClick={() => {
                    onSelect(wallet.address)
                    onOpenChange(false)
                  }}
                >
                  <span className="own-wallet-sheet__item-title">
                    Wallet #{wallet.index + 1}
                  </span>
                  <span className="own-wallet-sheet__item-address">
                    {shortenAddress(wallet.address)}
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            className="secondary-btn own-wallet-sheet__close"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default OwnWalletAddressDrawer
