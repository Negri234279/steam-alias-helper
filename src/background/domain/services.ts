import type { SetAliasResult, UpdateProgress } from './models'

export interface IProgressReporter {
    report(progress: UpdateProgress): void
}

export interface ITabManager {
    ensureTab(): Promise<number>
    updateTabUrl(tabId: number, url: string): Promise<void>
    waitForTabComplete(tabId: number, timeoutMs?: number): Promise<boolean>
    closeTab(tabId: number): Promise<void>
}

export interface IAliasUpdater {
    setAlias(tabId: number, steamId: string, alias: string, runId: string, timeoutMs?: number): Promise<SetAliasResult>
}

export interface IDelayProvider {
    wait(ms: number): Promise<void>
}

export interface IRunIdGenerator {
    generate(): string
}
