"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface IframeModalProps {
    isOpen: boolean
    onClose: () => void
    url: string
    title: string
}

export default function IframeModal({ isOpen, onClose, url, title }: IframeModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
                <DialogHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle>{title}</DialogTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>
                <div className="flex-1 p-4 pt-0">
                    <iframe
                        src={url}
                        className="w-full h-full border-0 rounded-lg"
                        title={title}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}