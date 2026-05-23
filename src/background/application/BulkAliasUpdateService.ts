import type { Alias, AppliedAliasEntry } from '../../types/alias'
import type { SetAliasResult, UpdateProgress, UpdateRun } from '../domain/models'
import type { IAppliedAliasRepository } from '../domain/repositories'
import type {
    IAliasUpdater,
    IDelayProvider,
    IProgressReporter,
    IRunIdGenerator,
    ITabManager,
} from '../domain/services'

export type UpdateMode = 'changed' | 'all'

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
    private skippedCount = 0
    private appliedCache: Map<string, AppliedAliasEntry> = new Map()
    private readonly tabManager: ITabManager
    private readonly aliasUpdater: IAliasUpdater
    private readonly progressReporter: IProgressReporter
    private readonly delayProvider: IDelayProvider
    private readonly runIdGenerator: IRunIdGenerator
    private readonly appliedAliasRepository: IAppliedAliasRepository
    private readonly config: BulkUpdateConfig

    constructor(
        tabManager: ITabManager,
        aliasUpdater: IAliasUpdater,
        progressReporter: IProgressReporter,
        delayProvider: IDelayProvider,
        runIdGenerator: IRunIdGenerator,
        appliedAliasRepository: IAppliedAliasRepository,
        config: BulkUpdateConfig = DEFAULT_CONFIG,
    ) {
        this.tabManager = tabManager
        this.aliasUpdater = aliasUpdater
        this.progressReporter = progressReporter
        this.delayProvider = delayProvider
        this.runIdGenerator = runIdGenerator
        this.appliedAliasRepository = appliedAliasRepository
        this.config = config
        this.adaptiveDelay = config.delayBetweenUpdates
    }

    async startUpdate(
        items: Alias[],
        mode: UpdateMode = 'changed',
    ): Promise<{ runId: string; progress: UpdateProgress }> {
        if (this.currentRun) {
            throw new Error('Ya hay una actualización en curso')
        }

        const runId = this.runIdGenerator.generate()
        this.adaptiveDelay = this.config.delayBetweenUpdates

        this.appliedCache = await this.appliedAliasRepository.getValidMap()

        const { toProcess, skipped } = this.partitionItems(items, mode, this.appliedCache)
        this.skippedCount = skipped.length

        this.currentRun = {
            runId,
            cancelled: false,
            items: toProcess,
            total: items.length,
            done: skipped.length,
            tabId: null,
            nonFriends: [],
            friendRequestsSent: [],
        }

        const progress: UpdateProgress = {
            done: skipped.length,
            total: items.length,
            statusLine: this.buildStartLine(skipped.length, toProcess.length, mode),
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

    private partitionItems(
        items: Alias[],
        mode: UpdateMode,
        cache: Map<string, AppliedAliasEntry>,
    ): { toProcess: Alias[]; skipped: Alias[] } {
        if (mode === 'all') {
            return { toProcess: items.slice(), skipped: [] }
        }

        const toProcess: Alias[] = []
        const skipped: Alias[] = []

        for (const item of items) {
            const cached = cache.get(item.steamId)
            if (cached && cached.alias === item.alias) {
                skipped.push(item)
            } else {
                toProcess.push(item)
            }
        }

        return { toProcess, skipped }
    }

    private buildStartLine(skipped: number, toProcess: number, mode: UpdateMode): string {
        if (mode === 'all') {
            return `Forzando actualización de ${toProcess} alias…`
        }
        if (skipped === 0) {
            return `Procesando ${toProcess} alias…`
        }
        if (toProcess === 0) {
            return `⚡ Todos los alias (${skipped}) ya estaban aplicados. Nada que hacer.`
        }
        return `⚡ Saltados ${skipped} ya aplicados (cache 30d). Procesando ${toProcess} nuevos…`
    }

    private async executeUpdateQueue(runId: string): Promise<void> {
        if (!this.currentRun) {
            throw new Error('No hay una actualización en curso')
        }

        this.reportProgress({
            done: this.currentRun.done,
            total: this.currentRun.total,
            statusLine:
                this.currentRun.items.length === 0 ? '⚡ Sin alias por procesar.' : 'Preparando…',
        })

        if (this.currentRun.items.length === 0) {
            this.finishUpdate(false)
            return
        }

        const tabId = await this.ensureValidTab()

        for (let i = 0; i < this.currentRun.items.length; i++) {
            if (this.shouldStopExecution(runId)) {
                this.finishUpdate(true)
                return
            }

            const item = this.currentRun.items[i]
            this.currentRun.done = this.skippedCount + i

            const response = await this.processItem(item, i, tabId)

            // Rate-limit persistente: es un límite global de la cuenta, no tiene
            // sentido seguir gastando intentos en el resto del lote.
            if (response?.code === 'RATE_LIMITED') {
                const total = this.currentRun!.total
                const processed = this.skippedCount + i
                this.finishUpdate(false, {
                    done: processed,
                    statusLine:
                        `⛔ Steam ha limitado la cuenta tras procesar ${processed} de ${total} alias. ` +
                        `Espera unos minutos y reanuda con los ${total - processed} restantes.`,
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
        const total = this.currentRun!.total
        const displayDone = this.skippedCount + index

        this.reportProgress({
            done: displayDone,
            total,
            statusLine: `Procesando ${displayDone + 1} de ${total}: ${item.alias || item.steamId}`,
            currentLabel: item.alias || item.steamId,
        })

        let response: SetAliasResult | null = null

        for (let attempt = 0; attempt <= this.config.maxRateLimitRetries; attempt++) {
            if (this.currentRun?.cancelled) return null

            const loaded = await this.loadProfile(tabId, url, index)
            if (!loaded) return null

            if (this.currentRun?.cancelled) return null

            this.reportProgress({
                done: displayDone,
                total,
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
                    done: displayDone,
                    total,
                    statusLine: `⏳ Steam limitó la petición. Esperando ${Math.round(backoff / 1000)}s antes de reintentar…`,
                })
                await this.delayProvider.wait(backoff)
            }
        }

        this.handleUpdateResponse(response, item, index)
        this.updateCacheForResponse(response, item)

        return response
    }

    private updateCacheForResponse(response: SetAliasResult | null, item: Alias): void {
        if (!response) return

        // OWN_PROFILE no depende del alias enviado, no tiene sentido cachearlo.
        if (response.code === 'OWN_PROFILE') return

        if (response.ok) {
            this.appliedCache.set(item.steamId, {
                steamId: item.steamId,
                alias: item.alias,
                appliedAt: Date.now(),
            })
            return
        }

        if (response.code === 'NOT_FRIEND' || response.code === 'RATE_LIMITED') {
            this.appliedCache.delete(item.steamId)
        }
    }

    private async loadProfile(tabId: number, url: string, index: number): Promise<boolean> {
        await this.tabManager.updateTabUrl(tabId, url)

        try {
            await this.tabManager.waitForTabComplete(tabId, this.config.pageLoadTimeout)
            return true
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            this.reportProgress({
                done: this.skippedCount + index,
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
        const total = this.currentRun!.total
        const displayDone = this.skippedCount + index

        if (response?.ok) {
            let statusLine = `✅ Actualizado: ${item.alias}`

            if (response?.code === 'ALREADY_SET') {
                statusLine = `⏩ Sin cambios (alias ya asignado): ${item.alias}`
            } else if (response?.code === 'OWN_PROFILE') {
                statusLine = `⏩ Tu propio perfil, omitido: ${item.steamId}`
            }

            this.reportProgress({
                done: displayDone,
                total,
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
                done: displayDone,
                total,
                statusLine,
            })
        } else if (response?.code === 'RATE_LIMITED') {
            this.reportProgress({
                done: displayDone,
                total,
                statusLine: `⛔ Steam sigue limitando «${item.alias}» tras ${this.config.maxRateLimitRetries} reintentos. Inténtalo de nuevo más tarde.`,
            })
        } else {
            this.reportProgress({
                done: displayDone,
                total,
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

        this.persistAppliedCache()

        const baseStatusLine =
            override?.statusLine ??
            (wasCancelled ? 'Actualización cancelada.' : 'Actualización completada.')

        const statusLine =
            this.skippedCount > 0 && !override?.statusLine
                ? `${baseStatusLine} ⚡ Saltados ${this.skippedCount} por cache.`
                : baseStatusLine

        this.reportProgress({
            done: this.currentRun.done,
            total: this.currentRun.total,
            statusLine,
            finished: true,
            nonFriends,
            friendRequestsSent,
        })

        this.currentRun = null
        this.skippedCount = 0
    }

    private persistAppliedCache(): void {
        const entries = Array.from(this.appliedCache.values())
        this.appliedAliasRepository.save(entries).catch((error) => {
            const msg = error instanceof Error ? error.message : String(error)
            console.error('[BulkAliasUpdateService] Error guardando cache de alias aplicados:', msg)
        })
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
