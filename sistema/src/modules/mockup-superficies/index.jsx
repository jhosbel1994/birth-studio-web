import { useEffect, useRef, useState } from 'react'
import {
  ImagePlus, LayoutGrid, Ruler, PenTool, Sparkles, SunMedium, Settings2, FilePlus2,
} from 'lucide-react'
import useSceneStore from './hooks/useSceneStore'
import { subscribeEscenas, deleteEscena, deleteEscenaFoto } from './utils/firestore'
import SceneCanvas from './components/SceneCanvas'
import ZoneEditor from './components/ZoneEditor'
import DesignLayer from './components/DesignLayer'

const HERRAMIENTAS = [
  { key: 'escena', label: 'Escena', icon: ImagePlus, disponibleSiempre: true },
  { key: 'zonas', label: 'Zonas', icon: LayoutGrid, requiere: 'foto' },
  { key: 'diseno', label: 'Diseño', icon: PenTool, requiere: 'zona' },
  { key: 'escala', label: 'Escala', icon: Ruler, disponible: false },
  { key: 'acabado', label: 'Acabado', icon: Sparkles, disponible: false },
  { key: 'luz', label: 'Luz', icon: SunMedium, disponible: false },
  { key: 'ajustes', label: 'Ajustes', icon: Settings2, disponible: false },
]

export default function MockupVitrina() {
  const fileInputRef = useRef(null)
  const [escenas, setEscenas] = useState([])
  const [herramienta, setHerramienta] = useState('escena')
  const [zonaActivaId, setZonaActivaId] = useState(null)
  const [capaActivaId, setCapaActivaId] = useState(null)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [errorListado, setErrorListado] = useState(null)
  const {
    escena, cargandoFoto, guardando, error,
    subirFoto, setNombre, setEsPlantilla, guardar, cargarEscena, cargarComoPlantilla, nuevaEscena,
    addZona, updateZonaPunto, setZonaNombre, removeZona,
    addCapa, updateCapaPunto, ajustarCapaAZona, removeCapa,
  } = useSceneStore()

  useEffect(() => {
    const unsub = subscribeEscenas(
      (docs) => {
        setEscenas(docs)
        setErrorListado(null)
      },
      setErrorListado,
    )
    return unsub
  }, [])

  const tieneFoto = !!escena.fotoUrl
  const tieneZona = escena.zonas.length > 0

  const disponible = (h) => {
    if (h.disponibleSiempre) return true
    if (h.requiere === 'foto') return tieneFoto
    if (h.requiere === 'zona') return tieneZona
    return !!h.disponible
  }

  const irA = (key) => {
    const h = HERRAMIENTAS.find(x => x.key === key)
    if (h && disponible(h)) setHerramienta(key)
  }

  const handleGuardar = async () => {
    const ok = await guardar()
    if (ok) {
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 2400)
    }
  }

  const handleNueva = () => {
    nuevaEscena()
    setZonaActivaId(null)
    setCapaActivaId(null)
    setHerramienta('escena')
  }

  const handleCargar = (doc) => {
    cargarEscena(doc)
    setZonaActivaId(null)
    setCapaActivaId(null)
    setHerramienta('escena')
  }

  const handleUsarPlantilla = (doc) => {
    cargarComoPlantilla(doc)
    setZonaActivaId(null)
    setCapaActivaId(null)
    setHerramienta('zonas')
  }

  const handleEliminar = async (e, doc) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar la escena "${doc.nombre}"?`)) return
    setErrorListado(null)
    try {
      await deleteEscenaFoto(doc.storagePath)
      await deleteEscena(doc.id)
      if (escena.id === doc.id) handleNueva()
    } catch (err) {
      setErrorListado(err?.message || 'No se pudo eliminar la escena. Revisa tu sesión de Firebase.')
    }
  }

  const handleAddZona = (tipo) => {
    const id = addZona(tipo)
    setZonaActivaId(id)
  }

  const handleAddCapa = async (zonaId, file) => {
    const id = await addCapa(zonaId, file)
    return id
  }

  const plantillas = escenas.filter(e => e.esPlantilla)
  const misEscenas = escenas.filter(e => !e.esPlantilla)

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-on-surface tracking-wide">MOCKUP VITRINA</h1>
          <p className="text-on-surface-variant text-xs md:text-sm font-dm mt-1">
            Simula gráfica sobre fotos reales de vidrio y pared
          </p>
        </div>
        <div className="flex items-center gap-2">
          {guardadoOk && <span className="text-xs font-dm text-secondary hidden sm:inline">Guardado.</span>}
          <button onClick={handleGuardar} disabled={guardando}
            className="bg-primary text-on-primary rounded-full px-4 py-2.5 text-sm font-dm font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar escena'}
          </button>
          <button onClick={handleNueva}
            className="flex items-center gap-2 bg-white/50 border border-white/60 text-on-surface-variant px-3 md:px-5 py-2.5 rounded-full text-sm font-dm font-medium hover:bg-white/80 transition-colors">
            <FilePlus2 size={16} /> <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      {(error || errorListado) && <p className="text-sm font-dm text-primary mb-3">{error || errorListado}</p>}

      <div className="flex gap-3 md:gap-5">
        {/* Toolbar vertical */}
        <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1 h-fit">
          {HERRAMIENTAS.map((h) => {
            const ok = disponible(h)
            return (
              <button
                key={h.key}
                disabled={!ok}
                onClick={() => irA(h.key)}
                title={ok ? h.label : `${h.label} — completa el paso anterior`}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-[11px] font-dm transition-colors ${
                  herramienta === h.key
                    ? 'bg-secondary-container/80 text-on-secondary-container font-semibold'
                    : ok
                    ? 'text-on-surface-variant hover:bg-white/50'
                    : 'text-on-surface-variant/30 cursor-not-allowed'
                }`}
              >
                <h.icon size={18} strokeWidth={1.75} />
                {h.label}
              </button>
            )
          })}
        </div>

        {/* Canvas */}
        <div className="glass-panel rounded-2xl flex-1 min-h-[480px]">
          <SceneCanvas
            fotoUrl={escena.fotoUrl} fotoW={escena.fotoW} fotoH={escena.fotoH}
            zonas={escena.zonas} capas={escena.capas}
            herramienta={herramienta} zonaActivaId={zonaActivaId} capaActivaId={capaActivaId}
            onZonaPuntoChange={updateZonaPunto}
            onCapaPuntoChange={updateCapaPunto}
          />
        </div>

        {/* Panel derecho — cambia según la herramienta activa */}
        <div className="glass-panel rounded-2xl p-4 w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
          {herramienta === 'escena' && (
            <>
              <div>
                <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Foto de la escena</label>
                <input
                  ref={fileInputRef} type="file" accept="image/*" className="hidden"
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
                  type="text" value={escena.nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Vitrina Panas Burguer — 4 paneles"
                  className="mt-2 w-full border border-white/60 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50 focus:bg-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-dm text-on-surface-variant cursor-pointer">
                <input type="checkbox" checked={escena.esPlantilla} onChange={e => setEsPlantilla(e.target.checked)} />
                Guardar como plantilla reutilizable
              </label>

              <div className="border-t border-white/50 pt-3 flex-1 min-h-0 flex flex-col gap-3">
                {plantillas.length > 0 && (
                  <div>
                    <p className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
                      Plantillas ({plantillas.length})
                    </p>
                    <div className="space-y-2">
                      {plantillas.map(doc => (
                        <button key={doc.id} onClick={() => handleUsarPlantilla(doc)}
                          className="w-full flex items-center gap-2 rounded-xl p-2 text-left hover:bg-white/50 transition-colors">
                          <img src={doc.fotoUrl} alt={doc.nombre} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          <span className="flex-1 min-w-0 text-xs font-dm font-medium text-on-surface truncate">{doc.nombre}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                  Mis escenas ({misEscenas.length})
                </p>
                <div className="space-y-2 overflow-y-auto">
                  {misEscenas.length === 0 && (
                    <p className="text-xs font-dm text-on-surface-variant/60">Aún no hay escenas guardadas.</p>
                  )}
                  {misEscenas.map(doc => (
                    <button key={doc.id} onClick={() => handleCargar(doc)}
                      className={`w-full flex items-center gap-2 rounded-xl p-2 text-left transition-colors ${
                        escena.id === doc.id ? 'bg-secondary-container/60' : 'hover:bg-white/50'
                      }`}>
                      <img src={doc.fotoUrl} alt={doc.nombre} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <span className="flex-1 min-w-0 text-xs font-dm font-medium text-on-surface truncate">{doc.nombre}</span>
                      <span role="button" tabIndex={0} onClick={e => handleEliminar(e, doc)}
                        className="text-[10px] font-dm text-primary/70 hover:text-primary px-1">
                        Borrar
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {herramienta === 'zonas' && (
            <ZoneEditor
              zonas={escena.zonas} zonaActivaId={zonaActivaId}
              onSelectZona={setZonaActivaId} onAddZona={handleAddZona}
              onSetNombre={setZonaNombre}
              onRemoveZona={(id) => { removeZona(id); if (zonaActivaId === id) setZonaActivaId(null) }}
            />
          )}

          {herramienta === 'diseno' && (
            <DesignLayer
              zonas={escena.zonas} capas={escena.capas} capaActivaId={capaActivaId}
              onSelectCapa={setCapaActivaId} onAddCapa={handleAddCapa}
              onAjustarAZona={ajustarCapaAZona}
              onRemoveCapa={(id) => { removeCapa(id); if (capaActivaId === id) setCapaActivaId(null) }}
            />
          )}

          {['escala', 'acabado', 'luz', 'ajustes'].includes(herramienta) && (
            <p className="text-xs font-dm text-on-surface-variant/60">Próximamente.</p>
          )}
        </div>
      </div>
    </div>
  )
}
