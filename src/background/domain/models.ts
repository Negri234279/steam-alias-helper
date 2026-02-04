import type { Alias } from '../../types/alias'

export interface UpdateProgress {
    done: number
    total: number
    statusLine: string
    currentLabel?: string
    finished?: boolean
    nonFriends?: Alias[]
}

export interface UpdateRun {
    readonly runId: string
    cancelled: boolean
    items: ReadonlyArray<Alias>
    total: number
    done: number
    tabId: number | null
    nonFriends: Alias[]
}

export interface SetAliasResult {
    ok: boolean
    error?: string
    code?: string
}
