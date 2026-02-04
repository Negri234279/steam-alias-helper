import { useCallback, useEffect, useMemo, useState } from "preact/hooks"

import { sendSteamMessage } from "../shared/chrome"
import { STORAGE_KEY, type Alias } from "../types/alias"

export type AliasesState = {
    data: Alias[]
    loading: boolean
    error: string | null
}

export function useSteamAliases(opts?: { autoLoad?: boolean; syncStorage?: boolean }) {
    const autoLoad = opts?.autoLoad ?? true
    const syncStorage = opts?.syncStorage ?? false

    const [state, setState] = useState<AliasesState>({
        data: [],
        loading: true,
        error: null
    })

    const refresh = useCallback(async () => {
        setState((p) => ({ ...p, loading: true, error: null }))

        try {
            const res = await sendSteamMessage({ type: "ALIASES_GET" })

            if (res.ok) setState({ data: res.data ?? [], loading: false, error: null })
            else setState({ data: [], loading: false, error: res.error })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            setState({ data: [], loading: false, error: message })
        }
    }, [])

    const upsert = useCallback(async (payload: Alias) => {
        setState((p) => ({ ...p, loading: true, error: null }))

        try {
            const res = await sendSteamMessage({
                type: "ALIAS_UPSERT",
                payload
            })

            if (!res.ok) {
                throw new Error(res.error ?? "Unknown error")
            }

            setState({ data: res.data, loading: false, error: null })

        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            setState((p) => ({ ...p, loading: false, error: message }))
        }
    }, [])

    const upsertAll = useCallback(async (payload: Alias[]) => {
        setState((p) => ({ ...p, loading: true, error: null }))

        try {
            const res = await sendSteamMessage({
                type: "ALIASES_UPSERT",
                payload
            })

            if (!res.ok) {
                throw new Error(res.error ?? "Unknown error")
            }

            setState({ data: res.data, loading: false, error: null })

        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            setState((p) => ({ ...p, loading: false, error: message }))
        }
    }, [])

    const remove = useCallback(async (steamId: string) => {
        setState((p) => ({ ...p, loading: true, error: null }))

        try {
            const res = await sendSteamMessage({
                type: "ALIASES_REMOVE",
                payload: { steamId }
            })

            if (!res.ok) {
                throw new Error(res.error ?? "Unknown error")
            }

            setState({ data: res.data, loading: false, error: null })

        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            setState((p) => ({ ...p, loading: false, error: message }))
        }
    }, [])

    useEffect(() => {
        if (!syncStorage) return

        const listener = (changes: any, areaName: string) => {
            if (areaName !== "local") return
            const next = changes[STORAGE_KEY]?.newValue
            if (Array.isArray(next)) {
                setState((p) => ({ ...p, data: next, loading: false, error: null }))
            }
        }

        chrome.storage.onChanged.addListener(listener)
        return () => chrome.storage.onChanged.removeListener(listener)
    }, [syncStorage])

    useEffect(() => {
        if (autoLoad) refresh()
    }, [autoLoad, refresh])

    const actions = useMemo(
        () => ({ refresh, upsert, upsertAll, remove }),
        [refresh, upsert, upsertAll, remove]
    )

    return { state, ...actions }
}
