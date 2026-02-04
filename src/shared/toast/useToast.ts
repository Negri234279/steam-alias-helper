import { useCallback, useState } from "preact/hooks"

export type ToastType = "success" | "error" | "info"

export interface Toast {
    id: number
    message: string
    type: ToastType
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback(
        (message: string, type: ToastType = "info", timeout = 1500) => {
            const id = Date.now()

            setToasts((t) => [...t, { id, message, type }])

            setTimeout(() => {
                setToasts((t) => t.filter((toast) => toast.id !== id))
            }, timeout)
        },
        []
    )

    const removeToast = useCallback((id: number) => {
        setToasts((t) => t.filter((toast) => toast.id !== id))
    }, [])

    return { toasts, showToast, removeToast }
}
