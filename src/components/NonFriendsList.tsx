import { useNonFriends } from '../hooks/useNonFriends'

const NonFriendsList = () => {
    const { nonFriends } = useNonFriends()

    if (nonFriends.length === 0) return null

    return (
        <div
            class="nonFriendsSection"
            style="margin-top: 16px; padding: 12px; color: #ffd2d2; background: rgba(239, 68, 68, 0.08); border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.5);"
        >
            <div style="font-weight: bold; margin-bottom: 8px;">
                ⚠️ Amigos sin agregar ({nonFriends.length})
            </div>
            <div style="font-size: 0.9em; margin-bottom: 8px;">
                Los siguientes usuarios no están en tu lista de amigos y no se pudieron actualizar:
            </div>
            <div style="max-height: 150px; overflow-y: auto;">
                {nonFriends.map(({ alias, steamId }) => (
                    <div key={steamId} style="padding: 4px 0; font-size: 0.85em;">
                        <a
                            href={`https://steamcommunity.com/profiles/${steamId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style="color: #ffd2d2; text-decoration: underline;"
                        >
                            {alias || '<sin alias>'} ({steamId})
                        </a>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default NonFriendsList