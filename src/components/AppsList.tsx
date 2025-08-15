import AppItem from "./AppItem"

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
                    />
                ))}
            </div>
        </div>
    )
}