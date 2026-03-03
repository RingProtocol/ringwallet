import React from 'react'
import './globals.css'

export const metadata = {
  title: 'Ring Wallet',
  description: 'A React wallet application with Passkey authentication',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/favicon.png',
    apple: [
      { url: '/icons/logo.png' },
      { url: '/icons/logo.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/logo.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/logo.png', sizes: '120x120', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Ring Wallet',
    statusBarStyle: 'black-translucent',
  },
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


