import { render } from 'preact'
import { useState } from 'preact/hooks'

import AliasList from '../components/AliasList'
import FormReplaceCharacter from '../components/FormReplaceCharacter'
import FormSteamId from '../components/FormSteamId'
import UpdateProgressDisplay from '../components/UpdateProgressDisplay'
import { useSteamAliases } from '../hooks/useAliases'
import { useFormSteamId } from '../hooks/useFormSteamId'
import { useReplaceCharacter } from '../hooks/useReplaceCharacter'
import { ToastContainer, ToastProvider } from '../shared/toast'
import type { Alias } from '../types/alias'
import './main.css'

const isDev = import.meta.env.DEV

function App() {
    const [showForm, setShowForm] = useState(false)
    const [selected, setSelected] = useState<Map<string, Alias>>(new Map())

    const formSteamId = useFormSteamId()
    const { state, upsert, upsertAll, remove } = useSteamAliases({ autoLoad: true })

    const replaceCharacter = useReplaceCharacter({
        aliases: state.data,
        selectedSteamIds: new Set(selected.keys()),
        upsertAll,
        onSuccess: () => setSelected(new Map()),
    })

    const handleSubmit = async (formValues: { steamId: string; alias: string }) => {
        await upsert(formValues)

        setShowForm(false)
    }

    const handleCancel = () => {
        setShowForm(false)
    }

    const handleShowEditAlias = async (alias: Alias) => {
        formSteamId.setSteamId(alias.steamId)
        formSteamId.setAlias(alias.alias)

        setShowForm(true)
    }

    return (
        <>
            <header className="header">
                <div className="title">Steam Alias Helper {isDev && 'DEV'}</div>
                <div className="sub">SteamID64 → Alias (nickname)</div>
            </header>

            <button type="button" className="btn primary" onClick={() => setShowForm(!showForm)}>
                Añadir Alias
            </button>

            {showForm && (
                <section className="card" style={{ marginTop: '.5rem' }}>
                    <FormSteamId
                        useFormSteamId={formSteamId}
                        onHandleSubmit={handleSubmit}
                        onHandleCancel={handleCancel}
                    />
                </section>
            )}

            {replaceCharacter.showForm && (
                <section className="card" style={{ marginTop: '.5rem' }}>
                    <FormReplaceCharacter
                        onHandleSubmit={replaceCharacter.replaceCharacter}
                        onHandleCancel={replaceCharacter.closeForm}
                    />
                </section>
            )}

            <UpdateProgressDisplay />

            <AliasList
                aliases={state}
                upsertAll={upsertAll}
                onHandleShowEditAlias={handleShowEditAlias}
                onRemove={remove}
                onShowReplaceForm={replaceCharacter.openForm}
                selected={selected}
                setSelected={setSelected}
            />
        </>
    )
}

render(
    <ToastProvider>
        <App />
        <ToastContainer />
    </ToastProvider>,
    document.getElementById('app')!,
)
