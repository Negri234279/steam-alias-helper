export function sanitizeSteamId(input: string): string {
    const trimmed = input.trim()

    const directMatch = trimmed.match(/^7656119\d{10}$/)
    if (directMatch) return directMatch[0]

    const urlMatch = trimmed.match(/steamcommunity\.com\/profiles\/(7656119\d{10})/)
    if (urlMatch) return urlMatch[1]

    return trimmed
}

export function validateSteamId(rawValue: string): string | null {
    const steamId = sanitizeSteamId(rawValue)
    if (!steamId) {
        return "El SteamID64 es requerido"
    }

    const steamIdRegex = /^7656119\d{10}$/
    if (!steamIdRegex.test(steamId)) {
        return "SteamID64 inválido o URL no válida"
    }

    return null
}