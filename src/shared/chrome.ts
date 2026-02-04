import type { MsgSteam, ResponseOkSteam, ResponseErrorSteam } from "../background/application/messages"

export async function sendSteamMessage<T extends MsgSteam['type']>(msg: Extract<MsgSteam, { type: T }>): Promise<ResponseOkSteam[T] | ResponseErrorSteam> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(msg, (response) => {
            const err = chrome.runtime.lastError
            if (err) reject(new Error(err.message))
            else resolve(response as ResponseOkSteam[T] | ResponseErrorSteam)
        })
    })
}