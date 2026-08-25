import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ImagePlus, LayoutGrid, Ruler, PenTool, Sparkles, SunMedium, Settings2, FilePlus2,
  Send,
} from 'lucide-react'
import useSceneStore from './hooks/useSceneStore'
import { listarEscenasLocal, borrarEscenaLocal } from './utils/localScenes'
import SceneCanvas from './components/SceneCanvas'
import ZoneEditor from './components/ZoneEditor'
import DesignLayer from './components/DesignLayer'
import { BUILTIN_TEMPLATES } from './data/templates'
import { guardarMockupVitrinaParaPrototipo } from '../../utils/mockupVitrinaBridge'

const HERRAMIENTAS = [
  { key: 'escena', label: 'Escena', icon: ImagePlus, disponibleSiempre: true },
  { key: 'zonas', label: 'Zonas', icon: LayoutGrid, requiere: 'foto' },
  { key: 'diseno', label: 'Diseño', icon: PenTool, requiere: 'zona' },
  { key: 'escala', label: 'Escala', icon: Ruler, requiere: 'zona' },
  { key: 'acabado', label: 'Acabado', icon: Sparkles, requiere: 'zona' },
  { key: 'luz', label: 'Luz', icon: SunMedium, requiere: 'capa' },
  { key: 'ajustes', label: 'Ajustes', icon: Settings2, requiere: 'foto' },
]

const ACABADOS = [
  { value: 'impreso-opaco', label: 'Vinil impreso opaco' },
  { value: 'microperforado', label: 'Microperforado' },
  { value: 'empavonado-troquelado', label: 'Empavonado troquelado' },
  { value: 'empavonado-sin-diseno', label: 'Empavonado sin diseño' },
  { value: 'vinil-corte', label: 'Vinil de corte' },
]

function distancia(a, b) {
  return Math.hypot((b?.x || 0) - (a?.x || 0), (b?.y || 0) - (a?.y || 0))
}

function medidasZonaPx(zona) {
  if (!zona?.puntos?.length) return { ancho: 0, alto: 0 }
  return {
    ancho: (distancia(zona.puntos[0], zona.puntos[1]) + distancia(zona.puntos[3], zona.puntos[2])) / 2,
    alto: (distancia(zona.puntos[0], zona.puntos[3]) + distancia(zona.puntos[1], zona.puntos[2])) / 2,
  }
}

function propsAcabado(value) {
  if (value === 'microperforado') return { acabado: value, opacidad: 0.96, textura: 0.5, luz: 0.12 }
  if (value === 'empavonado-sin-diseno') return { acabado: value, opacidad: 0.58, textura: 0.7, luz: 0.35 }
  if (value === 'empavonado-troquelado') return { acabado: value, opacidad: 0.72, textura: 0.65, luz: 0.3 }
  return { acabado: value }
}

function limpiarMedidaInput(value) {
  const texto = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const [entero, ...decimales] = texto.split('.')
  if (decimales.length === 0) return entero
  return `${entero}.${decimales.join('').slice(0, 2)}`
}

function numeroMedida(value) {
  const n = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function fotoADataUrl(src, fallbackW, fallbackH) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    if (src.startsWith('data:')) {
      resolve({ dataUrl: src, w: fallbackW || null, h: fallbackH || null })
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const iw = img.naturalWidth || img.width || fallbackW || 0
        const ih = img.naturalHeight || img.height || fallbackH || 0
        if (!iw || !ih) {
          resolve(null)
          return
        }
        const maxWidth = 1600
        const scale = Math.min(1, maxWidth / iw)
        const out = document.createElement('canvas')
        out.width = Math.max(1, Math.round(iw * scale))
        out.height = Math.max(1, Math.round(ih * scale))
        const ctx = out.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, out.width, out.height)
        resolve({ dataUrl: out.toDataURL('image/jpeg', 0.88), w: out.width, h: out.height })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export default function MockupVitrina() {
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const navigate = useNavigate()
  const [escenas, setEscenas] = useState([])
  const [herramienta, setHerramienta] = useState('escena')
  const [zonaActivaId, setZonaActivaId] = useState(null)
  const [capaActivaId, setCapaActivaId] = useState(null)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [errorListado, setErrorListado] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [mostrarGuias, setMostrarGuias] = useState(true)
  const [calidad, setCalidad] = useState('alta')
  const [puenteOk, setPuenteOk] = useState(false)
  const [enviandoPrototipo, setEnviandoPrototipo] = useState(false)
  const {
    escena, cargandoFoto, guardando, error,
    subirFoto, setNombre, setEsPlantilla, guardar, cargarEscena, cargarComoPlantilla, nuevaEscena,
    addZona, updateZonaPunto, setZonaNombre, setZonaMedidas, removeZona,
    addCapa, addCapaMaterial, updateCapaPunto, ajustarCapaAZona, updateCapaProps, removeCapa,
  } = useSceneStore()

  const refrescarEscenas = useCallback(async () => {
    try {
      const docs = await listarEscenasLocal()
      setEscenas(docs)
      setErrorListado(null)
    } catch (e) {
      setErrorListado(e?.message || 'No se pudieron leer las escenas guardadas.')
    }
  }, [])

  useEffect(() => { refrescarEscenas() }, [refrescarEscenas])

  const tieneFoto = !!escena.fotoUrl
  const tieneZona = escena.zonas.length > 0
  const tieneCapa = escena.capas.length > 0
  const zonaActiva = escena.zonas.find(z => z.id === zonaActivaId) || escena.zonas[0]
  const capaActiva = escena.capas.find(c => c.id === capaActivaId) || escena.capas[0]
  const zonaCapaActiva = escena.zonas.find(z => z.id === capaActiva?.zonaId)

  const disponible = (h) => {
    if (h.disponibleSiempre) return true
    if (h.requiere === 'foto') return tieneFoto
    if (h.requiere === 'zona') return tieneZona
    if (h.requiere === 'capa') return tieneCapa
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
      refrescarEscenas()
      setTimeout(() => setGuardadoOk(false), 2400)
    }
  }

  const handleNueva = () => {
    nuevaEscena()
    setZonaActivaId(null)
    setCapaActivaId(null)
    setHerramienta('escena')
  }

  const prepararMockupParaPrototipo = useCallback(async () => {
    const exportado = canvasRef.current?.exportImage?.({ type: 'image/jpeg', quality: 0.88, maxWidth: 1600 })
    if (exportado?.dataUrl) return exportado
    return fotoADataUrl(escena.fotoUrl, escena.fotoW, escena.fotoH)
  }, [escena.fotoH, escena.fotoUrl, escena.fotoW])

  const handleUsarEnPrototipo = async () => {
    if (enviandoPrototipo) return
    setErrorListado(null)

    if (!escena.fotoUrl) {
      setHerramienta('escena')
      setErrorListado('Primero sube una foto o elige una plantilla; luego podrás enviarla directo a Prototipo Logo.')
      return
    }

    setEnviandoPrototipo(true)
    try {
      const exportado = await prepararMockupParaPrototipo()
      if (!exportado?.dataUrl) {
        setErrorListado('No se pudo preparar la imagen. Prueba eligiendo una plantilla, subiendo la foto otra vez o usando una imagen más liviana.')
        return
      }
      const ok = guardarMockupVitrinaParaPrototipo(exportado.dataUrl, {
        nombre: escena.nombre || 'Mockup final vitrina',
        w: exportado.w,
        h: exportado.h,
      })
      if (!ok) {
        setErrorListado('El navegador no pudo guardar el mockup final. Prueba con calidad rápida o una foto más liviana.')
        return
      }
      setPuenteOk(true)
      setTimeout(() => setPuenteOk(false), 2200)
      navigate('/prototipo')
    } finally {
      setEnviandoPrototipo(false)
    }
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
      await borrarEscenaLocal(doc.id)
      if (escena.id === doc.id) handleNueva()
      refrescarEscenas()
    } catch (err) {
      setErrorListado(err?.message || 'No se pudo eliminar la escena.')
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

  const handleAddCapaMaterial = (zonaId, acabado) => {
    const id = addCapaMaterial(zonaId, acabado)
    return id
  }

  const handleMedidaZona = useCallback((campo, value) => {
    if (!zonaActiva?.id) return
    setZonaMedidas(zonaActiva.id, { [campo]: limpiarMedidaInput(value) })
  }, [setZonaMedidas, zonaActiva?.id])

  const plantillas = [...BUILTIN_TEMPLATES, ...escenas.filter(e => e.esPlantilla)]
  const misEscenas = escenas.filter(e => !e.esPlantilla)
  const pxZona = medidasZonaPx(zonaActiva)
  const anchoCm = numeroMedida(zonaActiva?.anchoCm)
  const altoCm = numeroMedida(zonaActiva?.altoCm)
  const m2 = anchoCm > 0 && altoCm > 0 ? (anchoCm * altoCm) / 10000 : 0

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
          {puenteOk && <span className="text-xs font-dm text-secondary hidden sm:inline">Enviado a Prototipo.</span>}
          <button onClick={handleUsarEnPrototipo} disabled={enviandoPrototipo}
            title={tieneFoto ? 'Enviar mockup final a Prototipo Logo' : 'Sube una foto o elige una plantilla para enviarla a Prototipo Logo'}
            className="hidden sm:flex items-center gap-2 bg-secondary-container/80 text-on-secondary-container rounded-full px-4 py-2.5 text-sm font-dm font-medium hover:bg-secondary-container transition-colors disabled:opacity-60 disabled:cursor-wait">
            <Send size={15} /> {enviandoPrototipo ? 'Preparando...' : 'Prototipo Logo'}
          </button>
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
            ref={canvasRef}
            fotoUrl={escena.fotoUrl} fotoW={escena.fotoW} fotoH={escena.fotoH}
            zonas={escena.zonas} capas={escena.capas}
            herramienta={herramienta} zonaActivaId={zonaActivaId || zonaActiva?.id} capaActivaId={capaActivaId || capaActiva?.id}
            zoom={zoom} mostrarGuias={mostrarGuias} calidad={calidad}
            onZoomChange={setZoom}
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
                          {doc.builtin && (
                            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[9px] font-dm font-semibold uppercase text-secondary">
                              Birth
                            </span>
                          )}
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
              onAddCapaMaterial={handleAddCapaMaterial}
              onAjustarAZona={ajustarCapaAZona}
              onUpdateCapaProps={updateCapaProps}
              onRemoveCapa={(id) => { removeCapa(id); if (capaActivaId === id) setCapaActivaId(null) }}
            />
          )}

          {herramienta === 'escala' && zonaActiva && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Zona a medir</label>
                <select
                  value={zonaActiva.id}
                  onChange={e => setZonaActivaId(e.target.value)}
                  className="mt-2 w-full border border-white/60 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50"
                >
                  {escena.zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-dm text-on-surface-variant">
                  Ancho cm
                  <input
                    type="text" inputMode="decimal" autoComplete="off" value={zonaActiva.anchoCm ?? ''}
                    onChange={e => handleMedidaZona('anchoCm', e.target.value)}
                    className="mt-1 w-full border border-white/60 rounded-full px-3 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50"
                  />
                </label>
                <label className="text-xs font-dm text-on-surface-variant">
                  Alto cm
                  <input
                    type="text" inputMode="decimal" autoComplete="off" value={zonaActiva.altoCm ?? ''}
                    onChange={e => handleMedidaZona('altoCm', e.target.value)}
                    className="mt-1 w-full border border-white/60 rounded-full px-3 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50"
                  />
                </label>
              </div>
              <div className="rounded-xl bg-white/35 p-3 text-xs font-dm text-on-surface-variant">
                <p>Imagen: {Math.round(pxZona.ancho)} × {Math.round(pxZona.alto)} px</p>
                <p className="mt-1 font-semibold text-on-surface">Área real: {m2 ? `${m2.toFixed(2)} m²` : 'ingresa ancho y alto'}</p>
              </div>
            </div>
          )}

          {herramienta === 'acabado' && (
            <div className="space-y-4">
              {!capaActiva && (
                <>
                  <p className="text-xs font-dm text-on-surface-variant/70">Sube un adhesivo o crea un empavonado sin diseño para activar acabados.</p>
                  {zonaActiva && (
                    <button
                      onClick={() => {
                        const id = handleAddCapaMaterial(zonaActiva.id, 'empavonado-sin-diseno')
                        if (id) setCapaActivaId(id)
                      }}
                      className="w-full rounded-full bg-white/50 px-4 py-2.5 text-sm font-dm text-on-surface-variant hover:bg-white/80"
                    >
                      Crear empavonado sin diseño
                    </button>
                  )}
                </>
              )}
              {capaActiva && (
                <>
                  <div>
                    <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Capa</label>
                    <select
                      value={capaActiva.id}
                      onChange={e => setCapaActivaId(e.target.value)}
                      className="mt-2 w-full border border-white/60 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50"
                    >
                      {escena.capas.map(c => {
                        const z = escena.zonas.find(zona => zona.id === c.zonaId)
                        return <option key={c.id} value={c.id}>{z?.nombre || 'Zona'} · {ACABADOS.find(a => a.value === c.acabado)?.label || 'Vinil'}</option>
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Acabado</label>
                    <select
                      value={capaActiva.acabado || 'impreso-opaco'}
                      onChange={e => updateCapaProps(capaActiva.id, propsAcabado(e.target.value))}
                      className="mt-2 w-full border border-white/60 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50"
                    >
                      {ACABADOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">
                      <span>Opacidad</span><span>{Math.round((capaActiva.opacidad ?? 0.88) * 100)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.01" value={capaActiva.opacidad ?? 0.88}
                      onChange={e => updateCapaProps(capaActiva.id, { opacidad: Number(e.target.value) })}
                      className="w-full accent-secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">
                      <span>Textura</span><span>{Math.round((capaActiva.textura ?? 0.5) * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={capaActiva.textura ?? 0.5}
                      onChange={e => updateCapaProps(capaActiva.id, { textura: Number(e.target.value) })}
                      className="w-full accent-secondary" />
                  </div>
                </>
              )}
            </div>
          )}

          {herramienta === 'luz' && capaActiva && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/35 p-3 text-xs font-dm text-on-surface-variant">
                <p className="font-semibold text-on-surface">{zonaCapaActiva?.nombre || 'Capa activa'}</p>
                <p className="mt-1">Integra el adhesivo con sombras/reflejos de la foto.</p>
              </div>
              <div>
                <div className="flex justify-between text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">
                  <span>Integración con luz</span><span>{Math.round((capaActiva.luz ?? 0.22) * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={capaActiva.luz ?? 0.22}
                  onChange={e => updateCapaProps(capaActiva.id, { luz: Number(e.target.value) })}
                  className="w-full accent-secondary" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => updateCapaProps(capaActiva.id, { luz: 0.12 })} className="rounded-full bg-white/45 px-3 py-2 text-xs font-dm">Suave</button>
                <button onClick={() => updateCapaProps(capaActiva.id, { luz: 0.45 })} className="rounded-full bg-white/45 px-3 py-2 text-xs font-dm">Realista</button>
              </div>
            </div>
          )}

          {herramienta === 'ajustes' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">
                  <span>Zoom</span><span>{Math.round(zoom * 100)}%</span>
                </div>
                <input type="range" min="0.35" max="2.5" step="0.05" value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="w-full accent-secondary" />
              </div>
              <label className="flex items-center justify-between gap-3 text-sm font-dm text-on-surface-variant">
                Mostrar guías
                <input type="checkbox" checked={mostrarGuias} onChange={e => setMostrarGuias(e.target.checked)} />
              </label>
              <div>
                <label className="text-xs font-dm font-semibold text-on-surface-variant uppercase tracking-wide">Calidad de vista</label>
                <select
                  value={calidad}
                  onChange={e => setCalidad(e.target.value)}
                  className="mt-2 w-full border border-white/60 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary bg-white/50"
                >
                  <option value="alta">Alta</option>
                  <option value="rapida">Rápida</option>
                </select>
              </div>
              <button onClick={() => setZoom(1)} className="w-full rounded-full bg-white/50 px-4 py-2.5 text-sm font-dm text-on-surface-variant hover:bg-white/80">
                Restablecer zoom
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
