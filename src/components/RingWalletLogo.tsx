import React from 'react'
import './RingWalletLogo.css'

const RingWalletLogo: React.FC = () => {
  return (
    <div className="ring-wallet-logo" aria-hidden>
      <img
        src="/icons/logo.png"
        alt="Ring Wallet"
        className="ring-wallet-logo__img"
      />
    </div>
  )
}

export default RingWalletLogo
