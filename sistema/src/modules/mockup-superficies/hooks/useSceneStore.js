import { useCallback, useState } from 'react'
import { guardarEscenaLocal } from '../utils/localScenes'
import { canvasToBlob, canvasToPngBlob, knockoutBackground, loadImageFile } from '../utils/loadImage'
import { quadDefault } from '../utils/warpQuad'

// Si Storage no responde (regla de permisos, red caida) el usuario no debe
// quedar viendo "Subiendo..." para siempre sin ninguna pista.
function conTimeout(promise, ms, mensaje) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(mensaje)), ms)),
  ])
}

const ESCENA_VACIA = {
  id: null, nombre: '', fotoUrl: null, fotoW: 0, fotoH: 0, storagePath: null,
  esPlantilla: false, zonas: [], capas: [],
}

const CAPA_DEFAULTS = {
  acabado: 'impreso-opaco',
  opacidad: 0.88,
  luz: 0.22,
  textura: 0.5,
}

function nombreAutomaticoEscena(escena) {
  const now = new Date()
  const fecha = now.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const hora = now.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const zonas = escena.zonas?.length || 0
  const capas = escena.capas?.length || 0
  if (capas > 0) return `Mockup vitrina ${fecha} ${hora} - ${capas} diseño${capas === 1 ? '' : 's'}`
  if (zonas > 0) return `Mockup vitrina ${fecha} ${hora} - ${zonas} zona${zonas === 1 ? '' : 's'}`
  return `Mockup vitrina ${fecha} ${hora}`
}

function normalizarZona(zona) {
  return {
    ...zona,
    anchoCm: zona.anchoCm || '',
    altoCm: zona.altoCm || '',
  }
}

function normalizarCapa(capa) {
  return {
    ...CAPA_DEFAULTS,
    ...capa,
    puntos: capa.puntos || [],
  }
}

// Estado local de la escena actualmente abierta en el editor. No toca ningun
// store global del sistema (Regla Cero) — vive solo mientras el modulo esta
// montado. La persistencia real vive en Firestore via utils/firestore.js.
export default function useSceneStore() {
  const [escena, setEscena] = useState(ESCENA_VACIA)
  const [fotoBlobPendiente, setFotoBlobPendiente] = useState(null)
  const [capasBlobPendientes, setCapasBlobPendientes] = useState({})
  const [cargandoFoto, setCargandoFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const subirFoto = useCallback(async (file) => {
    if (!file) return
    setError(null)
    setCargandoFoto(true)
    try {
      const { canvas, w, h } = await conTimeout(
        loadImageFile(file),
        15000,
        'La foto tardó demasiado en procesarse. Prueba con una imagen más liviana.',
      )
      const blob = await canvasToBlob(canvas)
      setFotoBlobPendiente(blob)
      // Subir foto nueva no borra zonas/capas si ya habia (permite re-tomar
      // la foto sin perder el trabajo de marcado) — el usuario decide si
      // le sirve o las borra a mano.
      setEscena(prev => ({ ...prev, fotoUrl: canvas.toDataURL('image/jpeg', 0.85), fotoW: w, fotoH: h }))
    } catch {
      setError('No se pudo leer la foto. Prueba con otro archivo.')
    } finally {
      setCargandoFoto(false)
    }
  }, [])

  const setNombre = useCallback((nombre) => {
    setEscena(prev => ({ ...prev, nombre }))
  }, [])

  const setEsPlantilla = useCallback((esPlantilla) => {
    setEscena(prev => ({ ...prev, esPlantilla }))
  }, [])

  // ─── ZONAS ────────────────────────────────────────────────────────────────
  const addZona = useCallback((tipo) => {
    const id = crypto.randomUUID()
    setEscena(prev => {
      const w = prev.fotoW || 800, h = prev.fotoH || 600
      const zw = w * 0.3, zh = h * 0.4
      const nueva = {
        id,
        nombre: tipo === 'vidrio' ? `Ventanal ${prev.zonas.filter(z => z.tipo === 'vidrio').length + 1}` : 'Zona pared',
        tipo,
        anchoCm: '',
        altoCm: '',
        puntos: quadDefault((w - zw) / 2, (h - zh) / 2, zw, zh),
      }
      return { ...prev, zonas: [...prev.zonas, nueva] }
    })
    return id
  }, [])

  const updateZonaPunto = useCallback((zonaId, idx, punto) => {
    setEscena(prev => ({
      ...prev,
      zonas: prev.zonas.map(z => z.id !== zonaId ? z : {
        ...z, puntos: z.puntos.map((p, i) => i === idx ? punto : p),
      }),
    }))
  }, [])

  const setZonaNombre = useCallback((zonaId, nombre) => {
    setEscena(prev => ({ ...prev, zonas: prev.zonas.map(z => z.id === zonaId ? { ...z, nombre } : z) }))
  }, [])

  const setZonaMedidas = useCallback((zonaId, medidas) => {
    setEscena(prev => ({
      ...prev,
      zonas: prev.zonas.map(z => z.id === zonaId ? { ...z, ...medidas } : z),
    }))
  }, [])

  const removeZona = useCallback((zonaId) => {
    setEscena(prev => ({
      ...prev,
      zonas: prev.zonas.filter(z => z.id !== zonaId),
      capas: prev.capas.filter(c => c.zonaId !== zonaId),
    }))
    setCapasBlobPendientes(prev => {
      const keep = {}
      for (const capa of escena.capas) {
        if (capa.zonaId !== zonaId && prev[capa.id]) keep[capa.id] = prev[capa.id]
      }
      return keep
    })
  }, [escena.capas])

  // ─── CAPAS (diseños con corner-pin) ────────────────────────────────────────
  const addCapa = useCallback(async (zonaId, file) => {
    setError(null)
    try {
      const zona = escena.zonas.find(z => z.id === zonaId)
      if (!zona) return
      // Mismo pipeline que la foto de escena (EXIF + reescalado a un lado
      // maximo razonable) para que un adhesivo pesado no se cuelgue
      // subiendo — PNG en vez de JPEG para no perder la transparencia del
      // recorte del sticker.
      const { canvas } = await conTimeout(
        loadImageFile(file),
        15000,
        'El diseño tardó demasiado en procesarse. Prueba con una imagen más liviana.',
      )
      // Quita el fondo blanco/claro del adhesivo (si lo trae horneado) para
      // que sobre el vidrio no se vea un rectángulo sólido. Si el PNG ya es
      // transparente, no cambia nada.
      knockoutBackground(canvas)
      const blob = await canvasToPngBlob(canvas)
      const id = crypto.randomUUID()
      const nueva = {
        id, zonaId, imgUrl: canvas.toDataURL('image/png'),
        imgW: canvas.width, imgH: canvas.height,
        ...CAPA_DEFAULTS,
        // Arranca calzado exacto a la zona — "Ajustar a zona" hace lo mismo
        // despues si el usuario lo mueve y se quiere resetear.
        puntos: zona.puntos.map(p => ({ ...p })),
      }
      setCapasBlobPendientes(prev => ({ ...prev, [id]: blob }))
      setEscena(prev => ({ ...prev, capas: [...prev.capas, nueva] }))
      return nueva.id
    } catch (e) {
      setError(e?.message || 'No se pudo cargar el diseño. Prueba con otro archivo.')
    }
  }, [escena.zonas])

  const addCapaMaterial = useCallback((zonaId, acabado = 'empavonado-sin-diseno') => {
    setError(null)
    const zona = escena.zonas.find(z => z.id === zonaId)
    if (!zona) return
    const id = crypto.randomUUID()
    const nueva = {
      id, zonaId, imgUrl: null, imgW: 0, imgH: 0,
      ...CAPA_DEFAULTS,
      acabado,
      opacidad: acabado.includes('empavonado') ? 0.58 : CAPA_DEFAULTS.opacidad,
      luz: 0.35,
      textura: 0.7,
      puntos: zona.puntos.map(p => ({ ...p })),
    }
    setEscena(prev => ({ ...prev, capas: [...prev.capas, nueva] }))
    return id
  }, [escena.zonas])

  const updateCapaPunto = useCallback((capaId, idx, punto) => {
    setEscena(prev => ({
      ...prev,
      capas: prev.capas.map(c => c.id !== capaId ? c : {
        ...c, puntos: c.puntos.map((p, i) => i === idx ? punto : p),
      }),
    }))
  }, [])

  const ajustarCapaAZona = useCallback((capaId) => {
    setEscena(prev => {
      const capa = prev.capas.find(c => c.id === capaId)
      if (!capa) return prev
      const zona = prev.zonas.find(z => z.id === capa.zonaId)
      if (!zona) return prev
      return {
        ...prev,
        capas: prev.capas.map(c => c.id === capaId ? { ...c, puntos: zona.puntos.map(p => ({ ...p })) } : c),
      }
    })
  }, [])

  const updateCapaProps = useCallback((capaId, patch) => {
    setEscena(prev => ({
      ...prev,
      capas: prev.capas.map(c => c.id === capaId ? { ...c, ...patch } : c),
    }))
  }, [])

  const removeCapa = useCallback((capaId) => {
    setEscena(prev => ({ ...prev, capas: prev.capas.filter(c => c.id !== capaId) }))
    setCapasBlobPendientes(prev => {
      const { [capaId]: _omitida, ...rest } = prev
      return rest
    })
  }, [])

  // ─── PERSISTENCIA ───────────────────────────────────────────────────────────
  const guardar = useCallback(async () => {
    if (!escena.fotoUrl) { setError('Sube una foto primero.'); return false }
    setError(null)
    setGuardando(true)
    try {
      const nombre = escena.nombre.trim() || nombreAutomaticoEscena(escena)
      // Guardado LOCAL (IndexedDB): la foto y los diseños ya son dataURL en
      // memoria, así que se persiste la escena tal cual, sin subir a Firebase
      // Storage (pausado). La nube queda como paso posterior.
      const guardada = {
        id: escena.id || crypto.randomUUID(),
        nombre,
        fotoUrl: escena.fotoUrl,
        fotoW: escena.fotoW, fotoH: escena.fotoH,
        storagePath: escena.storagePath || null,
        esPlantilla: !!escena.esPlantilla,
        zonas: escena.zonas,
        capas: escena.capas,
        createdAt: escena.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        local: true,
      }
      await guardarEscenaLocal(guardada)
      setEscena(prev => ({ ...prev, ...guardada }))
      setFotoBlobPendiente(null)
      setCapasBlobPendientes({})
      return true
    } catch (e) {
      const msg = e?.name === 'QuotaExceededError'
        ? 'No se pudo guardar: el navegador se quedó sin espacio para esta escena. Prueba con una foto más liviana o descarga el mockup final.'
        : e?.message || 'No se pudo guardar la escena en este navegador.'
      setError(msg)
      return false
    } finally {
      setGuardando(false)
    }
  }, [escena])

  const cargarEscena = useCallback((doc) => {
    setError(null)
    setFotoBlobPendiente(null)
    setCapasBlobPendientes({})
    setEscena({
      id: doc.id, nombre: doc.nombre || '', fotoUrl: doc.fotoUrl || null,
      fotoW: doc.fotoW || 0, fotoH: doc.fotoH || 0, storagePath: doc.storagePath || null,
      esPlantilla: !!doc.esPlantilla, zonas: (doc.zonas || []).map(normalizarZona), capas: (doc.capas || []).map(normalizarCapa),
    })
  }, [])

  // Abrir una plantilla NO la edita en sitio: crea una escena nueva con la
  // misma foto y zonas ya marcadas, pero sin diseños ni id — asi la
  // plantilla original queda intacta para la proxima cotizacion.
  const cargarComoPlantilla = useCallback((doc) => {
    setError(null)
    setFotoBlobPendiente(null)
    setCapasBlobPendientes({})
    setEscena({
      id: null, nombre: `${doc.nombre || 'Plantilla'} — copia`,
      fotoUrl: doc.fotoUrl || null, fotoW: doc.fotoW || 0, fotoH: doc.fotoH || 0,
      storagePath: doc.storagePath || null,
      esPlantilla: false,
      zonas: (doc.zonas || []).map(z => normalizarZona({ ...z, puntos: z.puntos.map(p => ({ ...p })) })),
      capas: [],
    })
  }, [])

  const nuevaEscena = useCallback(() => {
    setError(null)
    setFotoBlobPendiente(null)
    setCapasBlobPendientes({})
    setEscena(ESCENA_VACIA)
  }, [])

  return {
    escena, cargandoFoto, guardando, error,
    subirFoto, setNombre, setEsPlantilla, guardar, cargarEscena, cargarComoPlantilla, nuevaEscena,
    addZona, updateZonaPunto, setZonaNombre, setZonaMedidas, removeZona,
    addCapa, addCapaMaterial, updateCapaPunto, ajustarCapaAZona, updateCapaProps, removeCapa,
  }
}
