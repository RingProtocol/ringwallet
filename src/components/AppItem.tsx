import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface AppItemProps {
    icon: string
    name: string
    url: string
    onClick?: () => void
}

export default function AppItem({ icon, name, url, onClick }: AppItemProps) {
    const handleClick = () => {
        if (onClick) {
            onClick()
        } else {
            window.open(url, '_blank')
        }
    }

    return (
        <Card
            className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
            onClick={handleClick}
        >
            <CardContent className="flex flex-col items-center justify-center p-4 space-y-2">
                <div className="w-12 h-12 relative">
                    <Image
                        src={icon}
                        alt={name}
                        fill
                        className="object-contain rounded-lg"
                    />
                </div>
                <span className="text-sm font-medium text-center truncate w-full">
                    {name}
                </span>
            </CardContent>
        </Card>
    )
}