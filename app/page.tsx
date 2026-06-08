'use client'

import dynamic from 'next/dynamic'

const App = dynamic(() => import('../apps/pwa/App'), {
  ssr: false,
})

export default function Page() {
  return <App />
}
