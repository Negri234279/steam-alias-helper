import { useEffect, useMemo, useState } from 'preact/hooks'
import type { AliasesState } from '../hooks/useAliases'
import { useSteamAliasesIO } from '../hooks/useSteamAliasesIO'
import { useToast } from '../shared/toast'
import type { Alias } from '../types/alias'
import AliasCardList from './AliasCardList'

interface AliasListProps {
    aliases: AliasesState
    upsertAll: (payload: Alias[]) => Promise<void>
    onRemove: (steamId: string) => Promise<void>
    onHandleShowEditAlias: (alias: Alias) => Promise<void>
}

const AliasList = ({ aliases, upsertAll, onHandleShowEditAlias, onRemove }: AliasListProps) => {
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const { state: stateIO, exportAliases, importAliases } = useSteamAliasesIO()
    const { success } = useToast()

    const allIds = useMemo(() => aliases.data.map((a) => a.steamId), [aliases.data])

    const isDisabled = aliases.loading || stateIO.loading
    const selectedCount = selected.size

    useEffect(() => {
        setSelected((prev) => {
            const next = new Set<string>()
            const valid = new Set(allIds)
            for (const id of prev) if (valid.has(id)) next.add(id)
            return next
        })
    }, [allIds])

    const toggleOne = (steamId: string, checked: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (checked) next.add(steamId)
            else next.delete(steamId)
            return next
        })
    }

    const markAll = () => {
        setSelected(new Set(allIds))
    }

    const unmarkAll = () => {
        setSelected(new Set())
    }

    const handleClickExport = async () => {
        await exportAliases()
        success('Exportación completada')
    }

    const handleImportChange = async (ev: Event) => {
        const input = ev.target as HTMLInputElement
        if (!input.files?.length) {
            return
        }

        await importAliases(input.files[0], upsertAll)

        input.value = ''

        success('Importación completada')
    }

    const handleUpdateAliasesSelected = async () => {
        alert('Not implemented yet')
    }

    return (
        <section class="card listCard">
            <div class="listHeader">
                <div class="listTitle">Lista</div>
                <div id="countBadge" class="badge">
                    {aliases.data.length}
                </div>
            </div>

            {!aliases.data.length && !aliases.loading && (
                <div id="empty" class="empty">
                    No hay alias añadidos aún.
                </div>
            )}

            {!!aliases.data.length && (
                <div id="list" class="list">
                    {aliases.data.map((alias) => (
                        <AliasCardList
                            key={alias.steamId}
                            alias={alias}
                            checked={selected.has(alias.steamId)}
                            onCheckedChange={(checked) => toggleOne(alias.steamId, checked)}
                            onHandleShowEditAlias={onHandleShowEditAlias}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}

            <div class="actions">
                {!!aliases.data.length && (
                    <button
                        id="markAllBtn"
                        style={isDisabled ? 'pointer-events: none; cursor: default;' : undefined}
                        class="btn"
                        type="button"
                        disabled={isDisabled}
                        onClick={markAll}
                    >
                        Marcar todos
                    </button>
                )}

                {!!aliases.data.length && (
                    <button
                        id="unmarkAllBtn"
                        style={isDisabled ? 'pointer-events: none; cursor: default;' : undefined}
                        class="btn"
                        type="button"
                        disabled={isDisabled}
                        onClick={unmarkAll}
                    >
                        Desmarcar todos
                    </button>
                )}

                {!!aliases.data.length && (
                    <button
                        id="exportBtn"
                        style={isDisabled ? 'pointer-events: none; cursor: default;' : undefined}
                        class="btn"
                        type="button"
                        onClick={handleClickExport}
                        disabled={isDisabled}
                    >
                        Exportar
                    </button>
                )}

                <label class="btn fileBtn">
                    Importar
                    <input
                        id="importInput"
                        type="file"
                        accept="application/json"
                        hidden
                        onChange={handleImportChange}
                        disabled={isDisabled}
                    />
                </label>

                {!!aliases.data.length && (
                    <button
                        id="updateSelectedBtn"
                        style={
                            isDisabled || !selectedCount
                                ? 'pointer-events: none; cursor: default;'
                                : undefined
                        }
                        class="btn primary"
                        type="button"
                        disabled={isDisabled || !selectedCount}
                        onClick={handleUpdateAliasesSelected}
                    >
                        Actualizar seleccionados ({selectedCount})
                    </button>
                )}
            </div>

            <div id="progressWrap" class="progressWrap hidden">
                <div class="progressRow">
                    <div id="progressText" class="progressText">
                        0/0
                    </div>
                    <button id="cancelBtn" class="btn danger small" type="button">
                        Cancelar
                    </button>
                </div>
                <div class="progressBar">
                    <div id="progressFill" class="progressFill" style="width: 0%"></div>
                </div>
                <div id="progressDetail" class="progressDetail"></div>
            </div>

            <div class="footnote">
                Tip: abre sesión en Steam en el navegador. El overlay aparecerá en perfiles de
                Steam.
            </div>
        </section>
    )
}

export default AliasList
