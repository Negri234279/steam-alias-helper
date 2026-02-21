export async function resolveVanityUrl(vanityUrl: string): Promise<string | null> {
    try {
        // Primero intentar con el HTML de Steam directamente
        const steamId = await resolveFromSteamProfile(vanityUrl)
        if (steamId) return steamId

        // Si falla, intentar con un servicio público
        return await resolveFromSteamIdIO(vanityUrl)
    } catch (error) {
        console.error('Error resolviendo vanity URL:', error)
        return null
    }
}

async function resolveFromSteamProfile(vanityUrl: string): Promise<string | null> {
    try {
        const url = `https://steamcommunity.com/id/${vanityUrl}`
        const response = await fetch(url)
        
        if (!response.ok) return null

        const html = await response.text()
        
        const dataSteamIdMatch = html.match(/data-steamid="(7656119\d{10})"/)
        if (dataSteamIdMatch) return dataSteamIdMatch[1]

        const ogUrlMatch = html.match(/og:url" content="https:\/\/steamcommunity\.com\/profiles\/(7656119\d{10})"/)
        if (ogUrlMatch) return ogUrlMatch[1]

        const scriptMatch = html.match(/"steamid":"(7656119\d{10})"/)
        if (scriptMatch) return scriptMatch[1]

        const profileLinkMatch = html.match(/steamcommunity\.com\/profiles\/(7656119\d{10})/)
        if (profileLinkMatch) return profileLinkMatch[1]

        return null
    } catch (error) {
        console.error('Error en resolveFromSteamProfile:', error)
        return null
    }
}

async function resolveFromSteamIdIO(vanityUrl: string): Promise<string | null> {
    try {
        const url = `https://steamid.io/lookup/${encodeURIComponent(vanityUrl)}`
        const response = await fetch(url)
        
        if (!response.ok) return null

        const html = await response.text()
        
        const match = html.match(/7656119\d{10}/)
        return match ? match[0] : null
    } catch (error) {
        console.error('Error en resolveFromSteamIdIO:', error)
        return null
    }
}

export function extractVanityUrl(input: string): string | null {
    const trimmed = input.trim()
    
    const urlMatch = trimmed.match(/steamcommunity\.com\/id\/([^\/\s?]+)/)
    if (urlMatch) return urlMatch[1]
    
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return trimmed
    }
    
    return null
}
