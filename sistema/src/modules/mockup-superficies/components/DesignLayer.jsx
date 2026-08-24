import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Upload, Wand2 } from 'lucide-react'

const ACABADOS = [
  { value: 'impreso-opaco', label: 'Vinil impreso' },
  { value: 'microperforado', label: 'Microperforado' },
  { value: 'empavonado-troquelado', label: 'Empavonado troquelado' },
  { value: 'empavonado-sin-diseno', label: 'Empavonado sin diseño' },
  { value: 'vinil-corte', label: 'Vinil de corte' },
]

// Panel lateral del tab "Diseño": subir el adhesivo a una zona, ajustarlo
// automaticamente a los 4 puntos de la zona, o afinarlo a mano arrastrando
// sus propias esquinas en SceneCanvas.
export default function DesignLayer({
  zonas, capas, capaActivaId, onSelectCapa, onAddCapa, onAddCapaMaterial,
  onAjustarAZona, onUpdateCapaProps, onRemoveCapa,
}) {
  const fileInputRef = useRef(null)
  const [zonaDestino, setZonaDestino] = useState(zonas[0]?.id || '')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!zonas.some(z => z.id === zonaDestino)) setZonaDestino(zonas[0]?.id || '')
  }, [zonas, zonaDestino])

  if (zonas.length === 0) {
    return (
      <p className="text-xs font-dm text-on-surface-variant/60">
        Primero marca al menos una zona en la pestaña "Zonas".
      </p>
    )
  }

  const handleFile = async (file) => {
    if (!file || !zonaDestino) return
    setCargando(true)
    try {
      const id = await onAddCapa(zonaDestino, file)
      if (id) onSelectCapa(id)
    } finally {
      setCargando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const capaActiva = capas.find(c => c.id === capaActivaId)

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
        disabled={cargando}
        className="w-full flex items-center justify-center gap-2 bg-white/50 border border-white/60 rounded-full px-4 py-2.5 text-sm font-dm text-on-surface-variant hover:bg-white/80 transition-colors disabled:opacity-50"
      >
        <Upload size={16} />
        {cargando ? 'Cargando…' : 'Subir adhesivo a la zona'}
      </button>

      <button
        onClick={() => {
          const id = onAddCapaMaterial(zonaDestino, 'empavonado-sin-diseno')
          if (id) onSelectCapa(id)
        }}
        className="w-full flex items-center justify-center gap-2 bg-white/40 border border-white/60 rounded-full px-4 py-2.5 text-sm font-dm text-on-surface-variant hover:bg-white/80 transition-colors"
      >
        <Plus size={15} />
        Empavonado sin diseño
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
              {c.imgUrl ? (
                <img src={c.imgUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/60 shrink-0" />
              ) : (
                <span className="w-10 h-10 rounded-lg shrink-0 border border-white/70 bg-white/60 backdrop-blur flex items-center justify-center text-[10px] font-dm text-secondary">
                  Frost
                </span>
              )}
              <span className="flex-1 min-w-0 text-xs font-dm text-on-surface truncate">{zona?.nombre || 'Zona eliminada'}</span>
              <span className="text-[10px] font-dm text-on-surface-variant/60 truncate max-w-[70px]">
                {ACABADOS.find(a => a.value === c.acabado)?.label || 'Vinil'}
              </span>
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

      {capaActiva && (
        <div className="space-y-3 rounded-xl bg-white/30 p-3">
          <div>
            <label className="text-[10px] font-dm font-semibold uppercase tracking-wide text-on-surface-variant">Acabado</label>
            <select
              value={capaActiva.acabado || 'impreso-opaco'}
              onChange={e => onUpdateCapaProps(capaActiva.id, { acabado: e.target.value })}
              className="mt-1 w-full border border-white/60 rounded-full px-3 py-2 text-xs font-dm focus:outline-none focus:border-primary bg-white/50"
            >
              {ACABADOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-dm font-semibold uppercase tracking-wide text-on-surface-variant">
              <span>Opacidad</span>
              <span>{Math.round((capaActiva.opacidad ?? 0.88) * 100)}%</span>
            </div>
            <input
              type="range" min="0.1" max="1" step="0.01"
              value={capaActiva.opacidad ?? 0.88}
              onChange={e => onUpdateCapaProps(capaActiva.id, { opacidad: Number(e.target.value) })}
              className="w-full accent-secondary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-dm font-semibold uppercase tracking-wide text-on-surface-variant">
              <span>Textura</span>
              <span>{Math.round((capaActiva.textura ?? 0.5) * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={capaActiva.textura ?? 0.5}
              onChange={e => onUpdateCapaProps(capaActiva.id, { textura: Number(e.target.value) })}
              className="w-full accent-secondary"
            />
          </div>

          <p className="text-[11px] font-dm text-on-surface-variant/70">
            Arrastra las 4 esquinas verdes sobre la foto para calzar el adhesivo con el ángulo real del vidrio.
          </p>
        </div>
      )}
    </div>
  )
}
