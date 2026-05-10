import React from 'react'

interface Props {
  label: string
  value: React.ReactNode
  mono?: boolean
  last?: boolean
}

const InfoRow: React.FC<Props> = ({ label, value, mono, last }) => (
  <div className={`swap-info-row ${last ? 'swap-info-row--last' : ''}`}>
    <span className="swap-info-row__label">{label}</span>
    <span
      className={`swap-info-row__value ${mono ? 'swap-info-row__value--mono' : ''}`}
    >
      {value}
    </span>
  </div>
)

export default InfoRow
