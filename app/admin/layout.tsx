import React from 'react'

export const metadata = {
  title: '管理后台 - Ring Wallet',
  description: 'DApp 管理',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f12', color: '#e4e4e7' }}>
      {children}
    </div>
  )
}
