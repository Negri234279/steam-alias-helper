import './ToastContainer.css'
import { useToast } from './ToastContext'

export function ToastContainer() {
    const { toasts, dismiss } = useToast()

    return (
        <div class="toastContainer">
            {toasts.map((t) => (
                <div key={t.id} class={`toast ${t.type}`}>
                    <span>{t.message}</span>
                    <button type="button" onClick={() => dismiss(t.id)} aria-label="Cerrar">
                        &times;
                    </button>
                </div>
            ))}
        </div>
    )
}
