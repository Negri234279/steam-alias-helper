const STORAGE_KEY = 'friends_v1'

const el = {
    addForm: document.getElementById('addForm'),
    steamIdInput: document.getElementById('steamIdInput'),
    aliasInput: document.getElementById('aliasInput'),
    errorBox: document.getElementById('errorBox'),
    list: document.getElementById('list'),
    countBadge: document.getElementById('countBadge'),

    markAllBtn: document.getElementById('markAllBtn'),
    unmarkAllBtn: document.getElementById('unmarkAllBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput'),
    updateSelectedBtn: document.getElementById('updateSelectedBtn'),

    progressWrap: document.getElementById('progressWrap'),
    progressText: document.getElementById('progressText'),
    progressFill: document.getElementById('progressFill'),
    progressDetail: document.getElementById('progressDetail'),
    cancelBtn: document.getElementById('cancelBtn'),
}

let state = {
    items: [],
    isUpdating: false,
    runId: null,
}

function showError(msg, isHtml = false) {
    // Crear contenedor con el mensaje y botón de cierre
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.className = 'errorClose'
    closeBtn.style.cssText = 'position: absolute; top: 8px; right: 8px; background: none; border: none; color: inherit; cursor: pointer; font-size: 18px; line-height: 1; padding: 0; width: 20px; height: 20px; opacity: 0.7;'
    closeBtn.title = 'Cerrar'
    closeBtn.addEventListener('click', clearError)
    
    el.errorBox.innerHTML = ''
    
    if (isHtml) {
        const content = document.createElement('div')
        content.innerHTML = msg
        content.style.paddingRight = '24px' // espacio para el botón
        el.errorBox.appendChild(content)
    } else {
        const content = document.createElement('div')
        content.textContent = msg
        content.style.paddingRight = '24px' // espacio para el botón
        el.errorBox.appendChild(content)
    }
    
    el.errorBox.appendChild(closeBtn)
    el.errorBox.style.position = 'relative'
    el.errorBox.classList.remove('hidden')
}

function clearError() {
    el.errorBox.textContent = ''
    el.errorBox.classList.add('hidden')
}

function isValidSteamId64(s) {
    const id = normalizeSteamId(s)
    return typeof id === 'string' && /^\d{17}$/.test(id)
}


function normalizeSteamId(input) {
    if (input == null) return ''

    let s = String(input).trim()

    // Si es URL completa de Steam -> extraer el SteamID64
    // https://steamcommunity.com/profiles/76561198041183301/
    const match = s.match(/steamcommunity\.com\/profiles\/(\d{17})/i)
    if (match) {
        return match[1]
    }

    // Si ya es solo el SteamID64
    if (/^\d{17}$/.test(s)) {
        return s
    }

    // Cualquier otra cosa se devuelve tal cual (fallará en validación)
    return s
}


function normalizeAlias(s) {
    return String(s || '').trim()
}

async function storageGet() {
    const res = await chrome.storage.local.get([STORAGE_KEY])
    const items = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : []
    return items
}

async function storageSet(items) {
    await chrome.storage.local.set({ [STORAGE_KEY]: items })
}

function stableSortImportantFirst(items) {
    // Orden estable: importantes arriba, manteniendo el orden original dentro de cada grupo
    const withIndex = items.map((it, idx) => ({ it, idx }))
    withIndex.sort((a, b) => {
        const ai = !!a.it.important
        const bi = !!b.it.important
        if (ai === bi) return a.idx - b.idx
        return ai ? -1 : 1
    })
    return withIndex.map((x) => x.it)
}

function truncateSteamId(id) {
    if (!id) return ''
    const s = String(id)
    if (s.length <= 12) return s
    return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function setUpdatingUI(isUpdating) {
    state.isUpdating = isUpdating

    // Deshabilita controles mientras está corriendo
    const disabled = isUpdating
    for (const btn of [el.markAllBtn, el.unmarkAllBtn, el.exportBtn, el.updateSelectedBtn]) {
        btn.disabled = disabled
        btn.style.opacity = disabled ? '0.6' : '1'
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer'
    }
    el.steamIdInput.disabled = disabled
    el.aliasInput.disabled = disabled

    // Import también
    el.importInput.disabled = disabled

    el.progressWrap.classList.toggle('hidden', !isUpdating)
}

function updateProgressUI(p) {
    // p: { done, total, currentLabel, statusLine, finished, nonFriends }
    const done = Number(p?.done || 0)
    const total = Number(p?.total || 0)
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    el.progressText.textContent = `${done}/${total} (${pct}%)`
    el.progressFill.style.width = `${pct}%`
    el.progressDetail.textContent = p?.statusLine || ''

    if (p?.finished) {
        setUpdatingUI(false)
        state.runId = null

        // Mostrar usuarios que no son amigos
        if (Array.isArray(p.nonFriends) && p.nonFriends.length) {
            const listItems = p.nonFriends.map((x) => `<li>${x.alias} <span style="color: var(--muted); font-size: 0.9em;">(${x.steamId})</span></li>`).join('')
            showError(
                `⚠️ ${p.nonFriends.length} usuario(s) no son tus amigos y no se pudieron actualizar:<ul style="margin: 8px 0; padding-left: 20px;">${listItems}</ul>`,
                true
            )
        } else {
            // Si no hay errores, mostrar mensaje de éxito
            showError('✅ Proceso completado exitosamente. Todos los alias han sido actualizados.')
        }
    }
}

function render() {
    const sorted = stableSortImportantFirst(state.items)
    el.list.innerHTML = ''
    el.countBadge.textContent = String(sorted.length)

    if (sorted.length === 0) {
        const empty = document.createElement('div')
        empty.style.color = 'var(--muted)'
        empty.style.padding = '8px'
        empty.textContent = 'No hay elementos todavía.'
        el.list.appendChild(empty)
        return
    }

    for (const item of sorted) {
        const row = document.createElement('div')
        row.className = 'row'

        // checkbox selected
        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.checked = item.selected !== false // por defecto true
        cb.addEventListener('change', async () => {
            item.selected = cb.checked
            await storageSet(state.items)
        })

        // estrella important
        const star = document.createElement('div')
        star.className = 'star ' + (item.important ? 'on' : 'off')
        star.textContent = item.important ? '⭐' : '☆'
        star.title = item.important ? 'Quitar de importantes' : 'Marcar como importante'
        star.addEventListener('click', async () => {
            item.important = !item.important
            await storageSet(state.items)
            render()
        })

        // meta alias + steamid
        const meta = document.createElement('div')
        meta.className = 'meta'

        const aliasLine = document.createElement('div')
        aliasLine.className = 'aliasLine'

        const alias = document.createElement('div')
        alias.className = 'alias'
        alias.textContent = item.alias || '(sin alias)'
        alias.title = 'Click para editar alias'
        alias.style.cursor = 'pointer'
        alias.addEventListener('click', () => editItem(item))

        aliasLine.appendChild(alias)

        const steamId = document.createElement('div')
        steamId.className = 'steamId'
        steamId.textContent = item.steamId
        steamId.title = item.steamId || ''
        steamId.style.cursor = 'pointer'
        steamId.addEventListener('click', () => editItem(item))

        meta.appendChild(aliasLine)
        meta.appendChild(steamId)

        // delete button
        const delBtn = document.createElement('button')
        delBtn.className = 'iconBtn'
        delBtn.type = 'button'
        delBtn.title = 'Eliminar'
        delBtn.textContent = '🗑️'
        delBtn.addEventListener('click', async () => {
            state.items = state.items.filter((x) => x.steamId !== item.steamId)
            await storageSet(state.items)
            render()
        })

        row.appendChild(cb)
        row.appendChild(star)
        row.appendChild(meta)
        row.appendChild(delBtn)
        el.list.appendChild(row)
    }
}

async function load() {
    const items = await storageGet()
    // Normaliza defaults
    state.items = items.map((x) => ({
        steamId: normalizeSteamId(x.steamId),
        alias: normalizeAlias(x.alias),
        selected: x.selected !== false,
        important: !!x.important,
    }))
    await storageSet(state.items) // asegura shape
    render()
    
    // Verificar si hay nonFriends del último run
    const res = await chrome.storage.local.get(['lastRunNonFriends'])
    if (Array.isArray(res.lastRunNonFriends) && res.lastRunNonFriends.length > 0) {
        const listItems = res.lastRunNonFriends.map((x) => `<li>${x.alias} <span style="color: var(--muted); font-size: 0.9em;">(${x.steamId})</span></li>`).join('')
        showError(
            `⚠️ ${res.lastRunNonFriends.length} usuario(s) no son tus amigos y no se pudieron actualizar:<ul style="margin: 8px 0; padding-left: 20px;">${listItems}</ul>`,
            true
        )
        // Limpiar del storage después de mostrarlo
        await chrome.storage.local.remove(['lastRunNonFriends'])
    }
}

async function upsertItem(steamId, alias) {
    const id = normalizeSteamId(steamId)
    const al = normalizeAlias(alias)

    if (!isValidSteamId64(id)) {
        showError('SteamID64 inválido. Debe ser numérico y de 17 dígitos.')
        return
    }
    if (!al) {
        showError('Alias no puede estar vacío.')
        return
    }

    clearError()

    const existing = state.items.find((x) => x.steamId === id)
    if (existing) {
        // Evitar duplicados: si existe, actualiza alias
        existing.alias = al
        // no tocamos selected por si el usuario lo desmarcó
    } else {
        state.items.push({
            steamId: id,
            alias: al,
            selected: true,
            important: false,
        })
    }

    await storageSet(state.items)
    render()
}

async function editItem(item) {
    // Edición simple via prompt (rápido y efectivo para popup)
    const newAlias = prompt('Nuevo alias:', item.alias || '')
    if (newAlias === null) return

    const trimmedAlias = normalizeAlias(newAlias)
    if (!trimmedAlias) {
        showError('Alias no puede estar vacío.')
        return
    }

    const newSteamId = prompt(
        'SteamID64 (dejar igual si no quieres cambiarlo):',
        item.steamId || '',
    )
    if (newSteamId === null) return

    const trimmedId = normalizeSteamId(newSteamId)
    if (!isValidSteamId64(trimmedId)) {
        showError('SteamID64 inválido. Debe ser numérico y de 17 dígitos.')
        return
    }

    // Si cambió el ID, evitar colisión
    const collision = state.items.find((x) => x.steamId === trimmedId && x !== item)
    if (collision) {
        // Si ya existe ese steamId, actualiza alias del existente y elimina el actual
        collision.alias = trimmedAlias
        collision.selected = item.selected !== false
        collision.important = collision.important || item.important
        state.items = state.items.filter((x) => x !== item)
    } else {
        item.steamId = trimmedId
        item.alias = trimmedAlias
    }

    clearError()
    await storageSet(state.items)
    render()
}

function downloadJson(filename, obj) {
    const json = JSON.stringify(obj, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function sanitizeImportedItems(arr) {
    // Formato requerido:
    // [{"steamId":"7656...","alias":"Pepe","selected":true}]
    if (!Array.isArray(arr)) throw new Error('El JSON debe ser un array.')

    const out = []
    for (const raw of arr) {
        const steamId = normalizeSteamId(raw?.steamId)
        const alias = normalizeAlias(raw?.alias)
        const selected = raw?.selected !== false
        const important = !!raw?.important

        if (!isValidSteamId64(steamId)) {
            throw new Error(`SteamID64 inválido en importación: ${steamId || '(vacío)'}`)
        }
        if (!alias) {
            throw new Error(`Alias vacío en importación para SteamID: ${steamId}`)
        }

        // Evita duplicados dentro del import: último gana
        const existing = out.find((x) => x.steamId === steamId)
        if (existing) {
            existing.alias = alias
            existing.selected = selected
            existing.important = existing.important || important
        } else {
            out.push({ steamId, alias, selected, important })
        }
    }
    return out
}

async function startUpdateSelected() {
    clearError()

    const selected = state.items.filter((x) => x.selected !== false)
    if (selected.length === 0) {
        showError('No hay elementos seleccionados para actualizar.')
        return
    }

    // Inicia run en background
    setUpdatingUI(true)
    el.progressDetail.textContent = 'Iniciando…'

    const resp = await chrome.runtime.sendMessage({
        type: 'START_UPDATE',
        payload: {
            items: selected.map((x) => ({
                steamId: x.steamId,
                alias: x.alias,
            })),
        },
    })

    if (!resp?.ok) {
        setUpdatingUI(false)
        showError(resp?.error || 'No se pudo iniciar la actualización.')
        return
    }

    state.runId = resp.runId
    updateProgressUI(resp.progress)
}

async function cancelUpdate() {
    if (!state.runId) return
    const resp = await chrome.runtime.sendMessage({
        type: 'CANCEL_UPDATE',
        payload: { runId: state.runId },
    })
    if (!resp?.ok) showError(resp?.error || 'No se pudo cancelar.')
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'UPDATE_PROGRESS') {
        updateProgressUI(msg.progress)
    }
})

el.addForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    await upsertItem(el.steamIdInput.value, el.aliasInput.value)
    el.steamIdInput.value = ''
    el.aliasInput.value = ''
    el.steamIdInput.focus()
})

el.markAllBtn.addEventListener('click', async () => {
    state.items.forEach((x) => (x.selected = true))
    await storageSet(state.items)
    render()
})

el.unmarkAllBtn.addEventListener('click', async () => {
    state.items.forEach((x) => (x.selected = false))
    await storageSet(state.items)
    render()
})

el.exportBtn.addEventListener('click', async () => {
    clearError()
    // Export EXACTO en el formato pedido (incluye selected)
    const exported = state.items.map((x) => ({
        steamId: x.steamId,
        alias: x.alias,
        selected: x.selected !== false,
        // opcional extra:
        important: !!x.important,
    }))
    downloadJson('steam-alias-list.json', exported)
})

el.importInput.addEventListener('change', async (e) => {
    clearError()
    const file = e.target.files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const items = sanitizeImportedItems(parsed)

        // Reemplazo por simplicidad
        state.items = items
        await storageSet(state.items)
        render()
    } catch (err) {
        showError(`Importación inválida: ${err?.message || String(err)}`)
    } finally {
        // permite reimportar el mismo archivo
        e.target.value = ''
    }
})

el.updateSelectedBtn.addEventListener('click', startUpdateSelected)
el.cancelBtn.addEventListener('click', cancelUpdate)

// Inicializa
load()
