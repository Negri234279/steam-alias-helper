function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms))
}

function makeRunId() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function profileUrl(steamId64) {
    return `https://steamcommunity.com/profiles/${steamId64}/`
}

/**
 * @typedef {Object} UpdateRun
 * @property {string} runId
 * @property {boolean} cancelled
 * @property {Array<{steamId: string, alias: string}>} items
 * @property {number} total
 * @property {number} done
 * @property {number|null} tabId
 * @property {{ steamId: string, alias: string }[]} nonFriends
 */

/**
 * @type {UpdateRun|null}
 */
let currentRun = null
// currentRun shape:
// {
//   runId, cancelled, items: [{steamId, alias}], total, done, tabId
// }

function progressSnapshot(extra = {}) {
    if (!currentRun) return null
    const { total, done } = currentRun
    return {
        done,
        total,
        ...extra,
    }
}

async function ensureTab() {
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
    currentRun.tabId = tab.id
    return tab.id
}

function waitForTabComplete(tabId, timeoutMs = 25000) {
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

        function onUpdated(updatedTabId, info) {
            if (updatedTabId !== tabId) return
            if (info.status === 'complete') {
                cleanup()
                resolve(true)
            }
        }

        chrome.tabs.onUpdated.addListener(onUpdated)
    })
}

function sendProgress(statusLine, extra = {}) {
    const msg = {
        type: 'UPDATE_PROGRESS',
        progress: {
            ...progressSnapshot(extra),
            statusLine,
        },
    }
    chrome.runtime.sendMessage(msg).catch(() => {})
}

async function askContentToSetAlias(tabId, steamId, alias, timeoutMs = 25000) {
    // content script deberá responder { ok: true } o { ok:false, error }
    const started = Date.now()
    while (true) {
        try {
            const resp = await chrome.tabs.sendMessage(tabId, {
                type: 'SET_ALIAS',
                payload: { steamId, alias, runId: currentRun.runId },
            })
            return resp
        } catch (err) {
            // content script aún no inyectado / no listo
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

async function runQueue() {
    const runId = currentRun.runId
    sendProgress('Preparando…')

    const tabId = await ensureTab()

    for (let i = 0; i < currentRun.items.length; i++) {
        if (!currentRun || currentRun.cancelled || currentRun.runId !== runId) break

        const item = currentRun.items[i]
        const url = profileUrl(item.steamId)

        currentRun.done = i // done = completados
        sendProgress(
            `Abriendo perfil (${i + 1}/${currentRun.total}): ${item.alias} / ${item.steamId}`,
            {
                currentLabel: item.alias,
            },
        )

        await chrome.tabs.update(tabId, { url, active: true })
        try {
            await waitForTabComplete(tabId, 30000)
        } catch (e) {
            sendProgress(`❌ Error cargando perfil: ${e.message}`)
            await sleep(600)
            continue
        }

        if (currentRun.cancelled) break

        sendProgress(`Intentando actualizar nickname: "${item.alias}"…`)

        const resp = await askContentToSetAlias(tabId, item.steamId, item.alias, 30000)

        if (resp?.ok) {
            sendProgress(`✅ Actualizado: ${item.alias}`)
        } else if (resp?.code === 'NOT_FRIEND') {
            currentRun.nonFriends?.push({ steamId: item.steamId, alias: item.alias })
            sendProgress(`🚫 No es tu amigo: ${item.alias} (${item.steamId})`)
        } else {
            sendProgress(
                `⚠️ No se pudo automatizar. Revisa el overlay en Steam. (${resp?.error || 'sin detalle'})`,
            )
        }

        // Pequeño respiro para evitar ir “demasiado rápido”
        await sleep(900)
    }

    if (currentRun && currentRun.runId === runId) {
        currentRun.done = currentRun.total
        const finished = true
        const nonFriends = currentRun.nonFriends || []
        
        // Guardar nonFriends en storage para mostrarlos cuando se abra el popup
        if (nonFriends.length > 0) {
            await chrome.storage.local.set({ lastRunNonFriends: nonFriends })
        }
        
        sendProgress(currentRun.cancelled ? 'Cancelado.' : 'Terminado.', {
            finished,
            nonFriends,
        })
        currentRun = null
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    ;(async () => {
        if (msg?.type === 'START_UPDATE') {
            if (currentRun) {
                sendResponse({
                    ok: false,
                    error: 'Ya hay una actualización en curso. Cancela primero.',
                })
                return
            }

            const items = msg?.payload?.items
            if (!Array.isArray(items) || items.length === 0) {
                sendResponse({ ok: false, error: 'No hay items para actualizar.' })
                return
            }

            const runId = makeRunId()
            currentRun = {
                runId,
                cancelled: false,
                items: items.map((x) => ({
                    steamId: String(x.steamId),
                    alias: String(x.alias),
                })),
                total: items.length,
                done: 0,
                tabId: null,
                nonFriends: [],
            }

            sendResponse({
                ok: true,
                runId,
                progress: progressSnapshot({ statusLine: 'Iniciado.' }),
            })

            // Arranca la cola (no bloquea respuesta)
            runQueue().catch((e) => {
                sendProgress(`❌ Error interno: ${e?.message || String(e)}`, {
                    finished: true,
                    nonFriends: currentRun.nonFriends || [],
                })
                currentRun = null
            })

            return
        }

        if (msg?.type === 'CANCEL_UPDATE') {
            const runId = msg?.payload?.runId
            if (!currentRun || currentRun.runId !== runId) {
                sendResponse({ ok: false, error: 'No existe esa ejecución.' })
                return
            }
            currentRun.cancelled = true
            sendResponse({ ok: true })
            return
        }

        sendResponse({ ok: false, error: 'Mensaje desconocido.' })
    })()

    // Indica que responderemos async
    return true
})
