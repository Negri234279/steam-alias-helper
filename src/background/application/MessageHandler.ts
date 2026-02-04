import type { Alias } from '../../types/alias'
import type { IAliasRepository } from '../domain/repositories'
import type { BulkAliasUpdateService } from './BulkAliasUpdateService'
import type { MsgSteam, ResponseSteam } from './messages'


export class MessageHandler {
    private readonly aliasRepository: IAliasRepository
    private readonly bulkUpdateService: BulkAliasUpdateService

    constructor(
        aliasRepository: IAliasRepository,
        bulkUpdateService: BulkAliasUpdateService
    ) {
        this.aliasRepository = aliasRepository
        this.bulkUpdateService = bulkUpdateService
    }

    async handle(message: MsgSteam): Promise<ResponseSteam> {
        try {
            switch (message.type) {
                case 'ALIASES_GET':
                    return await this.handleGetAliases()

                case 'ALIAS_UPSERT':
                    return await this.handleUpsertAlias(message.payload)

                case 'ALIASES_UPSERT':
                    return await this.handleSaveAliases(message.payload)

                case 'ALIASES_REMOVE':
                    return await this.handleRemoveAlias(message.payload.steamId)

                case 'START_UPDATE':
                    return await this.handleStartUpdate(message.payload.items)

                case 'CANCEL_UPDATE':
                    return this.handleCancelUpdate(message.payload.runId)

                default:
                    return { ok: false, error: 'Mensaje desconocido' }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return { ok: false, error: errorMessage }
        }
    }

    private async handleGetAliases(): Promise<ResponseSteam> {
        const aliases = await this.aliasRepository.getAll()
        return { ok: true, data: aliases }
    }

    private async handleUpsertAlias(alias: Alias): Promise<ResponseSteam> {
        const aliases = await this.aliasRepository.upsert(alias)
        return { ok: true, data: aliases }
    }

    private async handleSaveAliases(aliases: Alias[]): Promise<ResponseSteam> {
        const saved = await this.aliasRepository.save(aliases)
        return { ok: true, data: saved }
    }

    private async handleRemoveAlias(steamId: string): Promise<ResponseSteam> {
        const aliases = await this.aliasRepository.remove(steamId)
        return { ok: true, data: aliases }
    }

    private async handleStartUpdate(items: Alias[]): Promise<ResponseSteam> {
        const { runId, progress } = await this.bulkUpdateService.startUpdate(items)
        return { ok: true, runId, progress }
    }

    private handleCancelUpdate(runId: string): ResponseSteam {
        this.bulkUpdateService.cancelUpdate(runId)
        return { ok: true }
    }
}
