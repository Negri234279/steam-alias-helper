import type { Alias } from '../../types/alias'
import type { SetAliasResult, UpdateProgress, UpdateRun } from '../domain/models'
import type {
    IAliasUpdater,
    IDelayProvider,
    IProgressReporter,
    IRunIdGenerator,
    ITabManager,
} from '../domain/services'

export interface BulkUpdateConfig {
    pageLoadTimeout: number
    requestTimeout: number
    delayBetweenUpdates: number
    /** Pausa base ante un rate-limit de Steam; crece con cada reintento. */
    rateLimitBackoff: number
    /** Reintentos por alias cuando Steam responde RATE_LIMITED. */
    maxRateLimitRetries: number
    /** Tope al que puede llegar el delay adaptativo entre alias. */
    maxDelayBetweenUpdates: number
}

const DEFAULT_CONFIG: BulkUpdateConfig = {
    pageLoadTimeout: 30000,
    requestTimeout: 30000,
    delayBetweenUpdates: 200,
    rateLimitBackoff: 30000,
    maxRateLimitRetries: 5,
    maxDelayBetweenUpdates: 10000,
}

export class BulkAliasUpdateService {
    private currentRun: UpdateRun | null = null
    private adaptiveDelay: number
    private readonly tabManager: ITabManager
    private readonly aliasUpdater: IAliasUpdater
    private readonly progressReporter: IProgressReporter
    private readonly delayProvider: IDelayProvider
    private readonly runIdGenerator: IRunIdGenerator
    private readonly config: BulkUpdateConfig

    constructor(
        tabManager: ITabManager,
        aliasUpdater: IAliasUpdater,
        progressReporter: IProgressReporter,
        delayProvider: IDelayProvider,
        runIdGenerator: IRunIdGenerator,
        config: BulkUpdateConfig = DEFAULT_CONFIG,
    ) {
        this.tabManager = tabManager
        this.aliasUpdater = aliasUpdater
        this.progressReporter = progressReporter
        this.delayProvider = delayProvider
        this.runIdGenerator = runIdGenerator
        this.config = config
        this.adaptiveDelay = config.delayBetweenUpdates
    }

    async startUpdate(items: Alias[]): Promise<{ runId: string; progress: UpdateProgress }> {
        if (this.currentRun) {
            throw new Error('Ya hay una actualización en curso')
        }

        const runId = this.runIdGenerator.generate()
        this.adaptiveDelay = this.config.delayBetweenUpdates

        this.currentRun = {
            runId,
            cancelled: false,
            items,
            total: items.length,
            done: 0,
            tabId: null,
            nonFriends: [],
            friendRequestsSent: [],
        }

        const progress: UpdateProgress = {
            done: 0,
            total: items.length,
            statusLine: 'Iniciado.',
        }

        this.executeUpdateQueue(runId).catch((error) => {
            const msg = error instanceof Error ? error.message : String(error)

            this.reportProgress({
                done: this.currentRun?.done ?? 0,
                total: this.currentRun?.total ?? 0,
                statusLine: `❌ Error interno: ${msg}`,
                finished: true,
                nonFriends: this.currentRun?.nonFriends ?? [],
                friendRequestsSent: this.currentRun?.friendRequestsSent ?? [],
            })

            this.currentRun = null
        })

        return { runId, progress }
    }

    cancelUpdate(runId: string): void {
        if (!this.currentRun || this.currentRun.runId !== runId) {
            throw new Error('No existe esa ejecución.')
        }

        this.currentRun.cancelled = true
    }

    getCurrentRun(): UpdateRun | null {
        return this.currentRun
    }

    private async executeUpdateQueue(runId: string): Promise<void> {
        if (!this.currentRun) {
            throw new Error('No hay una actualización en curso')
        }

        this.reportProgress({
            done: 0,
            total: this.currentRun.total,
            statusLine: 'Preparando…',
        })

        const tabId = await this.ensureValidTab()

        for (let i = 0; i < this.currentRun.items.length; i++) {
            if (this.shouldStopExecution(runId)) {
                this.finishUpdate(true)
                return
            }

            const item = this.currentRun.items[i]
            this.currentRun.done = i

            const response = await this.processItem(item, i, tabId)

            // Rate-limit persistente: es un límite global de la cuenta, no tiene
            // sentido seguir gastando intentos en el resto del lote.
            if (response?.code === 'RATE_LIMITED') {
                const total = this.currentRun!.total
                this.finishUpdate(false, {
                    done: i,
                    statusLine:
                        `⛔ Steam ha limitado la cuenta tras procesar ${i} de ${total} alias. ` +
                        `Espera unos minutos y reanuda con los ${total - i} restantes.`,
                })
                return
            }

            await this.delayProvider.wait(this.adaptiveDelay)
        }

        if (this.currentRun && this.currentRun.runId === runId) {
            this.finishUpdate(false)
        }
    }

    private async processItem(
        item: Alias,
        index: number,
        tabId: number,
    ): Promise<SetAliasResult | null> {
        const url = `https://steamcommunity.com/profiles/${item.steamId}/`

        this.reportProgress({
            done: index,
            total: this.currentRun!.total,
            statusLine: `Procesando ${index + 1} de ${this.currentRun!.total}: ${item.alias || item.steamId}`,
            currentLabel: item.alias || item.steamId,
        })

        let response: SetAliasResult | null = null

        for (let attempt = 0; attempt <= this.config.maxRateLimitRetries; attempt++) {
            if (this.currentRun?.cancelled) return null

            const loaded = await this.loadProfile(tabId, url, index)
            if (!loaded) return null

            if (this.currentRun?.cancelled) return null

            this.reportProgress({
                done: index,
                total: this.currentRun!.total,
                statusLine:
                    attempt === 0
                        ? `Intentando actualizar nickname: "${item.alias || item.steamId}"…`
                        : `Reintento ${attempt}/${this.config.maxRateLimitRetries} para "${item.alias || item.steamId}"…`,
            })

            response = await this.aliasUpdater.setAlias(
                tabId,
                item.steamId,
                item.alias,
                this.currentRun!.runId,
                this.config.requestTimeout,
            )

            if (response?.code !== 'RATE_LIMITED') break

            // Steam nos está limitando: subimos el ritmo base para el resto del lote
            // y esperamos (con backoff creciente) antes de reintentar este alias.
            this.increaseAdaptiveDelay()

            if (attempt < this.config.maxRateLimitRetries) {
                const backoff = this.config.rateLimitBackoff * (attempt + 1)
                this.reportProgress({
                    done: index,
                    total: this.currentRun!.total,
                    statusLine: `⏳ Steam limitó la petición. Esperando ${Math.round(backoff / 1000)}s antes de reintentar…`,
                })
                await this.delayProvider.wait(backoff)
            }
        }

        this.handleUpdateResponse(response, item, index)

        return response
    }

    private async loadProfile(tabId: number, url: string, index: number): Promise<boolean> {
        await this.tabManager.updateTabUrl(tabId, url)

        try {
            await this.tabManager.waitForTabComplete(tabId, this.config.pageLoadTimeout)
            return true
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            this.reportProgress({
                done: index,
                total: this.currentRun!.total,
                statusLine: `❌ Error cargando perfil: ${msg}`,
            })

            await this.delayProvider.wait(this.adaptiveDelay)

            return false
        }
    }

    private increaseAdaptiveDelay(): void {
        this.adaptiveDelay = Math.min(
            Math.round(this.adaptiveDelay * 1.8),
            this.config.maxDelayBetweenUpdates,
        )
    }

    private handleUpdateResponse(response: any, item: Alias, index: number): void {
        if (response?.ok) {
            let statusLine = `✅ Actualizado: ${item.alias}`

            if (response?.code === 'ALREADY_SET') {
                statusLine = `⏩ Sin cambios (alias ya asignado): ${item.alias}`
            } else if (response?.code === 'OWN_PROFILE') {
                statusLine = `⏩ Tu propio perfil, omitido: ${item.steamId}`
            }

            this.reportProgress({
                done: index,
                total: this.currentRun!.total,
                statusLine,
            })
        } else if (response?.code === 'NOT_FRIEND') {
            if (response?.friendRequestSent) {
                this.currentRun!.friendRequestsSent.push({
                    steamId: item.steamId,
                    alias: item.alias,
                })
            } else {
                this.currentRun!.nonFriends.push({ steamId: item.steamId, alias: item.alias })
            }

            const statusLine = response?.friendRequestSent
                ? `📤 Solicitud de amistad enviada: ${item.alias} (${item.steamId})`
                : `🚫 No es tu amigo: ${item.alias} (${item.steamId})`

            this.reportProgress({
                done: index,
                total: this.currentRun!.total,
                statusLine,
            })
        } else if (response?.code === 'RATE_LIMITED') {
            this.reportProgress({
                done: index,
                total: this.currentRun!.total,
                statusLine: `⛔ Steam sigue limitando «${item.alias}» tras ${this.config.maxRateLimitRetries} reintentos. Inténtalo de nuevo más tarde.`,
            })
        } else {
            this.reportProgress({
                done: index,
                total: this.currentRun!.total,
                statusLine: `⚠️ No se pudo automatizar. Revisa el overlay en Steam. (${response?.error || 'sin detalle'})`,
            })
        }
    }

    private async ensureValidTab(): Promise<number> {
        if (this.currentRun?.tabId != null) {
            try {
                await chrome.tabs.get(this.currentRun.tabId)
                return this.currentRun.tabId
            } catch {
                this.currentRun.tabId = null
            }
        }

        const tabId = await this.tabManager.ensureTab()

        if (this.currentRun) {
            this.currentRun.tabId = tabId
        }

        return tabId
    }

    private shouldStopExecution(runId: string): boolean {
        return !this.currentRun || this.currentRun.cancelled || this.currentRun.runId !== runId
    }

    private finishUpdate(
        wasCancelled: boolean,
        override?: { statusLine?: string; done?: number },
    ): void {
        if (!this.currentRun) return

        this.currentRun.done = override?.done ?? this.currentRun.total

        const nonFriends = this.currentRun.nonFriends
        if (nonFriends.length > 0) {
            chrome.storage.local.set({ lastRunNonFriends: nonFriends })
        }

        const friendRequestsSent = this.currentRun.friendRequestsSent
        if (friendRequestsSent.length > 0) {
            this.persistFriendRequestsSent(friendRequestsSent)
        }

        const statusLine =
            override?.statusLine ??
            (wasCancelled ? 'Actualización cancelada.' : 'Actualización completada.')

        this.reportProgress({
            done: this.currentRun.done,
            total: this.currentRun.total,
            statusLine,
            finished: true,
            nonFriends,
            friendRequestsSent,
        })

        this.currentRun = null
    }

    private persistFriendRequestsSent(newEntries: Alias[]): void {
        chrome.storage.local.get({ lastRunFriendRequestsSent: [] as Alias[] }, (result) => {
            const existing = (result.lastRunFriendRequestsSent as Alias[]) || []
            const bySteamId = new Map<string, Alias>()

            for (const entry of existing) {
                bySteamId.set(entry.steamId, entry)
            }

            for (const entry of newEntries) {
                bySteamId.set(entry.steamId, entry)
            }

            chrome.storage.local.set({ lastRunFriendRequestsSent: Array.from(bySteamId.values()) })
        })
    }

    private reportProgress(progress: UpdateProgress): void {
        this.progressReporter.report(progress)
    }
}
