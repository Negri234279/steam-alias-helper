import { useFriendRequestsSent } from '../hooks/useFriendRequestsSent'

const FriendRequestsSentList = () => {
    const { friendRequestsSent, removeOne, clearAll } = useFriendRequestsSent()

    if (friendRequestsSent.length === 0) return null

    return (
        <div
            class="friendRequestsSentSection"
            style="margin-top: 16px; padding: 12px; color: #d2e0ff; background: rgba(59, 130, 246, 0.08); border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.5);"
        >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: bold;">
                    📤 Solicitudes de amistad enviadas ({friendRequestsSent.length})
                </div>
                <button
                    class="btn small"
                    type="button"
                    onClick={clearAll}
                    style="padding: 4px 8px; font-size: 0.85em;"
                >
                    Limpiar todo
                </button>
            </div>
            <div style="font-size: 0.9em; margin-bottom: 8px;">
                Se envió una solicitud de amistad a los siguientes usuarios. Cuando acepten podrás
                actualizar su alias:
            </div>
            <div style="max-height: 150px; overflow-y: auto;">
                {friendRequestsSent.map(({ alias, steamId }) => (
                    <div
                        key={steamId}
                        style="display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;"
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <a
                            href={`https://steamcommunity.com/profiles/${steamId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style="color: #d2e0ff; text-decoration: underline; flex: 1;"
                        >
                            {alias || '<sin alias>'} ({steamId})
                        </a>
                        <button
                            type="button"
                            title="Eliminar"
                            onClick={() => removeOne(steamId)}
                            style="margin-left: 8px; padding: 0; border: none; background: none; color: #d2e0ff; cursor: pointer; font-size: 1.2em; line-height: 1; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s;"
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default FriendRequestsSentList
