"use client"

import { useState } from "react"
import AppItem from "./AppItem"
import IframeModal from "./IframeModal"

const appsConfig = [
    {
        icon: "/icons/ringcorn.svg",
        name: "Ring",
        url: "https://ring.exchange"
    },
    {
        icon: "/favicon.png",
        name: "Baidu",
        url: "https://baidu.com"
    },
    {
        icon: "/favicon.png",
        name: "Google",
        url: "https://google.com"
    },
    {
        icon: "/favicon.png",
        name: "Uniswap",
        url: "https://uniswap.org"
    },
    {
        icon: "/favicon.png",
        name: "OpenSea",
        url: "https://opensea.io"
    },
    {
        icon: "/favicon.png",
        name: "CoinGecko",
        url: "https://coingecko.com"
    }
]

export default function AppsList() {
    const [iframeModal, setIframeModal] = useState<{
        isOpen: boolean
        url: string
        title: string
    }>({
        isOpen: false,
        url: "",
        title: ""
    })

    const openInIframeClick = (url: string, title: string) => () => {
        setIframeModal({
            isOpen: true,
            url,
            title
        })
    }

    const closeIframe = () => {
        setIframeModal({
            isOpen: false,
            url: "",
            title: ""
        })
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
                        onClick={openInIframeClick(app.url, app.name)}
                    />
                ))}
            </div>
            <IframeModal
                isOpen={iframeModal.isOpen}
                onClose={closeIframe}
                url={iframeModal.url}
                title={iframeModal.title}
            />
        </div>
    )
}
