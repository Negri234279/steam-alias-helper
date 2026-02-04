import { useCallback, useEffect, useState } from 'preact/hooks'

import type { Alias } from '../types/alias'

const STORAGE_KEY = 'lastRunNonFriends'

export const useNonFriends = () => {
    const [nonFriends, setNonFriends] = useState<Alias[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        chrome.storage.local.get({ [STORAGE_KEY]: [] as Alias[] }, (result: { [key: string]: Alias[] }) => {
            setNonFriends(result[STORAGE_KEY] || [])
            setLoading(false)
        })

        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: chrome.storage.AreaName) => {
            if (areaName !== 'local') return
            if (changes[STORAGE_KEY]) {
                const newValue = changes[STORAGE_KEY].newValue as Alias[]
                setNonFriends(newValue || [])
            }
        }

        chrome.storage.onChanged.addListener(listener)

        return () => chrome.storage.onChanged.removeListener(listener)
    }, [])

    const removeOne = useCallback((steamId: string) => {
        const updated = nonFriends.filter(alias => alias.steamId !== steamId)
        chrome.storage.local.set({ [STORAGE_KEY]: updated })
    }, [nonFriends])

    const clearAll = useCallback(() => {
        chrome.storage.local.set({ [STORAGE_KEY]: [] })
    }, [])

    return { nonFriends, loading, removeOne, clearAll }
}
