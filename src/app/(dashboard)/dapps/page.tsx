"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { appsConfig } from "@/config/apps"

export default function Dapps() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [currentApp, setCurrentApp] = useState<{
        name: string
        url: string
    } | null>(null)

    useEffect(() => {
        const appIndex = searchParams.get('app')
        if (appIndex !== null) {
            const index = parseInt(appIndex, 10)
            if (index >= 0 && index < appsConfig.length) {
                const app = appsConfig[index]
                setCurrentApp({ name: app.name, url: app.url })
            }
        }
    }, [searchParams])

    const closeIframe = () => {
        router.push('/dashboard')
    }

    if (currentApp) {
        console
        return (
            <main className="flex flex-col h-screen">
                <div className="flex items-center gap-2 p-4 border-b">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeIframe}
                    >
                        <ArrowLeft strokeWidth={2.5} className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-semibold">{currentApp.name}</h1>
                </div>
                <div className="flex-1">
                    <iframe
                        src={currentApp.url}
                        className="w-full h-full border-0"
                        title={currentApp.name}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    />
                </div>
            </main>
        )
    }
    else {
        //router.push('/dashboard')

        return <div>app not found</div>
    }


    return null
}
