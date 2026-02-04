import { STORAGE_KEY, type Alias } from "../types/alias"

export type MsgSteam =
    | { type: "ALIASES_GET" }
    | { type: "ALIAS_UPSERT"; payload: Alias }
    | { type: "ALIASES_UPSERT"; payload: Alias[] }
    | { type: "ALIASES_REMOVE"; payload: Pick<Alias, "steamId"> }

export type ResponseOkSteam = {
    "ALIASES_GET": { ok: true; data: Alias[] },
    "ALIAS_UPSERT": { ok: true; data: Alias[] },
    "ALIASES_UPSERT": { ok: true; data: Alias[] },
    "ALIASES_REMOVE": { ok: true; data: Alias[] },
}

export type ResponseErrorSteam = { ok: false; error: string }

export type ResponseSteam = ResponseOkSteam[MsgSteam["type"]] | ResponseErrorSteam

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "LOG") {
        console.log(`[${msg.from}]`, msg.payload)
    }
})

chrome.runtime.onMessage.addListener((msg: MsgSteam, _sender, sendResponse: (response: ResponseSteam) => void) => {
    (async () => {
        try {
            if (msg.type === "ALIASES_GET") {
                const aliases = await getAliases()

                sendResponse({ ok: true, data: aliases })
            }

            else if (msg.type === "ALIAS_UPSERT") {
                const aliases = await upsertAlias(msg.payload)

                sendResponse({ ok: true, data: aliases })
            }

            else if (msg.type === "ALIASES_UPSERT") {
                const aliases = await saveAliases(msg.payload)

                sendResponse({ ok: true, data: aliases })
            }

            else if (msg.type === "ALIASES_REMOVE") {
                const aliases = await removeAlias(msg.payload.steamId)

                sendResponse({ ok: true, data: aliases })
            }

            else {
                sendResponse({ ok: false, error: "Unknown message type" })
            }

            return
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            sendResponse({ ok: false, error: msg })
        }
    })()

    return true
})

export const getAliases = async (): Promise<Alias[]> => {
    const res = await chrome.storage.local.get({ [STORAGE_KEY]: [] as Alias[] })
    return res[STORAGE_KEY] as Alias[]
}

export const upsertAlias = async (alias: Alias): Promise<Alias[]> => {
    const aliases = await getAliases()
    const index = aliases.findIndex(a => a.steamId === alias.steamId)

    if (index >= 0) {
        aliases[index] = alias
    } else {
        aliases.push(alias)
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: aliases })

    return aliases
}

export const saveAliases = async (aliases: Alias[]): Promise<Alias[]> => {
    await chrome.storage.local.set({ [STORAGE_KEY]: aliases })
    return aliases
}

export const removeAlias = async (steamId: string): Promise<Alias[]> => {
    const aliases = await getAliases()
    const filtered = aliases.filter(a => a.steamId !== steamId)

    await chrome.storage.local.set({ [STORAGE_KEY]: filtered })

    return filtered
}