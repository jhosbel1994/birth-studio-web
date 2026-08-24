import { useRef, useState } from 'react'
import { Trash2, Upload, Wand2 } from 'lucide-react'

// Panel lateral del tab "Diseño": subir el adhesivo a una zona, ajustarlo
// automaticamente a los 4 puntos de la zona, o afinarlo a mano arrastrando
// sus propias esquinas en SceneCanvas.
export default function DesignLayer({
  zonas, capas, capaActivaId, onSelectCapa, onAddCapa, onAjustarAZona, onRemoveCapa,
}) {
  const fileInputRef = useRef(null)
  const [zonaDestino, setZonaDestino] = useState(zonas[0]?.id || '')
  const [subiendo, setSubiendo] = useState(false)

  if (zonas.length === 0) {
    return (
      <p className="text-xs font-dm text-on-surface-variant/60">
        Primero marca al menos una zona en la pestaña "Zonas".
      </p>
    )
  }

  const handleFile = async (file) => {
    if (!file || !zonaDestino) return
    setSubiendo(true)
    const id = await onAddCapa(zonaDestino, file)
    setSubiendo(false)
    if (id) onSelectCapa(id)
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Zona destino</label>
        <select
          value={zonaDestino}
          onChange={e => setZonaDestino(e.target.value)}
          className="mt-2 w-full border border-white/60 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50 focus:bg-white"
        >
          {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={subiendo}
        className="w-full flex items-center justify-center gap-2 bg-white/50 border border-white/60 rounded-full px-4 py-2.5 text-sm font-dm text-on-surface-variant hover:bg-white/80 transition-colors disabled:opacity-50"
      >
        <Upload size={16} />
        {subiendo ? 'Subiendo…' : 'Subir adhesivo a la zona'}
      </button>

      {capas.length === 0 && (
        <p className="text-xs font-dm text-on-surface-variant/60">Aún no hay diseños colocados.</p>
      )}

      <div className="space-y-2">
        {capas.map(c => {
          const zona = zonas.find(z => z.id === c.zonaId)
          return (
            <div
              key={c.id}
              onClick={() => onSelectCapa(c.id)}
              className={`rounded-xl p-2.5 cursor-pointer transition-colors flex items-center gap-2 ${
                capaActivaId === c.id ? 'bg-secondary-container/60' : 'hover:bg-white/50 bg-white/30'
              }`}
            >
              <img src={c.imgUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/60 shrink-0" />
              <span className="flex-1 min-w-0 text-xs font-dm text-on-surface truncate">{zona?.nombre || 'Zona eliminada'}</span>
              <button
                onClick={e => { e.stopPropagation(); onAjustarAZona(c.id) }}
                title="Ajustar a zona"
                className="text-on-surface-variant/60 hover:text-secondary shrink-0"
              >
                <Wand2 size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRemoveCapa(c.id) }}
                title="Eliminar"
                className="text-on-surface-variant/50 hover:text-primary shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {capaActivaId && (
        <p className="text-[11px] font-dm text-on-surface-variant/70">
          Arrastra las 4 esquinas verdes sobre la foto para calzar el adhesivo con el ángulo real del vidrio.
        </p>
      )}
    </div>
  )
}
