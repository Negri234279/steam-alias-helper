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
    const { state: stateIO, exportAliases, importAliases } = useSteamAliasesIO()
    const { success } = useToast()

    const isDisabled = aliases.loading || stateIO.loading

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
                            onHandleShowEditAlias={onHandleShowEditAlias}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}

            <div class="actions">
                {!!aliases.data.length && (
                    <button id="markAllBtn" class="btn" type="button" disabled={isDisabled}>
                        Marcar todos
                    </button>
                )}

                {!!aliases.data.length && (
                    <button id="unmarkAllBtn" class="btn" type="button" disabled={isDisabled}>
                        Desmarcar todos
                    </button>
                )}

                {!!aliases.data.length && (
                    <button
                        id="exportBtn"
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
                        class="btn primary"
                        type="button"
                        disabled={isDisabled}
                    >
                        Actualizar seleccionados
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
