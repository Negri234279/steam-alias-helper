import {
    APPLIED_ALIASES_KEY,
    APPLIED_ALIAS_TTL_MS,
    type AppliedAliasEntry,
} from '../../types/alias'
import type { IAppliedAliasRepository } from '../domain/repositories'

export class ChromeStorageAppliedAliasRepository implements IAppliedAliasRepository {
    async getValidMap(): Promise<Map<string, AppliedAliasEntry>> {
        const result = await chrome.storage.local.get({
            [APPLIED_ALIASES_KEY]: [] as AppliedAliasEntry[],
        })

        const stored = (result[APPLIED_ALIASES_KEY] as AppliedAliasEntry[]) || []
        const now = Date.now()
        const map = new Map<string, AppliedAliasEntry>()

        for (const entry of stored) {
            if (!entry?.steamId || typeof entry.appliedAt !== 'number') continue
            if (now - entry.appliedAt > APPLIED_ALIAS_TTL_MS) continue

            map.set(entry.steamId, entry)
        }

        return map
    }

    async save(entries: AppliedAliasEntry[]): Promise<void> {
        await chrome.storage.local.set({ [APPLIED_ALIASES_KEY]: entries })
    }
}
