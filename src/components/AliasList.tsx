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
    const [selected, setSelected] = useState<Map<string, Alias>>(new Map())

    const { state: stateIO, exportAliases, importAliases } = useSteamAliasesIO()
    const { success, error: showError } = useToast()

    const isDisabled = aliases.loading || stateIO.loading
    const selectedCount = selected.size

    useEffect(() => {
        setSelected((prev) => {
            const next = new Map<string, Alias>()
            const valid = new Map(aliases.data.map((a) => [a.steamId, a]))

            for (const [id, _alias] of prev) {
                if (valid.has(id)) next.set(id, valid.get(id)!)
            }

            return next
        })
    }, [aliases.data])

    const toggleOne = (alias: Alias, checked: boolean) => {
        setSelected((prev) => {
            const next = new Map(prev)
            if (checked) next.set(alias.steamId, alias)
            else next.delete(alias.steamId)
            return next
        })
    }

    const markAll = () => {
        setSelected(new Map(aliases.data.map((alias) => [alias.steamId, alias])))
    }

    const unmarkAll = () => {
        setSelected(new Map())
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
        try {
            const aliasesToUpdate = Array.from(selected.values())

            const resp = await chrome.runtime.sendMessage({
                type: 'START_UPDATE',
                payload: {
                    items: aliasesToUpdate,
                },
            })

            if (!resp.ok) {
                showError(`Error al iniciar actualización: ${resp.error || 'desconocido'}`)
            } else {
                success('Actualización iniciada')
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            showError(`Error al iniciar actualización: ${msg}`)
        }
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
                            onCheckedChange={(checked) => toggleOne(alias, checked)}
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
