import { createContext } from 'preact'
import { useCallback, useContext, useMemo, useState } from 'preact/hooks'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
    id: string
    message: string
    type: ToastType
    timeoutMs: number
}

type ToastContextValue = {
    show: (message: string, type?: ToastType, timeoutMs?: number) => void
    success: (message: string, timeoutMs?: number) => void
    error: (message: string, timeoutMs?: number) => void
    info: (message: string, timeoutMs?: number) => void
    dismiss: (id: string) => void
    toasts: Toast[]
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: preact.ComponentChildren }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const show = useCallback(
        (message: string, type: ToastType = 'info', timeoutMs = 1500) => {
            const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`

            setToasts((prev) => [...prev, { id, message, type, timeoutMs }])

            window.setTimeout(() => dismiss(id), timeoutMs)
        },
        [dismiss],
    )

    const value = useMemo<ToastContextValue>(
        () => ({
            toasts,
            show,
            dismiss,
            success: (m, t) => show(m, 'success', t),
            error: (m, t) => show(m, 'error', t),
            info: (m, t) => show(m, 'info', t),
        }),
        [toasts, show, dismiss],
    )

    return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within <ToastProvider />')
    return ctx
}
