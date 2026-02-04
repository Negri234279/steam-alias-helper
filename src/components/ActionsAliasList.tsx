import { useEffect, type Dispatch, type StateUpdater } from 'preact/hooks'

import type { AliasesState } from '../hooks/useAliases'
import { useSteamAliasesIO } from '../hooks/useSteamAliasesIO'
import { useToast } from '../shared/toast'
import type { Alias } from '../types/alias'

interface ActionsAliasListProps {
    aliases: AliasesState
    selected: Map<string, Alias>
    setSelected: Dispatch<StateUpdater<Map<string, Alias>>>
    upsertAll: (payload: Alias[]) => Promise<void>
}

const ActionsAliasList = ({ aliases, selected, setSelected, upsertAll }: ActionsAliasListProps) => {
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
    )
}

export default ActionsAliasList
