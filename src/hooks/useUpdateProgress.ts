import { useEffect, useState } from 'preact/hooks'

export interface UpdateProgress {
    done: number
    total: number
    statusLine: string
    currentLabel?: string
    finished?: boolean
}

export const useUpdateProgress = () => {
    const [progress, setProgress] = useState<UpdateProgress | null>(null)
    const [runId, setRunId] = useState<string | null>(null)

    useEffect(() => {
        const listener = (message: any) => {
            if (message.type === 'UPDATE_PROGRESS') {
                const prog = message.progress as UpdateProgress
                setProgress(prog)

                if (prog.finished) {
                    setTimeout(() => {
                        setProgress(null)
                        setRunId(null)
                    }, 5000)
                }
            }
        }

        chrome.runtime.onMessage.addListener(listener)

        return () => chrome.runtime.onMessage.removeListener(listener)
    }, [])

    const startTracking = (newRunId: string) => {
        setRunId(newRunId)
        setProgress(null)
    }

    return { progress, runId, startTracking }
}
