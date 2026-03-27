import React from 'react'

export const metadata = {
  title: 'Admin - Ring Wallet',
  description: 'DApp Management',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f12', color: '#e4e4e7' }}>
      {children}
    </div>
  )
}
