import { useReducer } from 'preact/hooks'

import { sanitizeSteamId, validateSteamId } from '../shared/validateSteamId'
import type { ErrorMap, FieldKeys, FieldState } from '../types/form'

interface FormState {
    steamId: FieldState<string>
    alias: FieldState<string>
    submitError: string | null
}

export interface UseFormSteamIdReturn {
    form: FormState
    dispatchFormValues: (action: ActionFormSteam) => void
    setSteamId: (value: string) => void
    setAlias: (value: string) => void
    blurSteamId: () => void
    blurAlias: () => void
    clearForm: () => void
    handleSubmit: (onHandleSubmit: (formValues: { steamId: string, alias: string }) => void) => void
}

type FieldName = FieldKeys<FormState>

export type ActionFormSteam =
    | { type: "SET_FIELD"; field: FieldName; value: string }
    | { type: "BLUR_FIELD"; field: FieldName }
    | { type: "SET_ERRORS"; errors: Partial<Record<FieldName, string | null>> }
    | { type: "RESET" }

export function useFormSteamId(): UseFormSteamIdReturn {
    const [form, dispatchFormValues] = useReducer(steamFormReducer, INITIAL_STATE)

    const setSteamId = (value: string) =>
        dispatchFormValues({ type: "SET_FIELD", field: "steamId", value })

    const setAlias = (value: string) =>
        dispatchFormValues({ type: "SET_FIELD", field: "alias", value })

    const blurSteamId = () => {
        const value = sanitizeSteamId(form.steamId.value)

        dispatchFormValues({ type: "SET_FIELD", field: "steamId", value })
        dispatchFormValues({ type: "BLUR_FIELD", field: "steamId" })
    }

    const blurAlias = () => dispatchFormValues({ type: "BLUR_FIELD", field: "alias" })

    const clearForm = () => dispatchFormValues({ type: "RESET" })

    const handleSubmit = (onHandleSubmit: (v: { steamId: string; alias: string }) => void) => {
        const errors = validateForm(form)

        if (errors.steamId || errors.alias) {
            dispatchFormValues({ type: "SET_ERRORS", errors })
            return
        }

        onHandleSubmit({
            steamId: form.steamId.value.trim(),
            alias: form.alias.value.trim()
        })

        dispatchFormValues({ type: "RESET" })
    }

    return {
        form,
        dispatchFormValues,
        setSteamId,
        setAlias,
        blurSteamId,
        blurAlias,
        clearForm,
        handleSubmit
    }
}

const INITIAL_STATE: FormState = {
    steamId: { value: '', error: null, touched: false },
    alias: { value: '', error: null, touched: false },
    submitError: null
}

function validateAlias(_value: string): string | null {
    return null
}

function validateForm(state: FormState) {
    return {
        steamId: validateSteamId(state.steamId.value),
        alias: validateAlias(state.alias.value)
    }
}

const steamFormReducer = (state: FormState, action: ActionFormSteam): FormState => {
    switch (action.type) {
        case "SET_FIELD": {
            const next = {
                ...state,
                [action.field]: {
                    ...state[action.field],
                    value: action.value,
                    error: null
                },
                submitError: null
            } satisfies FormState

            return next
        }

        case "BLUR_FIELD": {
            const field = action.field
            const value = state[field].value

            const errorMap: ErrorMap<FormState> = {
                steamId: validateSteamId,
                alias: validateAlias,
            }

            const error = errorMap[field](value)

            return {
                ...state,
                [field]: { ...state[field], touched: true, error }
            }
        }

        case "SET_ERRORS":
            return {
                ...state,
                steamId: {
                    ...state.steamId,
                    error: action.errors.steamId ?? state.steamId.error,
                    touched: true
                },
                alias: {
                    ...state.alias,
                    error: action.errors.alias ?? state.alias.error,
                    touched: true
                }
            }

        case "RESET":
            return INITIAL_STATE

        default:
            return state
    }
}
