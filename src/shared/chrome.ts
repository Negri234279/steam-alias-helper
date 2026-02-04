import type { MsgSteam, ResponseSteam } from "../background/background"

export async function sendSteamMessage<M extends MsgSteam>(
    msg: M
): Promise<ResponseSteam> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(msg, (response) => {
            const err = chrome.runtime.lastError
            if (err) reject(new Error(err.message))
            else resolve(response as ResponseSteam)
        })
    })
}