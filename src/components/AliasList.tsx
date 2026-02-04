import { useState, useMemo } from 'preact/hooks'

import type { AliasesState } from '../hooks/useAliases'
import { useDebounce } from '../hooks/useDebounce'
import type { Alias } from '../types/alias'
import ActionsAliasList from './ActionsAliasList'
import AliasCardList from './AliasCardList'
import NonFriendsList from './NonFriendsList'

interface AliasListProps {
    aliases: AliasesState
    upsertAll: (payload: Alias[]) => Promise<void>
    onRemove: (steamId: string) => Promise<void>
    onHandleShowEditAlias: (alias: Alias) => Promise<void>
}

const AliasList = ({ aliases, upsertAll, onHandleShowEditAlias, onRemove }: AliasListProps) => {
    const [selected, setSelected] = useState<Map<string, Alias>>(new Map())
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebounce(searchTerm, 300)

    const filteredAliases = useMemo(() => {
        if (!debouncedSearch.trim()) return aliases.data

        const search = debouncedSearch.toLowerCase()
        return aliases.data.filter(
            (alias) =>
                alias.alias.toLowerCase().includes(search) ||
                alias.steamId.toLowerCase().includes(search),
        )
    }, [aliases.data, debouncedSearch])

    const toggleOne = (alias: Alias, checked: boolean) => {
        setSelected((prev) => {
            const next = new Map(prev)
            if (checked) next.set(alias.steamId, alias)
            else next.delete(alias.steamId)
            return next
        })
    }

    return (
        <section class="card listCard">
            <div class="listHeader">
                <div class="listTitle">Lista</div>
                <div id="countBadge" class="badge">
                    {filteredAliases.length}
                </div>
            </div>

            {!!aliases.data.length && (
                <div class="searchBox">
                    <input
                        type="text"
                        class="searchInput"
                        placeholder="Buscar por alias o Steam ID..."
                        value={searchTerm}
                        onInput={(e) => setSearchTerm(e.currentTarget.value)}
                    />
                    {searchTerm && (
                        <button
                            class="clearBtn"
                            type="button"
                            onClick={() => setSearchTerm('')}
                            title="Limpiar búsqueda"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}

            {!aliases.data.length && !aliases.loading && (
                <div id="empty" class="empty">
                    No hay alias añadidos aún.
                </div>
            )}

            {!!aliases.data.length && !filteredAliases.length && (
                <div id="empty" class="empty">
                    No se encontraron resultados para "{searchTerm}"
                </div>
            )}

            {!!filteredAliases.length && (
                <div id="list" class="list">
                    {filteredAliases.map((alias) => (
                        <AliasCardList
                            key={alias.steamId}
                            alias={alias}
                            checked={selected.has(alias.steamId)}
                            onCheckedChange={(checked) => toggleOne(alias, checked)}
                            onHandleShowEditAlias={onHandleShowEditAlias}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}

            <ActionsAliasList
                aliases={{ ...aliases, data: filteredAliases }}
                selected={selected}
                setSelected={setSelected}
                upsertAll={upsertAll}
            />

            <NonFriendsList />

            <div class="footnote">
                Tip: abre sesión en Steam en el navegador. El overlay aparecerá en perfiles de
                Steam.
            </div>
        </section>
    )
}

export default AliasList
