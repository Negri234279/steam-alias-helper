import { render } from 'preact'
import { useState } from 'preact/hooks'

import AliasList from '../components/AliasList'
import FormSteamId from '../components/FormSteamId'
import { useSteamAliases } from '../hooks/useAliases'
import { useFormSteamId } from '../hooks/useFormSteamId'
import { ToastContainer, ToastProvider } from '../shared/toast'
import type { Alias } from '../types/alias'
import './main.css'

const isDev = import.meta.env.DEV

function App() {
    const [showForm, setShowForm] = useState(false)

    const formSteamId = useFormSteamId()
    const { state, upsert, upsertAll, remove } = useSteamAliases({ autoLoad: true })

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
        <ToastProvider>
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

            <AliasList
                aliases={state}
                upsertAll={upsertAll}
                onHandleShowEditAlias={handleShowEditAlias}
                onRemove={remove}
            />

            <ToastContainer />
        </ToastProvider>
    )
}

render(<App />, document.getElementById('app')!)
