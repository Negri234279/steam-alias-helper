import { h, render } from 'preact'
import { OverlayContent } from '../components/OverlayContent'

const OVERLAY_ID = 'sah_overlay_v1'

export class OverlayUI {
    private root: HTMLElement | null = null
    private onRetryCallback: (() => void) | null = null

    ensure(): void {
        if (this.root && document.contains(this.root)) return

        this.root = this.createOverlay()
        document.documentElement.appendChild(this.root)
    }

    remove(): void {
        if (this.root?.shadowRoot) {
            render(null, this.root.shadowRoot)
        }
        this.root?.remove()
        this.root = null
    }

    setSub(text: string): void {
        ;(window as any).__overlayUI?.setSub(text)
    }

    setTarget(text: string): void {
        ;(window as any).__overlayUI?.setTarget(text)
    }

    appendLog(text: string): void {
        ;(window as any).__overlayUI?.appendLog(text)
    }

    setOnRetry(callback: () => void): void {
        this.onRetryCallback = callback
    }

    private createOverlay(): HTMLElement {
        const root = document.createElement('div')
        root.id = OVERLAY_ID

        const shadow = root.attachShadow({ mode: 'open' })

        render(
            h(OverlayContent, {
                onClose: () => this.remove(),
                onRetry: () => this.onRetryCallback?.(),
            }),
            shadow
        )

        return root
    }
}
