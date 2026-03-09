import { useState, useCallback } from 'react'
import type { ApprovalRequest } from '../types/approval'

export function useApproval() {
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null)

  const requestApproval = useCallback(
    (request: Omit<ApprovalRequest, 'resolve'>): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setPendingApproval({ ...request, resolve })
      })
    },
    [],
  )

  const approve = useCallback(() => {
    if (pendingApproval) {
      pendingApproval.resolve(true)
      setPendingApproval(null)
    }
  }, [pendingApproval])

  const reject = useCallback(() => {
    if (pendingApproval) {
      pendingApproval.resolve(false)
      setPendingApproval(null)
    }
  }, [pendingApproval])

  return { pendingApproval, requestApproval, approve, reject }
}
