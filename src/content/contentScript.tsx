import { SetNicknameUseCase } from './application/SetNicknameUseCase'
import { type SetAliasRequest } from './domain/models'
import { OverlayUI } from './infrastructure/OverlayUI'
import { SteamProfileDetector } from './infrastructure/SteamProfileDetector'

const overlay = new OverlayUI()
const profileDetector = new SteamProfileDetector()
const setNicknameUseCase = new SetNicknameUseCase(overlay, profileDetector)

let lastTask: SetAliasRequest | null = null

overlay.setOnRetry(async () => {
    if (!lastTask) {
        overlay.appendLog('No hay tarea activa.')
        return
    }

    await setNicknameUseCase.execute(lastTask.alias)
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    ;(async () => {
        if (msg?.type === 'SET_ALIAS') {
            const { steamId, alias } = msg.payload || {}
            lastTask = { steamId, alias }

            overlay.ensure()
            overlay.setTarget(`Objetivo: ${alias} ← ${steamId}`)
            overlay.appendLog(
                `\n---\nTarea recibida desde extensión:\nSteamID64: ${steamId}\nAlias: ${alias}\nURL actual: ${location.href}\n`
            )

            const response = await setNicknameUseCase.execute(alias)
            sendResponse(response)
            return
        }

        sendResponse({ ok: false, error: 'Mensaje desconocido.' })
    })()

    return true
})

