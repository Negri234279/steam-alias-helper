import { useEffect, useState } from 'preact/hooks'
import type { Alias } from '../types/alias'

const STORAGE_KEY = 'lastRunNonFriends'

export function useNonFriends() {
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

    return { nonFriends, loading }
}
