import { useEffect, useState } from 'preact/hooks'

interface OverlayContentProps {
    onClose: () => void
    onRetry: () => void
}

export function OverlayContent({ onClose, onRetry }: OverlayContentProps) {
    const [subtitle, setSubtitle] = useState('Listo.')
    const [target, setTarget] = useState('Sin tarea activa')
    const [log, setLog] = useState('Log:\n')

    useEffect(() => {
        ;(window as any).__overlayUI = {
            setSub: setSubtitle,
            setTarget,
            appendLog: (text: string) => {
                setLog((prev) => prev + (text.endsWith('\n') ? text : text + '\n'))
            },
        }

        return () => {
            delete (window as any).__overlayUI
        }
    }, [])

    const handleHelp = () => {
        setLog(
            (prev) =>
                prev +
                "Ayuda:\n1) Pulsa 'More/Más' en el perfil.\n2) Elige 'Set Nickname/Establecer apodo'.\n3) Escribe el alias y guarda.\n"
        )
    }

    return (
        <div class="wrap">
            <style>{styles}</style>
            <div class="card">
                <div class="row">
                    <div>
                        <div class="title">Steam Alias Helper</div>
                        <div class="muted">{subtitle}</div>
                    </div>
                    <button class="btn danger" onClick={onClose}>
                        Cerrar
                    </button>
                </div>

                <div class="hr" />

                <div>
                    <div class="pill">{target}</div>
                    <div class="small">
                        Si la automatización falla, usa el menú de Steam: "More/Más" → "Set
                        Nickname/Establecer apodo" → Guardar.
                    </div>
                </div>

                <div class="row" style={{ marginTop: '8px' }}>
                    <button class="btn" onClick={onRetry}>
                        Reintentar aquí
                    </button>
                    <button class="btn primary" onClick={handleHelp}>
                        ¿Dónde está?
                    </button>
                </div>

                <div class="log">{log}</div>
            </div>
        </div>
    )
}

const styles = `
    :host { all: initial; }
    .wrap{
      position: fixed;
      right: 14px;
      bottom: 14px;
      width: 320px;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: #e6edf3;
    }
    .card{
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 14px;
      background: rgba(15,17,21,0.92);
      box-shadow: 0 18px 50px rgba(0,0,0,0.45);
      padding: 10px;
      backdrop-filter: blur(10px);
    }
    .row{ display:flex; align-items:center; justify-content:space-between; gap: 8px; }
    .title{ font-weight: 800; font-size: 13px; }
    .muted{ color: rgba(230,237,243,0.72); font-size: 12px; margin-top: 4px; }
    .hr{ height:1px; background: rgba(255,255,255,0.10); margin: 8px 0; }
    .btn{
      height: 30px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(11,14,20,0.85);
      color: #e6edf3;
      padding: 0 10px;
      cursor: pointer;
      user-select:none;
      font-size: 12px;
    }
    .btn:hover{ border-color: rgba(255,255,255,0.25); }
    .btn.primary{
      border-color: rgba(59,130,246,0.55);
      background: rgba(59,130,246,0.16);
    }
    .btn.danger{
      border-color: rgba(239,68,68,0.55);
      background: rgba(239,68,68,0.16);
    }
    .pill{
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      color: rgba(230,237,243,0.75);
      background: rgba(11,14,20,0.7);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .log{
      margin-top: 8px;
      font-size: 12px;
      color: rgba(230,237,243,0.80);
      line-height: 1.3;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 140px;
      overflow: auto;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(11,14,20,0.60);
      padding: 8px;
    }
    .small{ font-size: 11px; color: rgba(230,237,243,0.65); margin-top: 6px; }
`
