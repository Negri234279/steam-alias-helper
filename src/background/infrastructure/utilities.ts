import type { IDelayProvider, IRunIdGenerator } from '../domain/services'

export class DelayProvider implements IDelayProvider {
    wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}

export class RunIdGenerator implements IRunIdGenerator {
    generate(): string {
        return `${Date.now()}_${Math.random().toString(16).slice(2)}`
    }
}
