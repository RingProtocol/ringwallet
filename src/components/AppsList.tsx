"use client"

import { useRouter } from "next/navigation"
import AppItem from "./AppItem"
import { appsConfig } from "@/config/apps"

export default function AppsList() {
    const router = useRouter()

    const openInDappsPage = (index: number) => {
        router.push(`/dapps?app=${index}`)
    }

    return (
        <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">应用中心</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {appsConfig.map((app, index) => (
                    <AppItem
                        key={index}
                        icon={app.icon}
                        name={app.name}
                        url={app.url}
                        onClick={() => openInDappsPage(index)}
                    />
                ))}
            </div>
        </div>
    )
}
