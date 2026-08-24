import { useCallback, useState } from 'react'
import { saveEscena, uploadEscenaFoto } from '../utils/firestore'
import { canvasToBlob, loadImageFile } from '../utils/loadImage'

const ESCENA_VACIA = {
  id: null, nombre: '', fotoUrl: null, fotoW: 0, fotoH: 0, storagePath: null,
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
      })
      setEscena(guardada)
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
    })
  }, [])

  const nuevaEscena = useCallback(() => {
    setError(null)
    setFotoBlobPendiente(null)
    setEscena(ESCENA_VACIA)
  }, [])

  return {
    escena, cargandoFoto, guardando, error,
    subirFoto, setNombre, guardar, cargarEscena, nuevaEscena,
  }
}
