export interface SetAliasRequest {
    steamId: string
    alias: string
}

export interface SetAliasResponse {
    ok: boolean
    error?: string
    code?: string
    skipped?: boolean
    message?: string
}

export enum ProfileState {
    OwnProfile = 'OWN_PROFILE',
    NotFriend = 'NOT_FRIEND',
    Friend = 'FRIEND',
    Unknown = 'UNKNOWN',
}

export interface ProfileInfo {
    state: ProfileState
    isSteamProfile: boolean
}
