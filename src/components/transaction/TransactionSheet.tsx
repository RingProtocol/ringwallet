import React from 'react'
import '../TransactionActions.css'

interface TransactionSheetProps {
  children: React.ReactNode
  variant?: 'modal' | 'sheet'
  contentClassName?: string
}

const TransactionSheet: React.FC<TransactionSheetProps> = ({
  children,
  variant = 'modal',
  contentClassName,
}) => {
  return (
    <div
      className={[
        'modal-overlay',
        variant === 'sheet' ? 'modal-overlay--sheet' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'modal-content',
          variant === 'sheet' ? 'modal-content--sheet' : '',
          contentClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default TransactionSheet
