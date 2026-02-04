import { ProfileState, type ProfileInfo } from '../domain/models'
import { DomUtils } from './DomUtils'

export class SteamProfileDetector {
    isSteamProfilePage(): boolean {
        return /^\/(id|profiles)\/[^/]+\/?/.test(location.pathname)
    }

    isOwnProfile(): boolean {
        const editProfileBtn = DomUtils.query('a[href*="/edit/info"]')
        if (editProfileBtn) return true

        const candidates = DomUtils.queryAll<HTMLElement>(
            "a.btn_profile_action, a, button, [role='button']"
        )

        return candidates.some((el) =>
            /modificar\s+perfil|edit\s+profile/i.test((el.textContent || '').trim())
        )
    }

    isNotFriend(): boolean {
        const addFriendBtn = document.getElementById('btn_add_friend')
        if (addFriendBtn) return true

        const candidates = DomUtils.queryAll<HTMLElement>(
            "a.btn_profile_action, a, button, [role='button']"
        )

        return candidates.some((el) =>
            /añadir\s+como\s+amigo/i.test((el.textContent || '').trim())
        )
    }

    detectProfileState(): ProfileInfo {
        const isSteamProfile = this.isSteamProfilePage()

        if (!isSteamProfile) {
            return {
                state: ProfileState.Unknown,
                isSteamProfile: false,
            }
        }

        if (this.isOwnProfile()) {
            return {
                state: ProfileState.OwnProfile,
                isSteamProfile: true,
            }
        }

        if (this.isNotFriend()) {
            return {
                state: ProfileState.NotFriend,
                isSteamProfile: true,
            }
        }

        return {
            state: ProfileState.Friend,
            isSteamProfile: true,
        }
    }
}
