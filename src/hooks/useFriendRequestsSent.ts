import { useCallback, useEffect, useState } from 'preact/hooks'

import type { Alias } from '../types/alias'

const STORAGE_KEY = 'lastRunFriendRequestsSent'

export const useFriendRequestsSent = () => {
    const [friendRequestsSent, setFriendRequestsSent] = useState<Alias[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        chrome.storage.local.get(
            { [STORAGE_KEY]: [] as Alias[] },
            (result: { [key: string]: Alias[] }) => {
                setFriendRequestsSent(result[STORAGE_KEY] || [])
                setLoading(false)
            },
        )

        const listener = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: chrome.storage.AreaName,
        ) => {
            if (areaName !== 'local') return
            if (changes[STORAGE_KEY]) {
                const newValue = changes[STORAGE_KEY].newValue as Alias[]
                setFriendRequestsSent(newValue || [])
            }
        }

        chrome.storage.onChanged.addListener(listener)

        return () => chrome.storage.onChanged.removeListener(listener)
    }, [])

    const removeOne = useCallback(
        (steamId: string) => {
            const updated = friendRequestsSent.filter((alias) => alias.steamId !== steamId)
            chrome.storage.local.set({ [STORAGE_KEY]: updated })
        },
        [friendRequestsSent],
    )

    const clearAll = useCallback(() => {
        chrome.storage.local.set({ [STORAGE_KEY]: [] })
    }, [])

    return { friendRequestsSent, loading, removeOne, clearAll }
}
