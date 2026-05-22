import { ProfileState, type SetAliasResponse } from '../domain/models'
import { DomUtils } from '../infrastructure/DomUtils'
import { OverlayUI } from '../infrastructure/OverlayUI'
import { SteamProfileDetector } from '../infrastructure/SteamProfileDetector'

export class SetNicknameUseCase {
    constructor(
        private overlay: OverlayUI,
        private profileDetector: SteamProfileDetector,
    ) {}

    async execute(alias: string): Promise<SetAliasResponse> {
        this.overlay.ensure()

        const fatalError = this.detectFatalErrorPage()
        if (fatalError) return fatalError

        const profileInfo = this.profileDetector.detectProfileState()

        if (!profileInfo.isSteamProfile) {
            this.overlay.setSub('No parece un perfil de Steam.')
            this.overlay.appendLog('Abre un perfil: https://steamcommunity.com/profiles/STEAMID64/')
            return { ok: false, error: 'No es un perfil.' }
        }

        if (profileInfo.state === ProfileState.OwnProfile) {
            return this.handleOwnProfile()
        }

        if (profileInfo.state === ProfileState.NotFriend) {
            return await this.handleNotFriend()
        }

        const currentNickname = this.profileDetector.getCurrentNickname()
        if (currentNickname !== null && currentNickname === alias) {
            return this.handleAlreadySet(alias)
        }

        return await this.attemptSetNickname(alias)
    }

    /**
     * Cuando Steam limita la cuenta sustituye la página del perfil por
     * `<div class="profile_fatalerror">`. Hay que detectarlo ANTES de buscar
     * controles, porque en esa página no existe ni el menú ni el modal.
     */
    private detectFatalErrorPage(): SetAliasResponse | null {
        const fatal = DomUtils.query<HTMLElement>('.profile_fatalerror')
        if (!fatal) return null

        const msgEl = DomUtils.query<HTMLElement>('.profile_fatalerror_message', fatal)
        const message = (msgEl?.textContent || fatal.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()

        const isRateLimit =
            /demasiadas solicitudes|too many requests|inténtalo de nuevo más tarde|try again later/i.test(
                message,
            )

        if (isRateLimit) {
            this.overlay.setSub('Steam está limitando las solicitudes.')
            this.overlay.appendLog(
                `Steam devolvió una página de error por exceso de solicitudes: "${message}".`,
            )
            return {
                ok: false,
                code: 'RATE_LIMITED',
                error: 'Steam está limitando la cuenta por demasiadas solicitudes recientes.',
            }
        }

        this.overlay.setSub('Steam devolvió una página de error.')
        this.overlay.appendLog(`Página de error de Steam: "${message}".`)
        return {
            ok: false,
            code: 'STEAM_ERROR',
            error: message || 'Steam devolvió una página de error.',
        }
    }

    private handleAlreadySet(alias: string): SetAliasResponse {
        this.overlay.setSub('El alias ya coincide, omitiendo.')
        this.overlay.appendLog(
            `El nickname actual ya es "${alias}". Se omite el flujo de menús para acelerar la actualización.`,
        )

        return {
            ok: true,
            code: 'ALREADY_SET',
            skipped: true,
            message: 'El alias ya estaba asignado, se omite sin tocar el DOM.',
        }
    }

    private handleOwnProfile(): SetAliasResponse {
        this.overlay.setSub('Es tu propio perfil, omitiendo.')
        this.overlay.appendLog(
            "Detectado 'Modificar perfil'. No se puede poner alias a tu propio perfil. Omitiendo.",
        )

        return {
            ok: true,
            code: 'OWN_PROFILE',
            skipped: true,
            message: 'Es tu propio perfil, se omite sin error.',
        }
    }

    private async handleNotFriend(): Promise<SetAliasResponse> {
        this.overlay.setSub('Este usuario NO es tu amigo.')
        this.overlay.appendLog(
            "Detectado botón 'Añadir como amigo'. No se puede poner alias (nickname) si no es amigo.",
        )

        const friendRequestSent = await this.tryClickAddFriend()

        return {
            ok: false,
            code: 'NOT_FRIEND',
            error: "El perfil no es tu amigo (aparece 'Añadir como amigo').",
            friendRequestSent,
        }
    }

    private async tryClickAddFriend(): Promise<boolean> {
        const sessionId = this.getSessionId()
        const steamId = this.extractSteamIdFromPage()

        if (!sessionId) {
            this.overlay.appendLog('No se encontró sessionID en cookies. ¿Estás logueado en Steam?')
            return false
        }

        if (!steamId) {
            this.overlay.appendLog('No se pudo extraer el SteamID64 numérico de la página.')
            return false
        }

        this.overlay.appendLog('Enviando solicitud de amistad…')

        try {
            const body = new URLSearchParams({
                sessionID: sessionId,
                steamid: steamId,
                accept_invite: '0',
            })

            const res = await fetch('https://steamcommunity.com/actions/AddFriendAjax', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: body.toString(),
            })

            const json = (await res.json().catch(() => null)) as {
                success?: number | boolean
                failed_invites?: string[]
                failed_invites_result?: number[]
            } | null

            const failed =
                Array.isArray(json?.failed_invites) && json!.failed_invites!.includes(steamId)
            const httpOk = res.ok
            const apiOk = json?.success === 1 || json?.success === true
            const accepted = httpOk && apiOk && !failed

            if (accepted) {
                this.overlay.setSub('Solicitud de amistad enviada.')
                this.overlay.appendLog('Solicitud de amistad enviada correctamente.')
                return true
            }

            const reasonCode = json?.failed_invites_result?.[0]
            const reason = this.describeFailReason(reasonCode)
            this.overlay.setSub('No se pudo enviar la solicitud.')
            this.overlay.appendLog(
                `AddFriend falló (HTTP ${res.status}, code=${reasonCode ?? 'n/a'}): ${reason}`,
            )
            return false
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            this.overlay.appendLog(`Error enviando solicitud de amistad: ${msg}`)
            return false
        }
    }

    private getSessionId(): string | null {
        const m = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/)
        return m ? decodeURIComponent(m[1]) : null
    }

    private extractSteamIdFromPage(): string | null {
        const path = location.pathname.match(/\/profiles\/(\d{17})/)
        if (path) return path[1]

        const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        const fromCanonical = canonical?.href.match(/\/profiles\/(\d{17})/)
        if (fromCanonical) return fromCanonical[1]

        const html = document.documentElement.innerHTML
        const inline = html.match(/g_rgProfileData\s*=\s*\{[^}]*"steamid"\s*:\s*"(\d{17})"/)
        if (inline) return inline[1]

        return null
    }

    private describeFailReason(code?: number): string {
        const reasons: Record<number, string> = {
            15: 'Ya tienes una invitación pendiente con este usuario.',
            24: 'Perfil no disponible o privado.',
            25: 'Has alcanzado el límite de invitaciones pendientes.',
            40: 'Cuenta limitada: necesitas haber gastado al menos 5 USD en Steam.',
            41: 'Solicitud rechazada por Steam (rate-limit, cuenta limitada o ya enviada recientemente).',
            84: 'Demasiadas solicitudes en poco tiempo (rate limit). Espera un rato.',
        }

        return reasons[code ?? -1] || 'Razón desconocida.'
    }

    private async attemptSetNickname(alias: string): Promise<SetAliasResponse> {
        this.overlay.setSub('Buscando controles…')
        this.overlay.appendLog(`Intentando set nickname = "${alias}"`)

        // 1) Abrir menú More/Más
        const moreBtn = this.findMoreButton()
        if (!moreBtn) {
            return this.handleError(
                "No encontré el botón 'More/Más'.",
                "No se encontró 'More/Más'. Hazlo manualmente y usa el overlay como guía.",
                'No se encontró More/Más.',
            )
        }

        await DomUtils.clickElement(moreBtn)

        // 2) Buscar opción Set Nickname (el menú se despliega de forma asíncrona)
        this.overlay.setSub("Buscando 'Set Nickname'…")

        const nicknameBtn = await DomUtils.waitFor(() => this.findNicknameButton(), {
            timeout: 2500,
        })
        if (!nicknameBtn) {
            return this.handleError(
                "No encontré 'Set Nickname'.",
                "No se encontró la opción 'Set Nickname/Establecer apodo'. Puede que no seas amigo o Steam cambió el DOM.",
                'No se encontró Set Nickname.',
            )
        }

        await DomUtils.clickElement(nicknameBtn)

        // 3) Completar modal
        return await this.completeModal(alias)
    }

    private findMoreButton(): HTMLElement | null {
        return (
            DomUtils.findClickableByText(/^(more|más)\b/i) ||
            DomUtils.findClickableByText(/\bmore\b/i) ||
            DomUtils.query<HTMLElement>('a.profile_header_actions_btn') ||
            DomUtils.query<HTMLElement>('.profile_header_actions > a') ||
            DomUtils.query<HTMLElement>('.profile_header_actions .profile_header_actions_btn')
        )
    }

    private findNicknameButton(): HTMLElement | null {
        const dropdownRoots = [
            document,
            DomUtils.query('.profile_header_actions') || document,
            DomUtils.query('.profile_header_actions .popup_body') || document,
        ]

        for (const root of dropdownRoots) {
            const btn =
                DomUtils.findClickableByText(
                    /set nickname|Añadir alias|alias|nickname/i,
                    root as HTMLElement,
                ) || DomUtils.findClickableByText(/nickname/i, root as HTMLElement)

            if (btn) return btn
        }

        return null
    }

    private async completeModal(alias: string): Promise<SetAliasResponse> {
        this.overlay.setSub('Esperando modal…')

        const modal = await DomUtils.waitFor<HTMLElement>(
            () =>
                DomUtils.query<HTMLElement>('.newmodal') ||
                DomUtils.query<HTMLElement>('.modal') ||
                DomUtils.query<HTMLElement>("[class*='Modal']"),
            { timeout: 3000 },
        )

        const searchRoot: Element | Document = modal ?? document

        const input = await DomUtils.waitFor<HTMLInputElement | HTMLTextAreaElement>(
            () => this.findInput(searchRoot),
            { timeout: 2500 },
        )
        if (!input) {
            return this.handleError(
                'No encontré el campo de texto.',
                'No se encontró input en el modal. Intenta manualmente.',
                'No se encontró input.',
            )
        }

        input.focus()
        input.value = alias
        DomUtils.dispatchInputEvents(input)

        const saveBtn = this.findSaveButton(searchRoot)
        if (!saveBtn) {
            return this.handleError(
                'No encontré el botón de guardar.',
                "No se encontró el botón 'Save/Guardar'. Intenta manualmente.",
                'No se encontró botón guardar.',
            )
        }

        await DomUtils.clickElement(saveBtn)

        return await this.verifySaveResult(modal)
    }

    /**
     * Tras pulsar «Guardar», Steam responde de forma asíncrona. Sondeamos el DOM
     * para distinguir tres casos:
     *  - aparece un error de Steam  -> RATE_LIMITED (el background reintentará)
     *  - el modal se cierra         -> éxito confirmado
     *  - ni una cosa ni otra        -> enviado pero sin confirmar
     */
    private async verifySaveResult(modal: HTMLElement | null): Promise<SetAliasResponse> {
        this.overlay.setSub('Verificando respuesta de Steam…')

        const timeout = 4000
        const interval = 150
        const started = Date.now()

        while (Date.now() - started < timeout) {
            const steamError = this.findSteamError()
            if (steamError) {
                this.overlay.setSub('Steam rechazó la petición.')
                this.overlay.appendLog(
                    `Steam devolvió un error al procesar la petición: "${steamError}". ` +
                        'Suele ser un límite de velocidad; se reintentará tras una pausa.',
                )
                return {
                    ok: false,
                    code: 'RATE_LIMITED',
                    error: 'Steam devolvió un error al procesar la petición (posible límite de velocidad).',
                }
            }

            // El modal de Steam se elimina del DOM cuando el apodo se guarda bien.
            if (modal && !document.contains(modal)) {
                this.overlay.setSub('Apodo actualizado.')
                this.overlay.appendLog('Steam aceptó el apodo (el modal se cerró sin errores).')
                return { ok: true }
            }

            await DomUtils.delay(interval)
        }

        this.overlay.setSub('Enviado (sin confirmación explícita).')
        this.overlay.appendLog(
            'No apareció ningún error de Steam, pero tampoco se confirmó el cierre del modal. ' +
                'Revisa el perfil manualmente si tienes dudas.',
        )
        return { ok: true, code: 'UNCONFIRMED' }
    }

    /** Busca el texto de error / límite de velocidad de Steam tras guardar. */
    private findSteamError(): string | null {
        // Frases inequívocas de error o rate-limit: seguras de buscar en toda la
        // página (Steam puede mostrarlas en un modal o como página completa).
        const hardRegex =
            /se ha producido un error|demasiadas solicitudes|too many requests|inténtalo de nuevo más tarde|try again later/i
        // Patrón más amplio: solo dentro de modales, para evitar falsos positivos.
        const modalRegex = /something went wrong|error.*(solicitud|procesa|request)/i

        const bodyText = (document.body?.textContent || '').replace(/\s+/g, ' ').trim()
        const hardMatch = bodyText.match(hardRegex)
        if (hardMatch) {
            const idx = bodyText.toLowerCase().indexOf(hardMatch[0].toLowerCase())
            return bodyText.slice(idx, idx + 160)
        }

        const modals = DomUtils.queryAll<HTMLElement>(".newmodal, .modal, [class*='Modal']")
        for (const modalEl of modals) {
            const text = (modalEl.textContent || '').replace(/\s+/g, ' ').trim()
            if (text && modalRegex.test(text)) {
                return text.slice(0, 160)
            }
        }

        return null
    }

    private findInput(modal: Element | Document): HTMLInputElement | HTMLTextAreaElement | null {
        return (
            DomUtils.query<HTMLInputElement>("input[type='text']", modal) ||
            DomUtils.query<HTMLInputElement>("input[type='search']", modal) ||
            DomUtils.query<HTMLTextAreaElement>('textarea', modal)
        )
    }

    private findSaveButton(modal: Element | Document): HTMLElement | null {
        return (
            DomUtils.findClickableByText(/save|ok|set|guardar|aceptar/i, modal as HTMLElement) ||
            DomUtils.query<HTMLButtonElement>("button[type='submit']", modal)
        )
    }

    private handleError(subText: string, logText: string, errorMessage: string): SetAliasResponse {
        this.overlay.setSub(subText)
        this.overlay.appendLog(logText)
        return { ok: false, error: errorMessage }
    }
}
