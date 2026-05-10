import React from 'react'
import '../Card.css'

interface Props {
  frozen: boolean
  onToggle: () => void
  loading?: boolean
}

const CardFreezeToggle: React.FC<Props> = ({ frozen, onToggle, loading = false }) => {
  return (
    <button
      type="button"
      className={`card-freeze-toggle ${frozen ? 'card-freeze-toggle--frozen' : ''}`}
      onClick={onToggle}
      disabled={loading}
      aria-label={frozen ? 'Unfreeze card' : 'Freeze card'}
      role="switch"
      aria-checked={frozen}
    >
      <span className="card-freeze-toggle__track">
        <span className="card-freeze-toggle__thumb" />
      </span>
      {loading && <span className="card-freeze-toggle__loading-text">...</span>}
    </button>
  )
}

export default CardFreezeToggle
