import type { Alias, AppliedAliasEntry } from '../../types/alias'

export interface IAliasRepository {
    getAll(): Promise<Alias[]>
    save(aliases: Alias[]): Promise<Alias[]>
    upsert(alias: Alias): Promise<Alias[]>
    remove(steamId: string): Promise<Alias[]>
}

export interface IAppliedAliasRepository {
    getValidMap(): Promise<Map<string, AppliedAliasEntry>>
    save(entries: AppliedAliasEntry[]): Promise<void>
}
