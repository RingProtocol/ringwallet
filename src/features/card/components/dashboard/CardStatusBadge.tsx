import React from 'react'
import type { CardStatus } from '../../types'
import '../Card.css'

interface Props {
  status: CardStatus
}

const STATUS_CONFIG: Record<CardStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'card-status-badge--active' },
  frozen: { label: 'Frozen', className: 'card-status-badge--frozen' },
  pending_kyc: { label: 'Pending', className: 'card-status-badge--pending' },
  closed: { label: 'Closed', className: 'card-status-badge--closed' },
}

const CardStatusBadge: React.FC<Props> = ({ status }) => {
  const config = STATUS_CONFIG[status]

  return (
    <span className={`card-status-badge ${config.className}`}>
      <span
        className="card-status-badge__dot"
        aria-hidden="true"
      />
      {config.label}
    </span>
  )
}

export default CardStatusBadge
