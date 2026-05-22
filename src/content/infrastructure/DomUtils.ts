export class DomUtils {
    static query<T extends Element = Element>(
        selector: string,
        root: Document | Element | HTMLElement = document
    ): T | null {
        return root.querySelector(selector) as T | null
    }

    static queryAll<T extends Element = Element>(
        selector: string,
        root: Document | Element | HTMLElement = document
    ): T[] {
        return Array.from(root.querySelectorAll(selector)) as T[]
    }

    static createElement<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        attrs: Record<string, any> = {},
        children: (HTMLElement | string)[] = []
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag)

        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'style') {
                Object.assign(el.style, value)
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2), value)
            } else if (value === false || value == null) {
                continue
            } else {
                el.setAttribute(key, String(value))
            }
        }

        for (const child of children) {
            el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
        }

        return el
    }

    static findClickableByText(
        regex: RegExp,
        root: Document | HTMLElement = document
    ): HTMLElement | null {
        const candidates = [
            ...this.queryAll<HTMLElement>('a', root),
            ...this.queryAll<HTMLElement>('button', root),
            ...this.queryAll<HTMLElement>("[role='button']", root),
            ...this.queryAll<HTMLElement>('.btn_profile_action', root),
        ]

        for (const el of candidates) {
            const text = (el.textContent || '').trim()
            if (text && regex.test(text)) {
                return el
            }
        }

        return null
    }

    static dispatchInputEvents(el: HTMLInputElement | HTMLTextAreaElement): void {
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
    }

    static async clickElement(el: HTMLElement): Promise<boolean> {
        if (!el) return false

        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        el.click()

        return true
    }

    /**
     * Sondea el DOM hasta que `finder` devuelve un elemento o se agota el tiempo.
     * Sustituye a los `delay()` fijos: es más rápido cuando el DOM ya está listo
     * y más robusto cuando Steam tarda en renderizar.
     */
    static async waitFor<T extends Element = HTMLElement>(
        finder: () => T | null,
        options: { timeout?: number; interval?: number } = {}
    ): Promise<T | null> {
        const { timeout = 3000, interval = 50 } = options
        const started = Date.now()

        let el = finder()
        while (!el && Date.now() - started < timeout) {
            await this.delay(interval)
            el = finder()
        }

        return el
    }

    static async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
