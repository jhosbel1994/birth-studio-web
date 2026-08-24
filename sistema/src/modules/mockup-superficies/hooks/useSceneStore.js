import { useCallback, useState } from 'react'
import { saveEscena, uploadEscenaFoto } from '../utils/firestore'
import { canvasToBlob, loadImageFile } from '../utils/loadImage'
import { quadDefault } from '../utils/warpQuad'

const ESCENA_VACIA = {
  id: null, nombre: '', fotoUrl: null, fotoW: 0, fotoH: 0, storagePath: null,
  esPlantilla: false, zonas: [], capas: [],
}

// Estado local de la escena actualmente abierta en el editor. No toca ningun
// store global del sistema (Regla Cero) — vive solo mientras el modulo esta
// montado. La persistencia real vive en Firestore via utils/firestore.js.
export default function useSceneStore() {
  const [escena, setEscena] = useState(ESCENA_VACIA)
  const [fotoBlobPendiente, setFotoBlobPendiente] = useState(null)
  const [cargandoFoto, setCargandoFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const subirFoto = useCallback(async (file) => {
    if (!file) return
    setError(null)
    setCargandoFoto(true)
    try {
      const { canvas, w, h } = await loadImageFile(file)
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

  const removeZona = useCallback((zonaId) => {
    setEscena(prev => ({
      ...prev,
      zonas: prev.zonas.filter(z => z.id !== zonaId),
      capas: prev.capas.filter(c => c.zonaId !== zonaId),
    }))
  }, [])

  // ─── CAPAS (diseños con corner-pin) ────────────────────────────────────────
  const addCapa = useCallback(async (zonaId, file) => {
    setError(null)
    try {
      const zona = escena.zonas.find(z => z.id === zonaId)
      if (!zona) return
      const up = await uploadEscenaFoto(file)
      const img = await new Promise((res, rej) => {
        const im = new Image()
        im.onload = () => res(im)
        im.onerror = rej
        im.src = up.url
      })
      const nueva = {
        id: crypto.randomUUID(), zonaId, imgUrl: up.url,
        imgW: img.naturalWidth, imgH: img.naturalHeight,
        // Arranca calzado exacto a la zona — "Ajustar a zona" hace lo mismo
        // despues si el usuario lo mueve y se quiere resetear.
        puntos: zona.puntos.map(p => ({ ...p })),
      }
      setEscena(prev => ({ ...prev, capas: [...prev.capas, nueva] }))
      return nueva.id
    } catch {
      setError('No se pudo subir el diseño. Prueba con otro archivo.')
    }
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

  const removeCapa = useCallback((capaId) => {
    setEscena(prev => ({ ...prev, capas: prev.capas.filter(c => c.id !== capaId) }))
  }, [])

  // ─── PERSISTENCIA ───────────────────────────────────────────────────────────
  const guardar = useCallback(async () => {
    if (!escena.nombre.trim()) { setError('Ponle un nombre a la escena.'); return false }
    if (!escena.fotoUrl) { setError('Sube una foto primero.'); return false }
    setError(null)
    setGuardando(true)
    try {
      let fotoUrl = escena.fotoUrl
      let storagePath = escena.storagePath
      if (fotoBlobPendiente) {
        const up = await uploadEscenaFoto(new File([fotoBlobPendiente], 'escena.jpg', { type: 'image/jpeg' }))
        fotoUrl = up.url
        storagePath = up.path
      }
      const guardada = await saveEscena({
        id: escena.id, nombre: escena.nombre.trim(), fotoUrl,
        fotoW: escena.fotoW, fotoH: escena.fotoH, storagePath,
        esPlantilla: !!escena.esPlantilla, zonas: escena.zonas, capas: escena.capas,
      })
      setEscena(prev => ({ ...prev, ...guardada }))
      setFotoBlobPendiente(null)
      return true
    } catch {
      setError('No se pudo guardar la escena. Revisa tu conexión.')
      return false
    } finally {
      setGuardando(false)
    }
  }, [escena, fotoBlobPendiente])

  const cargarEscena = useCallback((doc) => {
    setError(null)
    setFotoBlobPendiente(null)
    setEscena({
      id: doc.id, nombre: doc.nombre || '', fotoUrl: doc.fotoUrl || null,
      fotoW: doc.fotoW || 0, fotoH: doc.fotoH || 0, storagePath: doc.storagePath || null,
      esPlantilla: !!doc.esPlantilla, zonas: doc.zonas || [], capas: doc.capas || [],
    })
  }, [])

  // Abrir una plantilla NO la edita en sitio: crea una escena nueva con la
  // misma foto y zonas ya marcadas, pero sin diseños ni id — asi la
  // plantilla original queda intacta para la proxima cotizacion.
  const cargarComoPlantilla = useCallback((doc) => {
    setError(null)
    setFotoBlobPendiente(null)
    setEscena({
      id: null, nombre: `${doc.nombre || 'Plantilla'} — copia`,
      fotoUrl: doc.fotoUrl || null, fotoW: doc.fotoW || 0, fotoH: doc.fotoH || 0,
      storagePath: doc.storagePath || null,
      esPlantilla: false,
      zonas: (doc.zonas || []).map(z => ({ ...z, puntos: z.puntos.map(p => ({ ...p })) })),
      capas: [],
    })
  }, [])

  const nuevaEscena = useCallback(() => {
    setError(null)
    setFotoBlobPendiente(null)
    setEscena(ESCENA_VACIA)
  }, [])

  return {
    escena, cargandoFoto, guardando, error,
    subirFoto, setNombre, setEsPlantilla, guardar, cargarEscena, cargarComoPlantilla, nuevaEscena,
    addZona, updateZonaPunto, setZonaNombre, removeZona,
    addCapa, updateCapaPunto, ajustarCapaAZona, removeCapa,
  }
}
