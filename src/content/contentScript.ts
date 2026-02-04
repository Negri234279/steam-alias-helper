const OVERLAY_ID = 'sah_overlay_v1'

function $(sel: string, root: Document | Element | HTMLElement = document) {
    return root.querySelector(sel)
}

function $all(sel: string, root: Document | Element | HTMLElement = document) {
    return Array.from(root.querySelectorAll(sel))
}

function createEl(tag: string, attrs: Record<string, any> = {}, children: (HTMLElement | string)[] = []) {
    const el = document.createElement(tag)

    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'style') Object.assign(el.style, v)
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
        else if (v === false || v == null) continue
        else el.setAttribute(k, String(v))
    }

    for (const c of children) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)

    return el
}

function isSteamProfilePage() {
    return /^\/(id|profiles)\/[^/]+\/?/.test(location.pathname)
}

function ensureOverlay() {
    let root = document.getElementById(OVERLAY_ID)
    if (root) return root

    root = createEl('div', { id: OVERLAY_ID })
    const shadow = root.attachShadow({ mode: 'open' })

    const style = createEl('style', {}, [
        `
    :host { all: initial; }
    .wrap{
      position: fixed;
      right: 14px;
      bottom: 14px;
      width: 320px;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: #e6edf3;
    }
    .card{
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 14px;
      background: rgba(15,17,21,0.92);
      box-shadow: 0 18px 50px rgba(0,0,0,0.45);
      padding: 10px;
      backdrop-filter: blur(10px);
    }
    .row{ display:flex; align-items:center; justify-content:space-between; gap: 8px; }
    .title{ font-weight: 800; font-size: 13px; }
    .muted{ color: rgba(230,237,243,0.72); font-size: 12px; margin-top: 4px; }
    .hr{ height:1px; background: rgba(255,255,255,0.10); margin: 8px 0; }
    .btn{
      height: 30px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(11,14,20,0.85);
      color: #e6edf3;
      padding: 0 10px;
      cursor: pointer;
      user-select:none;
      font-size: 12px;
    }
    .btn:hover{ border-color: rgba(255,255,255,0.25); }
    .btn.primary{
      border-color: rgba(59,130,246,0.55);
      background: rgba(59,130,246,0.16);
    }
    .btn.danger{
      border-color: rgba(239,68,68,0.55);
      background: rgba(239,68,68,0.16);
    }
    .pill{
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      color: rgba(230,237,243,0.75);
      background: rgba(11,14,20,0.7);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .log{
      margin-top: 8px;
      font-size: 12px;
      color: rgba(230,237,243,0.80);
      line-height: 1.3;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 140px;
      overflow: auto;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(11,14,20,0.60);
      padding: 8px;
    }
    .small{ font-size: 11px; color: rgba(230,237,243,0.65); margin-top: 6px; }
    `,
    ])

    const wrap = createEl('div', { class: 'wrap' })
    const card = createEl('div', { class: 'card' })

    const top = createEl('div', { class: 'row' }, [
        createEl('div', {}, [
            createEl('div', { class: 'title' }, ['Steam Alias Helper']),
            createEl('div', { class: 'muted', id: 'sah_sub' }, ['Listo.']),
        ]),
        createEl('button', { class: 'btn danger', id: 'sah_close' }, ['Cerrar']),
    ])

    const hr = createEl('div', { class: 'hr' })

    const info = createEl('div', {}, [
        createEl('div', { class: 'pill', id: 'sah_target' }, ['Sin tarea activa']),
        createEl('div', { class: 'small' }, [
            'Si la automatización falla, usa el menú de Steam: ',
            '"More/Más" → "Set Nickname/Establecer apodo" → Guardar.',
        ]),
    ])

    const actions = createEl('div', { class: 'row', style: { marginTop: '8px' } }, [
        createEl('button', { class: 'btn', id: 'sah_try' }, ['Reintentar aquí']),
        createEl('button', { class: 'btn primary', id: 'sah_help' }, ['¿Dónde está?']),
    ])

    const log = createEl('div', { class: 'log', id: 'sah_log' }, ['Log:\n'])

    card.appendChild(top)
    card.appendChild(hr)
    card.appendChild(info)
    card.appendChild(actions)
    card.appendChild(log)
    wrap.appendChild(card)

    shadow.appendChild(style)
    shadow.appendChild(wrap)

    document.documentElement.appendChild(root)

    // handlers
    shadow.getElementById('sah_close')?.addEventListener('click', () => root.remove())
    shadow.getElementById('sah_help')?.addEventListener('click', () => {
        appendLog(
            "Ayuda:\n1) Pulsa 'More/Más' en el perfil.\n2) Elige 'Set Nickname/Establecer apodo'.\n3) Escribe el alias y guarda.\n",
        )
    })

    shadow.getElementById('sah_try')?.addEventListener('click', async () => {
        if (!lastTask) {
            appendLog('No hay tarea activa.')
            return
        }

        await trySetNickname(lastTask.alias)
    })

    return root
}

function overlayNodes() {
    const root = document.getElementById(OVERLAY_ID)
    if (!root) return null
    const s = root.shadowRoot

    return {
        sub: s?.getElementById('sah_sub'),
        target: s?.getElementById('sah_target'),
        log: s?.getElementById('sah_log'),
    }
}

function setSub(text: string) {
    const n = overlayNodes()
    if (n?.sub) n.sub.textContent = text
}

function setTarget(text: string) {
    const n = overlayNodes()
    if (n?.target) n.target.textContent = text
}

function appendLog(text: string) {
    const n = overlayNodes()
    if (!n?.log) return

    n.log.textContent += text.endsWith('\n') ? text : text + '\n'
    n.log.scrollTop = n.log.scrollHeight
}

function findClickableByText(regex: RegExp, root: Document | HTMLElement = document): HTMLElement | null {
    const candidates = [
        ...$all('a', root),
        ...$all('button', root),
        ...$all("[role='button']", root),
        ...$all('.btn_profile_action', root),
    ] as HTMLElement[]

    for (const el of candidates) {
        const t = (el.textContent || '').trim()
        if (!t) continue
        if (regex.test(t)) return el
    }

    return null
}

function dispatchInput(el: HTMLInputElement | HTMLTextAreaElement) {
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
}

async function click(el: HTMLElement) {
    if (!el) return false

    el.scrollIntoView({ block: 'center', behavior: 'instant' })
    el.click()

    await new Promise((r) => setTimeout(r, 250))

    return true
}

function isNotFriendByDom() {
    // Si aparece el botón "Añadir como amigo" => no sois amigos
    const addFriendBtn = document.getElementById('btn_add_friend')
    if (addFriendBtn) return true

    // Fallback por texto (por si cambia el id)
    const candidates = [
        ...Array.from(
            document.querySelectorAll("a.btn_profile_action, a, button, [role='button']"),
        ),
    ]

    return candidates.some((el) => /añadir\s+como\s+amigo/i.test((el.textContent || '').trim()))
}

function isOwnProfile() {
    // Si aparece el botón "Modificar perfil" => es tu propio perfil
    // Buscar por href que contenga /edit/info
    const editProfileBtn = $('a[href*="/edit/info"]')
    if (editProfileBtn) return true

    // Fallback por texto
    const candidates = [
        ...Array.from(
            document.querySelectorAll("a.btn_profile_action, a, button, [role='button']"),
        ),
    ]

    return candidates.some((el) => /modificar\s+perfil|edit\s+profile/i.test((el.textContent || '').trim()))
}

async function trySetNickname(alias: string) {
    ensureOverlay()

    if (!isSteamProfilePage()) {
        setSub('No parece un perfil de Steam.')
        appendLog('Abre un perfil: https://steamcommunity.com/profiles/STEAMID64/')

        return { ok: false, error: 'No es un perfil.' }
    }

    if (isOwnProfile()) {
        setSub('Es tu propio perfil, omitiendo.')
        appendLog("Detectado 'Modificar perfil'. No se puede poner alias a tu propio perfil. Omitiendo.")

        return {
            ok: true,
            code: 'OWN_PROFILE',
            skipped: true,
            message: 'Es tu propio perfil, se omite sin error.',
        }
    }

    if (isNotFriendByDom()) {
        setSub('Este usuario NO es tu amigo.')
        appendLog(
            "Detectado botón 'Añadir como amigo'. No se puede poner alias (nickname) si no es amigo.",
        )

        return {
            ok: false,
            code: 'NOT_FRIEND',
            error: "El perfil no es tu amigo (aparece 'Añadir como amigo').",
        }
    }

    setSub('Buscando controles…')
    appendLog(`Intentando set nickname = "${alias}"`)

    // 1) Intentar abrir menú More/Más
    // Steam cambia el DOM con frecuencia: intentamos varias estrategias.
    const moreBtn =
        findClickableByText(/^(more|más)\b/i) ||
        findClickableByText(/\bmore\b/i) ||
        $('a.profile_header_actions_btn') ||
        $('.profile_header_actions > a') ||
        $('.profile_header_actions .profile_header_actions_btn')

    if (!moreBtn) {
        setSub("No encontré el botón 'More/Más'.")
        appendLog("No se encontró 'More/Más'. Hazlo manualmente y usa el overlay como guía.")
        return { ok: false, error: 'No se encontró More/Más.' }
    }

    await click(moreBtn as HTMLElement)

    // 2) Buscar opción Set Nickname / Establecer apodo
    setSub("Buscando 'Set Nickname'…")

    // dropdown puede estar en diferentes contenedores
    const dropdownRoots = [
        document,
        $('.profile_header_actions') || document,
        $('.profile_header_actions .popup_body') || document,
    ]

    let nicknameBtn: HTMLElement | null = null
    for (const r of dropdownRoots) {
        nicknameBtn =
            findClickableByText(/set nickname|Añadir alias|alias|nickname/i, r as HTMLElement) ||
            findClickableByText(/nickname/i, r as HTMLElement)
        if (nicknameBtn) break
    }

    if (!nicknameBtn) {
        setSub("No encontré 'Set Nickname'.")
        appendLog(
            "No se encontró la opción 'Set Nickname/Establecer apodo'. Puede que no seas amigo o Steam cambió el DOM.",
        )
        return { ok: false, error: 'No se encontró Set Nickname.' }
    }

    await click(nicknameBtn)

    // 3) Modal: input + botón guardar
    setSub('Esperando modal…')
    await new Promise((r) => setTimeout(r, 400))

    const modal = $('.newmodal') || $('.modal') || $("[class*='Modal']") || document

    const input = ($("input[type='text']", modal) || $("input[type='search']", modal) || $('textarea', modal)) as HTMLInputElement | HTMLTextAreaElement || null

    if (!input) {
        setSub('No encontré el campo de texto.')
        appendLog('No se encontró input en el modal. Intenta manualmente.')
        return { ok: false, error: 'No se encontró input.' }
    }

    input.focus()
    input.value = alias
    dispatchInput(input)

    // botones típicos: Save / OK / Set / Guardar / Aceptar
    const saveBtn =
        findClickableByText(/save|ok|set|guardar|aceptar/i, modal as HTMLElement) ||
        $("button[type='submit']", modal)

    if (!saveBtn) {
        setSub('No encontré el botón de guardar.')
        appendLog("No se encontró el botón 'Save/Guardar'. Intenta manualmente.")
        return { ok: false, error: 'No se encontró botón guardar.' }
    }

    await click(saveBtn as HTMLElement)

    setSub('Hecho (si Steam lo aceptó).')
    appendLog('Acción enviada. Si no se actualizó, revisa el overlay y hazlo manualmente.')
    return { ok: true }
}

// Estado de última tarea enviada desde background
let lastTask: any = null

// Listener de mensajes desde background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    ; (async () => {
        if (msg?.type === 'SET_ALIAS') {
            const { steamId, alias } = msg.payload || {}
            lastTask = { steamId, alias }

            ensureOverlay()
            setTarget(`Objetivo: ${alias} ← ${steamId}`)
            appendLog(
                `\n---\nTarea recibida desde extensión:\nSteamID64: ${steamId}\nAlias: ${alias}\nURL actual: ${location.href}\n`,
            )

            // Intentar automáticamente
            const res = await trySetNickname(alias)
            sendResponse(res)
            return
        }

        sendResponse({ ok: false, error: 'Mensaje desconocido.' })
    })()

    return true
})

    // Si estás en Steam, puedes mostrar el overlay “pasivo” una vez
    // (no molesta: solo se crea cuando llega tarea o si es perfil)
    ; (function softInit() {
        if (isSteamProfilePage()) {
            // No lo mostramos siempre para evitar “ruido”.
            // Si quieres que siempre aparezca, descomenta:
            // ensureOverlay();
        }
    })()
