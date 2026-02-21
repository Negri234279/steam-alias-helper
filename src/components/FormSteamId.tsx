import type { UseFormSteamIdReturn } from '../hooks/useFormSteamId'

interface FormSteamIdProps {
    useFormSteamId: UseFormSteamIdReturn
    onHandleSubmit: (formValues: { steamId: string; alias: string }) => void
    onHandleCancel: () => void
}

const FormSteamId = ({ useFormSteamId, onHandleSubmit, onHandleCancel }: FormSteamIdProps) => {
    const { form, setSteamId, setAlias, blurSteamId, blurAlias, clearForm, handleSubmit } =
        useFormSteamId

    const handleInputChange = (setValue: (value: string) => void) => (ev: Event) => {
        setValue((ev.target as HTMLInputElement).value)
    }

    const onFormSubmit = (ev: Event) => {
        ev.preventDefault()

        handleSubmit(onHandleSubmit)

        clearForm()
    }

    const handleCancel = () => {
        clearForm()
        onHandleCancel()
    }

    return (
        <form className="addForm" onSubmit={onFormSubmit}>
            <div className="field">
                <label htmlFor="steamIdInput">SteamID64 o Vanity URL</label>
                <input
                    id="steamIdInput"
                    type="text"
                    autoComplete="off"
                    placeholder="76561198327583600 o Noname"
                    value={form.steamId.value}
                    onChange={handleInputChange(setSteamId)}
                    onBlur={blurSteamId}
                    aria-invalid={!!form.steamId.error}
                    aria-describedby={form.steamId.error ? 'steamIdError' : undefined}
                    disabled={form.steamId.resolving}
                />

                {form.steamId.resolving && (
                    <div style={{ color: '#4a9eff', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                        Resolviendo vanity URL...
                    </div>
                )}

                {form.steamId.touched && form.steamId.error && (
                    <div id="steamIdError" className="error">
                        {form.steamId.error}
                    </div>
                )}
            </div>

            <div className="field">
                <label htmlFor="aliasInput">Alias</label>
                <input
                    id="aliasInput"
                    type="text"
                    autoComplete="off"
                    placeholder="Noname"
                    value={form.alias.value}
                    onChange={handleInputChange(setAlias)}
                    onBlur={blurAlias}
                />
                {form.alias.touched && form.alias.error && (
                    <div className="error">{form.alias.error}</div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                    className="btn primary" 
                    style={{ width: '100%' }} 
                    type="submit"
                    disabled={form.steamId.resolving}
                >
                    Añadir
                </button>
                <button
                    className="btn danger"
                    style={{ width: '100%' }}
                    type="button"
                    onClick={handleCancel}
                    disabled={form.steamId.resolving}
                >
                    Cancelar
                </button>
            </div>
        </form>
    )
}

export default FormSteamId
