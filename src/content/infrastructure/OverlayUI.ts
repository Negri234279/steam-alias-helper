import { h, render } from 'preact'
import { OverlayContent } from '../components/OverlayContent'

const OVERLAY_ID = 'sah_overlay_v1'

export interface OverlaySink {
    setSub: (text: string) => void
    setTarget: (text: string) => void
    appendLog: (text: string) => void
}

export class OverlayUI {
    private root: HTMLElement | null = null
    private onRetryCallback: (() => void) | null = null
    private sink: OverlaySink | null = null

    // Búfer para mensajes emitidos antes de que el componente Preact monte
    // (su useEffect corre de forma asíncrona después del render).
    private bufferedSub: string | null = null
    private bufferedTarget: string | null = null
    private bufferedLog = ''

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
        this.sink = null
    }

    setSub(text: string): void {
        if (this.sink) {
            this.sink.setSub(text)
        } else {
            this.bufferedSub = text
        }
    }

    setTarget(text: string): void {
        if (this.sink) {
            this.sink.setTarget(text)
        } else {
            this.bufferedTarget = text
        }
    }

    appendLog(text: string): void {
        if (this.sink) {
            this.sink.appendLog(text)
        } else {
            this.bufferedLog += text.endsWith('\n') ? text : text + '\n'
        }
    }

    setOnRetry(callback: () => void): void {
        this.onRetryCallback = callback
    }

    /** Llamado por OverlayContent al montar: conecta el componente y vuelca el búfer. */
    registerSink(sink: OverlaySink): void {
        this.sink = sink

        if (this.bufferedTarget !== null) {
            sink.setTarget(this.bufferedTarget)
            this.bufferedTarget = null
        }
        if (this.bufferedSub !== null) {
            sink.setSub(this.bufferedSub)
            this.bufferedSub = null
        }
        if (this.bufferedLog) {
            sink.appendLog(this.bufferedLog)
            this.bufferedLog = ''
        }
    }

    unregisterSink(): void {
        this.sink = null
    }

    private createOverlay(): HTMLElement {
        const root = document.createElement('div')
        root.id = OVERLAY_ID

        const shadow = root.attachShadow({ mode: 'open' })

        render(
            h(OverlayContent, {
                overlay: this,
                onClose: () => this.remove(),
                onRetry: () => this.onRetryCallback?.(),
            }),
            shadow
        )

        return root
    }
}
