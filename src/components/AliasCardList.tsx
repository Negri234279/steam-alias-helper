import type { Alias } from '../types/alias'

interface AliasListProps {
    alias: Alias
    onHandleShowEditAlias: (alias: Alias) => Promise<void>
    onRemove: (steamId: string) => Promise<void>
}

const AliasCardList = ({ alias, onHandleShowEditAlias, onRemove }: AliasListProps) => {
    const handleRemove = async () => {
        await onRemove(alias.steamId)
    }

    return (
        <div class="row">
            <input type="checkbox" />
            <div class="meta">
                <div class="aliasLine">
                    <div class="alias" title="Click para editar alias" style="cursor: pointer;">
                        {alias.alias || '<sin alias>'}
                    </div>
                </div>
                <div class="steamId" title={alias.steamId} style="cursor: pointer;">
                    <a
                        href={`https://steamcommunity.com/profiles/${alias.steamId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {alias.steamId}
                    </a>
                </div>
            </div>
            <button class="iconBtn" type="button" title="Editar" onClick={() => onHandleShowEditAlias(alias)}>
                ✏️
            </button>
            <button class="iconBtn" type="button" title="Eliminar" onClick={handleRemove}>
                🗑️
            </button>
        </div>
    )
}

export default AliasCardList
