import type { Alias } from '../../types/alias'

export type MsgSteam =
    | { type: 'ALIASES_GET' }
    | { type: 'ALIAS_UPSERT'; payload: Alias }
    | { type: 'ALIASES_UPSERT'; payload: Alias[] }
    | { type: 'ALIASES_REMOVE'; payload: Pick<Alias, 'steamId'> }
    | { type: 'START_UPDATE'; payload: { items: Alias[] } }
    | { type: 'CANCEL_UPDATE'; payload: { runId: string } }

export type ResponseOkSteam = {
    'ALIASES_GET': { ok: true; data: Alias[]; }
    'ALIAS_UPSERT': { ok: true; data: Alias[] }
    'ALIASES_UPSERT': { ok: true; data: Alias[] }
    'ALIASES_REMOVE': { ok: true; data: Alias[] }
    'START_UPDATE': {
        ok: true
        runId: string
        progress: { done: number; total: number; statusLine: string } | null
    }
    'CANCEL_UPDATE': { ok: true }
}

export type ResponseErrorSteam = { ok: false; error: string }

export type ResponseSteam = ResponseOkSteam[MsgSteam['type']] | ResponseErrorSteam
