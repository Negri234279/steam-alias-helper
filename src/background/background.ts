import type { MsgSteam, ResponseSteam } from './application/messages'
import { MessageHandler } from './application/MessageHandler'
import { BulkAliasUpdateService } from './application/BulkAliasUpdateService'
import { ChromeStorageAliasRepository } from './infrastructure/ChromeStorageAliasRepository'
import { ChromeTabManager } from './infrastructure/ChromeTabManager'
import { ChromeAliasUpdater } from './infrastructure/ChromeAliasUpdater'
import { ChromeRuntimeProgressReporter } from './infrastructure/ChromeRuntimeProgressReporter'
import { DelayProvider, RunIdGenerator } from './infrastructure/utilities'

export type { MsgSteam, ResponseSteam } from './application/messages'

function setupDependencies() {
    const aliasRepository = new ChromeStorageAliasRepository()
    const tabManager = new ChromeTabManager()
    const aliasUpdater = new ChromeAliasUpdater()
    const progressReporter = new ChromeRuntimeProgressReporter()
    const delayProvider = new DelayProvider()
    const runIdGenerator = new RunIdGenerator()

    const bulkUpdateService = new BulkAliasUpdateService(
        tabManager,
        aliasUpdater,
        progressReporter,
        delayProvider,
        runIdGenerator
    )

    const messageHandler = new MessageHandler(aliasRepository, bulkUpdateService)

    return { messageHandler }
}

const { messageHandler } = setupDependencies()

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'LOG') {
        console.log(`[${msg.from}]`, msg.payload)
    }
})

chrome.runtime.onMessage.addListener((msg: MsgSteam, _sender, sendResponse: (response: ResponseSteam) => void) => {
    messageHandler
        .handle(msg)
        .then((res) => sendResponse(res))
        .catch((error) => {
            const msg = error instanceof Error ? error.message : String(error)
            sendResponse({ ok: false, error: msg })
        })

    return true
})
