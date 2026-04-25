import type { Viewport } from 'next'
import React from 'react'
import './globals.css'
import { I18nProvider } from '../src/i18n'

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div id="root">
          <I18nProvider>{children}</I18nProvider>
        </div>
      </body>
    </html>
  )
}
