import { ProfileState, type SetAliasResponse } from '../domain/models'
import { DomUtils } from '../infrastructure/DomUtils'
import { OverlayUI } from '../infrastructure/OverlayUI'
import { SteamProfileDetector } from '../infrastructure/SteamProfileDetector'

export class SetNicknameUseCase {
    constructor(
        private overlay: OverlayUI,
        private profileDetector: SteamProfileDetector
    ) {}

    async execute(alias: string): Promise<SetAliasResponse> {
        this.overlay.ensure()

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
            return this.handleNotFriend()
        }

        return await this.attemptSetNickname(alias)
    }

    private handleOwnProfile(): SetAliasResponse {
        this.overlay.setSub('Es tu propio perfil, omitiendo.')
        this.overlay.appendLog(
            "Detectado 'Modificar perfil'. No se puede poner alias a tu propio perfil. Omitiendo."
        )

        return {
            ok: true,
            code: 'OWN_PROFILE',
            skipped: true,
            message: 'Es tu propio perfil, se omite sin error.',
        }
    }

    private handleNotFriend(): SetAliasResponse {
        this.overlay.setSub('Este usuario NO es tu amigo.')
        this.overlay.appendLog(
            "Detectado botón 'Añadir como amigo'. No se puede poner alias (nickname) si no es amigo."
        )

        return {
            ok: false,
            code: 'NOT_FRIEND',
            error: "El perfil no es tu amigo (aparece 'Añadir como amigo').",
        }
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
                'No se encontró More/Más.'
            )
        }

        await DomUtils.clickElement(moreBtn)

        // 2) Buscar opción Set Nickname
        this.overlay.setSub("Buscando 'Set Nickname'…")

        const nicknameBtn = this.findNicknameButton()
        if (!nicknameBtn) {
            return this.handleError(
                "No encontré 'Set Nickname'.",
                "No se encontró la opción 'Set Nickname/Establecer apodo'. Puede que no seas amigo o Steam cambió el DOM.",
                'No se encontró Set Nickname.'
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
                DomUtils.findClickableByText(/set nickname|Añadir alias|alias|nickname/i, root as HTMLElement) ||
                DomUtils.findClickableByText(/nickname/i, root as HTMLElement)

            if (btn) return btn
        }

        return null
    }

    private async completeModal(alias: string): Promise<SetAliasResponse> {
        this.overlay.setSub('Esperando modal…')
        await DomUtils.delay(400)

        const modal =
            DomUtils.query('.newmodal') ||
            DomUtils.query('.modal') ||
            DomUtils.query("[class*='Modal']") ||
            document

        const input = this.findInput(modal)
        if (!input) {
            return this.handleError(
                'No encontré el campo de texto.',
                'No se encontró input en el modal. Intenta manualmente.',
                'No se encontró input.'
            )
        }

        input.focus()
        input.value = alias
        DomUtils.dispatchInputEvents(input)

        const saveBtn = this.findSaveButton(modal)
        if (!saveBtn) {
            return this.handleError(
                'No encontré el botón de guardar.',
                "No se encontró el botón 'Save/Guardar'. Intenta manualmente.",
                'No se encontró botón guardar.'
            )
        }

        await DomUtils.clickElement(saveBtn)

        this.overlay.setSub('Hecho (si Steam lo aceptó).')
        this.overlay.appendLog('Acción enviada. Si no se actualizó, revisa el overlay y hazlo manualmente.')

        return { ok: true }
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
