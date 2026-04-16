import React from 'react'

interface ChainIconProps {
  icon?: string
  symbol: string
  size?: number
}

const ChainIcon: React.FC<ChainIconProps> = ({ icon, symbol, size = 20 }) => {
  if (icon) {
    return (
      <img
        src={icon}
        alt={symbol}
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }}
      />
    )
  }

  // Fallback: first letter in a gradient circle
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.55,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {symbol.charAt(0).toUpperCase()}
    </span>
  )
}

export default ChainIcon
