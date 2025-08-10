"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"  // Assuming shadcn/ui or similar
import { useUser } from "@/hooks/use-user"  // Adapt if needed
import axios from "axios"

import { TransactionsProvider } from "@/providers/transactions-provider"

import Activity from "@/components/activity"
import Assets from "@/components/assets"
import WalletCard from "@/components/wallet-card"

declare global {
  interface Window {
    workbox: any;
  }
}

export default function Dashboard() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [swSubscription, setSwSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSwSubscription(sub)
          }
        })
        setSwRegistration(reg)
      })
    }
  }, [])

  const handleEnableNotifications = async () => {
    if (!process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY) {
      throw new Error('Environment variables supplied not sufficient.')
    }
    if (!swRegistration) {
      console.error('No SW registration available.')
      return
    }
    const sub = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
    })
    await axios.post(
      '/api/push-notifications/save-subscription',
      {
        subscription: sub,
        subscriptionSerialized: JSON.stringify(sub),
      },
      { withCredentials: true }
    )
    // Refresh user data if needed
    alert('Notifications enabled!')
  }

  const { user } = useUser()

  return (
    <main className="container mx-auto space-y-4 p-2 sm:p-8 lg:space-y-8 xl:px-12 2xl:px-24">
      <TransactionsProvider>
        <WalletCard />
        <div className="mt-4">
          {!user?.web_push_subscription && (
            <Button onClick={handleEnableNotifications}>
              Enable Notifications
            </Button>
          )}
          {!!user?.web_push_subscription && (
            <Button disabled>
              Notifications Enabled
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Assets />
          <Activity />
        </div>
      </TransactionsProvider>
    </main>
  )
}
