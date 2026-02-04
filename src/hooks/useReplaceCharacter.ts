import { useCallback, useState } from 'preact/hooks'

import type { Alias } from '../types/alias'

interface UseReplaceCharacterParams {
    aliases: Alias[]
    selectedSteamIds: Set<string>
    upsertAll: (payload: Alias[]) => Promise<void>
    onSuccess?: () => void
}

export function useReplaceCharacter({
    aliases,
    selectedSteamIds,
    upsertAll,
    onSuccess,
}: UseReplaceCharacterParams) {
    const [showForm, setShowForm] = useState(false)

    const replaceCharacter = useCallback(
        async (formValues: { oldValue: string; newValue: string }) => {
            const updatedAliases = aliases.map((item) => {
                if (selectedSteamIds.has(item.steamId)) {
                    const alias = !formValues.oldValue
                        ? formValues.newValue + item.alias
                        : item.alias.replaceAll(formValues.oldValue, formValues.newValue)

                    return {
                        ...item,
                        alias,
                    }
                }
                return item
            })

            await upsertAll(updatedAliases)

            setShowForm(false)
            onSuccess?.()
        },
        [aliases, selectedSteamIds, upsertAll, onSuccess],
    )

    const openForm = useCallback(() => setShowForm(true), [])
    const closeForm = useCallback(() => setShowForm(false), [])

    return {
        showForm,
        replaceCharacter,
        openForm,
        closeForm,
    }
}
