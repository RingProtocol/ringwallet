import React from 'react'
import './globals.css'

export const metadata = {
  title: 'Ring Wallet',
  description: 'A React wallet application with Passkey authentication'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}


