import { useEffect, useRef, useState } from 'react'
import {
  ImagePlus, LayoutGrid, Ruler, PenTool, Sparkles, SunMedium, Settings2, FilePlus2,
} from 'lucide-react'
import useSceneStore from './hooks/useSceneStore'
import { subscribeEscenas, deleteEscena, deleteEscenaFoto } from './utils/firestore'
import SceneCanvas from './components/SceneCanvas'

// Herramientas verticales del modulo (spec seccion 5). Solo "Escena" esta
// activa en el Paso 1 — el resto son los pasos siguientes del plan, se ven
// pero no hacen nada todavia (evita prometer funcionalidad que no existe).
const HERRAMIENTAS = [
  { key: 'escena', label: 'Escena', icon: ImagePlus, disponible: true },
  { key: 'zonas', label: 'Zonas', icon: LayoutGrid, disponible: false },
  { key: 'escala', label: 'Escala', icon: Ruler, disponible: false },
  { key: 'diseno', label: 'Diseño', icon: PenTool, disponible: false },
  { key: 'acabado', label: 'Acabado', icon: Sparkles, disponible: false },
  { key: 'luz', label: 'Luz', icon: SunMedium, disponible: false },
  { key: 'ajustes', label: 'Ajustes', icon: Settings2, disponible: false },
]

export default function MockupVitrina() {
  const fileInputRef = useRef(null)
  const [escenas, setEscenas] = useState([])
  const [herramienta, setHerramienta] = useState('escena')
  const [guardadoOk, setGuardadoOk] = useState(false)
  const {
    escena, cargandoFoto, guardando, error,
    subirFoto, setNombre, guardar, cargarEscena, nuevaEscena,
  } = useSceneStore()

  useEffect(() => {
    const unsub = subscribeEscenas(setEscenas)
    return unsub
  }, [])

  const handleGuardar = async () => {
    const ok = await guardar()
    if (ok) {
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 2400)
    }
  }

  const handleEliminar = async (e, doc) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar la escena "${doc.nombre}"?`)) return
    await deleteEscenaFoto(doc.storagePath)
    await deleteEscena(doc.id)
    if (escena.id === doc.id) nuevaEscena()
  }

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-on-surface tracking-wide">MOCKUP VITRINA</h1>
          <p className="text-on-surface-variant text-xs md:text-sm font-dm mt-1">
            Simula gráfica sobre fotos reales de vidrio y pared
          </p>
        </div>
        <button onClick={nuevaEscena}
          className="flex items-center gap-2 bg-white/50 border border-white/60 text-on-surface-variant px-3 md:px-5 py-2.5 rounded-full text-sm font-dm font-medium hover:bg-white/80 transition-colors">
          <FilePlus2 size={16} /> <span className="hidden sm:inline">Nueva</span> escena
        </button>
      </div>

      <div className="flex gap-3 md:gap-5">
        {/* Toolbar vertical */}
        <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1 h-fit">
          {HERRAMIENTAS.map(({ key, label, icon: Icon, disponible }) => (
            <button
              key={key}
              disabled={!disponible}
              onClick={() => disponible && setHerramienta(key)}
              title={disponible ? label : `${label} — próximamente`}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-[11px] font-dm transition-colors ${
                herramienta === key
                  ? 'bg-secondary-container/80 text-on-secondary-container font-semibold'
                  : disponible
                  ? 'text-on-surface-variant hover:bg-white/50'
                  : 'text-on-surface-variant/30 cursor-not-allowed'
              }`}
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="glass-panel rounded-2xl flex-1 min-h-[480px]">
          <SceneCanvas fotoUrl={escena.fotoUrl} fotoW={escena.fotoW} fotoH={escena.fotoH} />
        </div>

        {/* Panel derecho */}
        <div className="glass-panel rounded-2xl p-4 w-72 shrink-0 flex flex-col gap-4">
          <div>
            <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Foto de la escena</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={cargandoFoto}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-white/50 border border-white/60 rounded-full px-4 py-2.5 text-sm font-dm text-on-surface-variant hover:bg-white/80 transition-colors disabled:opacity-50"
            >
              <ImagePlus size={16} />
              {cargandoFoto ? 'Cargando…' : escena.fotoUrl ? 'Cambiar foto' : 'Subir foto'}
            </button>
          </div>

          <div>
            <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Nombre de la escena</label>
            <input
              type="text"
              value={escena.nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Vitrina Panas Burguer — 4 paneles"
              className="mt-2 w-full border border-white/60 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50 focus:bg-white"
            />
          </div>

          {error && <p className="text-xs font-dm text-primary">{error}</p>}
          {guardadoOk && <p className="text-xs font-dm text-secondary">Escena guardada.</p>}

          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full bg-primary text-on-primary rounded-full px-4 py-2.5 text-sm font-dm font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar escena'}
          </button>

          <div className="border-t border-white/50 pt-3 flex-1 min-h-0 flex flex-col">
            <p className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Escenas guardadas ({escenas.length})
            </p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {escenas.length === 0 && (
                <p className="text-xs font-dm text-on-surface-variant/60">Aún no hay escenas guardadas.</p>
              )}
              {escenas.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => cargarEscena(doc)}
                  className={`w-full flex items-center gap-2 rounded-xl p-2 text-left transition-colors ${
                    escena.id === doc.id ? 'bg-secondary-container/60' : 'hover:bg-white/50'
                  }`}
                >
                  <img src={doc.fotoUrl} alt={doc.nombre} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-dm font-medium text-on-surface truncate">{doc.nombre}</span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => handleEliminar(e, doc)}
                    className="text-[10px] font-dm text-primary/70 hover:text-primary px-1"
                  >
                    Borrar
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
