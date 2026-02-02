import { render } from "preact"

import './main.css'

const isDev = import.meta.env.DEV

function App() {
    return (
        <div>
            <header class="header">
                <div class="title">Steam Alias Helper {isDev && "DEV"}</div>
                <div class="sub">SteamID64 → Alias (nickname)</div>
            </header>
        </div>
    )
}

render(<App />, document.getElementById("app")!)
