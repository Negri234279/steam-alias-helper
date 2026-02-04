import type { IAliasUpdater } from '../domain/services'
import type { SetAliasResult } from '../domain/models'

export class ChromeAliasUpdater implements IAliasUpdater {
    async setAlias(
        tabId: number,
        steamId: string,
        alias: string,
        runId: string,
        timeoutMs = 25000
    ): Promise<SetAliasResult> {
        const started = Date.now()

        while (true) {
            try {
                const response = await chrome.tabs.sendMessage(tabId, {
                    type: 'SET_ALIAS',
                    payload: { steamId, alias, runId },
                })

                return response
            } catch (err) {
                if (Date.now() - started > timeoutMs) {
                    return {
                        ok: false,
                        error: 'No se pudo contactar con el content script en Steam.',
                    }
                }

                await this.sleep(250)
            }
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
