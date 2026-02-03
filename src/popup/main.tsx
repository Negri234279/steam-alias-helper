import { render } from "preact"

import { useState } from "preact/hooks"
import FormSteamId from "../components/FormSteamId"
import './main.css'

const isDev = import.meta.env.DEV

function App() {
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = (formValues: { steamId: string; alias: string }) => {
        chrome.runtime.sendMessage({ type: 'LOG', from: 'popup', payload: formValues })

        setShowForm(false);
    };

    const handleCancel = () => {
        setShowForm(false);
    }

    return (
        <div>
            <header className="header">
                <div className="title">Steam Alias Helper {isDev && 'DEV'}</div>
                <div className="sub">SteamID64 → Alias (nickname)</div>
            </header>

            <button type="button" className="btn primary" onClick={() => setShowForm(!showForm)}>
                Añadir Alias
            </button>

            {showForm && (
                <section className="card" style={{ marginTop: '.5rem' }}>
                    <FormSteamId onHandleSubmit={handleSubmit} onHandleCancel={handleCancel} />
                </section>
            )}
        </div>
    )
}

render(<App />, document.getElementById("app")!)
