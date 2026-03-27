'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminToken } from './auth-client'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    const token = getAdminToken()
    if (token) {
      router.replace('/admin/dapps')
    } else {
      router.replace('/admin/login')
    }
  }, [router])

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      Redirecting…
    </div>
  )
}
