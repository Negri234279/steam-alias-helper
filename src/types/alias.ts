export interface Alias {
    steamId: string
    alias: string
}

export interface AppliedAliasEntry {
    steamId: string
    alias: string
    appliedAt: number
}

export const STORAGE_KEY = "aliases"
export const APPLIED_ALIASES_KEY = "appliedAliases"
export const APPLIED_ALIAS_TTL_MS = 30 * 24 * 60 * 60 * 1000
