import { useCallback, useState } from "preact/hooks"
import { sendSteamMessage } from "../shared/chrome"
import { useToast } from "../shared/toast"
import { sanitizeSteamId, validateSteamId } from "../shared/validateSteamId"
import type { Alias } from "../types/alias"

type IOState = {
    loading: boolean
    error: string | null
}

export const useSteamAliasesIO = () => {
    const [state, setState] = useState<IOState>({ loading: false, error: null })
    const { error: showError } = useToast()

    const exportAliases = useCallback(async (): Promise<void> => {
        setState({ loading: true, error: null })

        try {
            const aliases = await sendSteamMessage({ type: "ALIASES_GET" })
            if (!aliases.ok) {
                throw new Error(aliases.error || "Unknown error")
            }

            const data = JSON.stringify(aliases.data || [], null, 2)

            downloadTextFile(data)

            setState({ loading: false, error: null })
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)

            setState({ loading: false, error: msg })
            showError(msg)
        }
    }, [])

    const importAliases = useCallback(async (file: File, upsertAll: (payload: Alias[]) => Promise<void>): Promise<void> => {
        setState({ loading: true, error: null })

        try {
            const text = await file.text()
            const aliases = JSON.parse(text)

            if (!Array.isArray(aliases)) {
                throw new Error("Formato de archivo inválido, se esperaba un array")
            }

            const sanitizedAliases = sanitizeImport(aliases)

            await upsertAll(sanitizedAliases)

            setState({ loading: false, error: null })
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)

            setState({ loading: false, error: msg })
            showError(msg)
        }
    }, [])

    return {
        state,
        exportAliases,
        importAliases,
    }
}

const downloadTextFile = (content: string) => {
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'steam_aliases.json'
    a.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const sanitizeImport = (data: unknown[]): Alias[] => {
    const map = new Map<string, Alias>()

    for (const item of data) {
        if (typeof item !== 'object' || item === null) continue
        if (!('steamId' in item) || typeof item.steamId !== 'string') continue

        const steamId = sanitizeSteamId(item.steamId)
        if (validateSteamId(steamId)) continue

        const alias = 'alias' in item && typeof item.alias === 'string'
            ? item.alias.trim()
            : ''

        map.set(steamId, { steamId, alias })
    }

    return Array.from(map.values())
}