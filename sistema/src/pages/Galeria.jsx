import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Upload, X, Trash2, Star } from 'lucide-react'
import { auth } from '../firebase'
import {
  subscribeGaleria, saveGaleriaItem, deleteGaleriaItem,
  uploadGaleriaImagen, deleteGaleriaImagen,
} from '../utils/storage'
import { CATEGORIAS_GALERIA } from '../utils/formatters'

const EMPTY = {
  categoria: CATEGORIAS_GALERIA[0],
  destacada: false,
  orden: 0,
  titulo: '',
  descripcion: '',
  textoBoton: '',
  linkBoton: '',
}

// ─── FORM DE SUBIDA ────────────────────────────────────────────────────────────
function FormSubida({ onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY })
  const [archivo, setArchivo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const procesarArchivo = (file) => {
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Sube un archivo de imagen (jpg, png, webp...).')
      return
    }
    setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    setArchivo(file)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    procesarArchivo(e.dataTransfer.files?.[0])
  }, [])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!archivo) { setError('Selecciona una imagen'); return }
    if (!auth.currentUser) {
      setError('Tu sesión expiró. Cierra sesión y vuelve a entrar con tu correo y contraseña.')
      return
    }
    setSubiendo(true)
    setError('')
    try {
      const { url, path } = await uploadGaleriaImagen(archivo)
      await saveGaleriaItem({
        ...form,
        url,
        storagePath: path,
        orden: Number(form.orden) || 0,
      })
      onSaved()
    } catch (err) {
      setError('No se pudo subir la imagen. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t-2xl md:rounded-t">
          <h2 className="font-barlow text-xl font-bold tracking-wide">NUEVA FOTO</h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-birth-gray-3 rounded p-6 text-center cursor-pointer hover:border-birth-black transition-colors overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt="" className="mx-auto max-h-48 rounded object-contain" />
            ) : (
              <>
                <Upload size={20} className="mx-auto mb-2 text-birth-gray-3" />
                <p className="text-sm font-dm text-birth-gray-4">Arrastra una foto aquí o haz clic para elegir</p>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={e => procesarArchivo(e.target.files?.[0])} />
          </div>
          {preview && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="text-xs font-dm text-birth-gray-4 hover:text-birth-black">
              Cambiar imagen
            </button>
          )}

          {error && <p className="text-birth-red text-xs font-dm">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Categoría</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                {CATEGORIAS_GALERIA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Orden</label>
              <input type="number" value={form.orden} onChange={e => set('orden', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-dm text-birth-gray-4 py-1">
            <input type="checkbox" checked={form.destacada} onChange={e => set('destacada', e.target.checked)}
              className="w-4 h-4 accent-birth-red" />
            Destacada — aparece en el banner del home
          </label>

          <p className="text-[11px] font-dm text-birth-gray-3 uppercase tracking-wider pt-1">Texto opcional sobre la foto (banner)</p>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Título</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Descripción</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Texto botón</label>
              <input value={form.textoBoton} onChange={e => set('textoBoton', e.target.value)} placeholder="Cotizar ahora"
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Link botón</label>
              <input value={form.linkBoton} onChange={e => set('linkBoton', e.target.value)} placeholder="#cotizacion"
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
          </div>

          <div className="flex gap-3 pt-2 pb-safe">
            <button type="submit" disabled={subiendo}
              className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors disabled:opacity-60">
              {subiendo ? 'Subiendo...' : 'Subir foto'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 border border-birth-gray-2 rounded text-sm font-dm text-birth-gray-4 hover:border-birth-black transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Galeria() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    const unsub = subscribeGaleria(setItems)
    return unsub
  }, [])

  const filtrados = filtro ? items.filter(i => i.categoria === filtro) : items

  const handleDelete = async (item) => {
    if (!confirm('¿Eliminar esta imagen de la galería?')) return
    await deleteGaleriaImagen(item.storagePath)
    await deleteGaleriaItem(item.id)
  }

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      {modal && (
        <FormSubida onClose={() => setModal(false)} onSaved={() => setModal(false)} />
      )}

      <div className="flex items-center justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-birth-black tracking-wide">GALERÍA</h1>
          <p className="text-birth-gray-3 text-xs md:text-sm font-dm mt-1">{items.length} fotos · alimenta el banner y el catálogo del sitio público</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-birth-black text-white px-3 md:px-5 py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
          <Plus size={16} /> <span className="hidden sm:inline">Nueva</span> foto
        </button>
      </div>

      <div className="mb-5 max-w-xs">
        <select value={filtro} onChange={e => setFiltro(e.target.value)}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
          <option value="">Todas las categorías</option>
          {CATEGORIAS_GALERIA.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white border border-birth-gray-2 rounded py-16 text-center">
          <p className="text-birth-gray-3 text-sm font-dm">{filtro ? 'Sin resultados' : 'Aún no hay imágenes.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtrados.map(item => (
            <div key={item.id} className="bg-white border border-birth-gray-2 rounded overflow-hidden group relative">
              <img src={item.url} alt={item.titulo || item.categoria} className="w-full aspect-square object-cover" />
              {item.destacada && (
                <span className="absolute top-2 left-2 flex items-center gap-1 bg-birth-red text-white text-[10px] px-2 py-0.5 rounded font-dm">
                  <Star size={10} fill="currentColor" /> Destacada
                </span>
              )}
              <button onClick={() => handleDelete(item)}
                className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-birth-gray-3 hover:text-birth-red transition-colors">
                <Trash2 size={14} />
              </button>
              <div className="p-2.5 space-y-0.5">
                <p className="text-xs font-dm font-medium truncate">{item.titulo || item.categoria}</p>
                <p className="text-[10px] text-birth-gray-3 font-dm">{item.categoria} · orden {item.orden}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
