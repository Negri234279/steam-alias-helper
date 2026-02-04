import { STORAGE_KEY, type Alias } from '../../types/alias'
import type { IAliasRepository } from '../domain/repositories'

export class ChromeStorageAliasRepository implements IAliasRepository {
    async getAll(): Promise<Alias[]> {
        const result = await chrome.storage.local.get({ [STORAGE_KEY]: [] as Alias[] })
        return result[STORAGE_KEY] as Alias[]
    }

    async save(aliases: Alias[]): Promise<Alias[]> {
        await chrome.storage.local.set({ [STORAGE_KEY]: aliases })
        
        return aliases
    }

    async upsert(alias: Alias): Promise<Alias[]> {
        const aliases = await this.getAll()
        const index = aliases.findIndex(a => a.steamId === alias.steamId)

        if (index >= 0) {
            aliases[index] = alias
        } else {
            aliases.push(alias)
        }

        return this.save(aliases)
    }

    async remove(steamId: string): Promise<Alias[]> {
        const aliases = await this.getAll()
        const filtered = aliases.filter(a => a.steamId !== steamId)

        return this.save(filtered)
    }
}
