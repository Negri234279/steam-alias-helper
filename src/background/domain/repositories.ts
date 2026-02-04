import type { Alias } from '../../types/alias'

export interface IAliasRepository {
    getAll(): Promise<Alias[]>
    save(aliases: Alias[]): Promise<Alias[]>
    upsert(alias: Alias): Promise<Alias[]>
    remove(steamId: string): Promise<Alias[]>
}
