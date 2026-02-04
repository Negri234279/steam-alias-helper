import { useUpdateProgress } from '../hooks/useUpdateProgress'
import { sendSteamMessage } from '../shared/chrome'
import { useToast } from '../shared/toast'

const UpdateProgressDisplay = () => {
    let { progress, runId } = useUpdateProgress()
    const { error: showError } = useToast()

    if (!progress) return null

    const percentage = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

    const handleCancel = async () => {
        if (!runId) return

        try {
            const resp = await sendSteamMessage({
                type: 'CANCEL_UPDATE',
                payload: { runId },
            })

            if (!resp.ok) {
                showError(`Error al cancelar: ${resp.error || 'desconocido'}`)
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            showError(`Error al cancelar: ${msg}`)
        }
    }

    return (
        <div
            id="progressWrap"
            class="progressWrap"
            style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.08); border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.5);"
        >
            <div
                class="progressRow"
                style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"
            >
                <div
                    id="progressText"
                    class="progressText"
                    style="font-weight: bold; color: #93c5fd;"
                >
                    {progress.done}/{progress.total} ({percentage}%)
                </div>
                {!progress.finished && runId && (
                    <button
                        id="cancelBtn"
                        class="btn danger small"
                        type="button"
                        onClick={handleCancel}
                        style="padding: 4px 8px; font-size: 0.85em;"
                    >
                        Cancelar
                    </button>
                )}
            </div>
            <div
                class="progressBar"
                style="width: 100%; height: 8px; background: rgba(59, 130, 246, 0.2); border-radius: 4px; overflow: hidden;"
            >
                <div
                    id="progressFill"
                    class="progressFill"
                    style={`width: ${percentage}%; height: 100%; background: #3b82f6; transition: width 0.3s ease;`}
                />
            </div>
            <div
                id="progressDetail"
                class="progressDetail"
                style="margin-top: 8px; font-size: 0.85em; color: #93c5fd;"
            >
                {progress.statusLine}
            </div>
        </div>
    )
}

export default UpdateProgressDisplay
