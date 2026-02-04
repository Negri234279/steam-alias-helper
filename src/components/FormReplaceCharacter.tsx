import { useState } from 'preact/hooks'

interface FormReplaceCharacterProps {
    onHandleSubmit: (formValues: { oldValue: string; newValue: string }) => void
    onHandleCancel: () => void
}

const FormReplaceCharacter = ({ onHandleSubmit, onHandleCancel }: FormReplaceCharacterProps) => {
    const [oldValue, setOldValue] = useState('')
    const [newValue, setNewValue] = useState('')

    const handleInputChange = (setValue: (value: string) => void) => (ev: Event) => {
        setValue((ev.target as HTMLInputElement).value)
    }

    const onFormSubmit = (ev: Event) => {
        ev.preventDefault()

        onHandleSubmit({ oldValue: oldValue.trim(), newValue })

        setOldValue('')
        setNewValue('')
    }

    const handleCancel = () => {
        setOldValue('')
        setNewValue('')

        onHandleCancel()
    }

    return (
        <form className="addForm" onSubmit={onFormSubmit}>
            <div className="field">
                <label htmlFor="oldValueInput">Carácter/Símbolo Actual</label>
                <input
                    id="oldValueInput"
                    type="text"
                    autoComplete="off"
                    placeholder="`` (vacío = añadir al inicio)"
                    value={oldValue}
                    onChange={handleInputChange(setOldValue)}
                />
            </div>

            <div className="field">
                <label htmlFor="newValueInput">Nuevo Carácter/Símbolo</label>
                <input
                    id="newValueInput"
                    type="text"
                    autoComplete="off"
                    placeholder="-- (vacío = eliminar)"
                    value={newValue}
                    onChange={handleInputChange(setNewValue)}
                />
            </div>

            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
                💡 Si el campo actual está vacío, se añade al inicio. Si el nuevo está vacío, se elimina.
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    className="btn primary"
                    style={{ width: '100%' }}
                    type="submit"
                >
                    Aplicar
                </button>
                <button
                    className="btn danger"
                    style={{ width: '100%' }}
                    type="button"
                    onClick={handleCancel}
                >
                    Cancelar
                </button>
            </div>
        </form>
    )
}

export default FormReplaceCharacter
