import type { IProgressReporter } from '../domain/services'
import type { UpdateProgress } from '../domain/models'

export class ChromeRuntimeProgressReporter implements IProgressReporter {
    report(progress: UpdateProgress): void {
        const message = {
            type: 'UPDATE_PROGRESS',
            progress,
        }

        chrome.runtime.sendMessage(message).catch(() => { })
    }
}
