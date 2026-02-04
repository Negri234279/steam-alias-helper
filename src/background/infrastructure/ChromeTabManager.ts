import type { ITabManager } from '../domain/services'

export class ChromeTabManager implements ITabManager {
    private readonly STEAM_COMMUNITY_URL = 'https://steamcommunity.com/'

    async ensureTab(): Promise<number> {
        const tab = await chrome.tabs.create({
            url: this.STEAM_COMMUNITY_URL,
            active: true,
        })

        if (!tab.id) {
            throw new Error('No se pudo crear la pestaña')
        }

        return tab.id
    }

    async updateTabUrl(tabId: number, url: string): Promise<void> {
        await chrome.tabs.update(tabId, { url, active: true })
    }

    async waitForTabComplete(tabId: number, timeoutMs = 25000): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const started = Date.now()

            const timer = setInterval(() => {
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

    async closeTab(tabId: number): Promise<void> {
        try {
            await chrome.tabs.remove(tabId)
        } catch { }
    }
}
