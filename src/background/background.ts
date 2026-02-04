import { STORAGE_KEY, type Alias } from "../types/alias"

export type MsgSteam =
    | { type: "ALIASES_GET" }
    | { type: "ALIAS_UPSERT"; payload: Alias }
    | { type: "ALIASES_UPSERT"; payload: Alias[] }
    | { type: "ALIASES_REMOVE"; payload: Pick<Alias, "steamId"> }
    | { type: "START_UPDATE"; payload: { items: Alias[] } }
    | { type: "CANCEL_UPDATE"; payload: { runId: string } }

export type ResponseOkSteam = {
    "ALIASES_GET": { ok: true; data: Alias[] },
    "ALIAS_UPSERT": { ok: true; data: Alias[] },
    "ALIASES_UPSERT": { ok: true; data: Alias[] },
    "ALIASES_REMOVE": { ok: true; data: Alias[] },
    "START_UPDATE": { ok: true, runId: string; progress: { done: number; total: number; statusLine: string } | null },
    "CANCEL_UPDATE": { ok: true },
}

export type ResponseErrorSteam = { ok: false; error: string }

export type ResponseSteam = ResponseOkSteam[MsgSteam["type"]] | ResponseErrorSteam

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "LOG") {
        console.log(`[${msg.from}]`, msg.payload)
    }
})

type CurrentRun = {
    runId: string
    cancelled: boolean
    items: Alias[]
    total: number
    done: number
    tabId: number | null
    nonFriends: Alias[]
}

let currentRun: CurrentRun | null = null

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

            else if (msg.type === "START_UPDATE") {
                if (currentRun) {
                    throw new Error("Ya hay una actualización en curso")
                }

                const runId = makeRunId()
                const items = msg.payload.items

                currentRun = {
                    runId,
                    cancelled: false,
                    items,
                    total: items.length,
                    done: 0,
                    tabId: null,
                    nonFriends: [],
                }

                const progress = progressSnapshot({ statusLine: 'Iniciado.' })

                sendResponse({ ok: true, runId, progress })

                try {
                    await runQueue()
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error)

                    sendProgress(`❌ Error interno: ${msg}`, {
                        finished: true,
                        nonFriends: currentRun?.nonFriends || [],
                    })

                    currentRun = null
                }
            }

            else if (msg.type === "CANCEL_UPDATE") {
                const runId = msg.payload.runId

                if (!currentRun || currentRun.runId !== runId) {
                    sendResponse({ ok: false, error: 'No existe esa ejecución.' })
                    return
                }

                currentRun.cancelled = true

                sendResponse({ ok: true })
            }

            else {
                sendResponse({ ok: false, error: "Mensaje desconocido" })
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

const sleep = (ms: number) => {
    return new Promise((r) => setTimeout(r, ms))
}

const makeRunId = () => {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const progressSnapshot = <T>(extra: T = {} as T) => {
    if (!currentRun) return null

    const { total, done } = currentRun
    return {
        done,
        total,
        ...extra,
    }
}

const sendProgress = (statusLine: string, extra: Record<string, unknown> = {}) => {
    const msg = {
        type: 'UPDATE_PROGRESS',
        progress: {
            ...progressSnapshot(extra),
            statusLine,
        },
    }

    chrome.runtime.sendMessage(msg).catch(() => { })
}

const ensureTab = async (): Promise<number> => {
    if (currentRun?.tabId != null) {
        try {
            await chrome.tabs.get(currentRun.tabId)
            return currentRun.tabId
        } catch {
            currentRun.tabId = null
        }
    }

    const tab = await chrome.tabs.create({
        url: 'https://steamcommunity.com/',
        active: true,
    })

    if (!currentRun) {
        throw new Error("No hay una actualización en curso")
    }

    currentRun.tabId = tab.id!

    return tab.id!
}

function waitForTabComplete(tabId: number, timeoutMs = 25000): Promise<true> {
    return new Promise((resolve, reject) => {
        const started = Date.now()

        const timer = setInterval(async () => {
            if (Date.now() - started > timeoutMs) {
                cleanup()
                reject(new Error('Timeout esperando carga de la pestaña.'))
            }
        }, 500)

        function cleanup() {
            clearInterval(timer)
            chrome.tabs.onUpdated.removeListener(onUpdated)
        }

        function onUpdated(updatedTabId: number, info: chrome.tabs.OnUpdatedInfo) {
            if (updatedTabId !== tabId) return
            if (info.status === 'complete') {
                cleanup()
                resolve(true)
            }
        }

        chrome.tabs.onUpdated.addListener(onUpdated)
    })
}

const askContentToSetAlias = async (tabId: number, steamId: string, alias: string, timeoutMs = 25000) => {
    const started = Date.now()

    while (true) {
        try {
            const resp = await chrome.tabs.sendMessage(tabId, {
                type: 'SET_ALIAS',
                payload: { steamId, alias, runId: currentRun?.runId },
            })

            return resp
        } catch (err) {
            if (Date.now() - started > timeoutMs) {
                return {
                    ok: false,
                    error: 'No se pudo contactar con el content script en Steam.',
                }
            }

            await sleep(250)
        }
    }
}

const runQueue = async (): Promise<void> => {
    if (!currentRun) {
        throw new Error("No hay una actualización en curso")
    }

    const runId = currentRun.runId
    sendProgress('Preparando…')

    const tabId = await ensureTab()

    for (let i = 0; i < currentRun.items.length; i++) {
        if (!currentRun || currentRun.cancelled || currentRun.runId !== runId) {
            sendProgress('Actualización cancelada.', { finished: true })
            currentRun = null
            return
        }

        const item = currentRun.items[i]
        const url = `https://steamcommunity.com/profiles/${item.steamId}/`

        currentRun.done = i

        sendProgress(`Procesando ${i + 1} de ${currentRun.total}: ${item.alias || item.steamId}`, { currentLabel: item.alias || item.steamId })

        await chrome.tabs.update(tabId, { url, active: true })

        try {
            await waitForTabComplete(tabId, 30000)
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            sendProgress(`❌ Error cargando perfil: ${msg}`)

            await sleep(300)

            continue
        }

        if (currentRun.cancelled) break

        sendProgress(`Intentando actualizar nickname: "${item.alias || item.steamId}"…`)

        const resp = await askContentToSetAlias(tabId, item.steamId, item.alias, 30000)
        if (resp?.ok) {
            sendProgress(`✅ Actualizado: ${item.alias}`)
        } else if (resp?.code === 'NOT_FRIEND') {
            currentRun.nonFriends?.push({ steamId: item.steamId, alias: item.alias })
            sendProgress(`🚫 No es tu amigo: ${item.alias} (${item.steamId})`)
        } else {
            sendProgress(`⚠️ No se pudo automatizar. Revisa el overlay en Steam. (${resp?.error || 'sin detalle'})`,)
        }

        await sleep(900)
    }

    if (currentRun && currentRun.runId === runId) {
        currentRun.done = currentRun.total
        const finished = true
        const nonFriends = currentRun.nonFriends || []

        if (nonFriends.length > 0) {
            await chrome.storage.local.set({ lastRunNonFriends: nonFriends })
        }

        const statusLine = currentRun.cancelled ? 'Actualización cancelada.' : 'Actualización completada.'
        sendProgress(statusLine, {
            finished,
            nonFriends,
        })

        currentRun = null
    }
}