import { useState, useEffect } from 'react'
import { subscribeProveedores, saveProveedor, deleteProveedor } from '../utils/storage'
import { clp } from '../utils/formatters'
import { Plus, Search, Trash2, Edit2, X, Phone, Mail, Truck, MapPin } from 'lucide-react'

function WhatsAppIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
    </svg>
  )
}

function telWhatsApp(telefono) {
  const clean = (telefono || '').replace(/[\s\-()+]/g, '')
  if (!clean) return null
  const num = clean.startsWith('56') ? clean : `56${clean.replace(/^0/, '')}`
  return `https://wa.me/${num}`
}

const EMPTY = { nombre: '', telefono: '', email: '', direccion: '', nota: '', materiales: [] }
const UNIDADES = ['unidad', 'm²', 'ml', 'plancha', 'rollo', 'caja', 'kilo', 'litro', 'set']

// ─── MODAL CREAR/EDITAR PROVEEDOR ─────────────────────────────────────────────
function Modal({ proveedor, onClose, onSave }) {
  const [form, setForm] = useState(proveedor?.id ? { ...EMPTY, ...proveedor, materiales: proveedor.materiales || [] } : { ...EMPTY })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setMat = (idx, k, v) => setForm(f => ({
    ...f, materiales: f.materiales.map((m, i) => i === idx ? { ...m, [k]: v } : m),
  }))
  const addMat = () => setForm(f => ({ ...f, materiales: [...f.materiales, { nombre: '', unidad: 'unidad', precio: '' }] }))
  const removeMat = (idx) => setForm(f => ({ ...f, materiales: f.materiales.filter((_, i) => i !== idx) }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    const materiales = form.materiales
      .filter(m => m.nombre?.trim())
      .map(m => ({ nombre: m.nombre.trim(), unidad: m.unidad || 'unidad', precio: parseFloat(m.precio) || 0 }))
    onSave({ ...form, nombre: form.nombre.trim(), materiales })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-[32px] md:rounded-t-widget z-10">
          <h2 className="font-barlow text-xl font-bold tracking-wide">{proveedor?.id ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Nombre / Empresa *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required autoFocus
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56 9 XXXX XXXX"
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Dirección</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>

          {/* Materiales que vende */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-on-surface-variant font-dm uppercase tracking-wider">Materiales que vende</label>
              <button type="button" onClick={addMat} className="flex items-center gap-1 text-xs font-dm font-medium text-primary hover:underline"><Plus size={13} /> Agregar</button>
            </div>
            {form.materiales.length === 0 && (
              <p className="text-[11px] text-on-surface-variant font-dm py-1">Agrega los materiales y precios que ofrece este proveedor.</p>
            )}
            <div className="space-y-2">
              {form.materiales.map((m, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input value={m.nombre} onChange={e => setMat(idx, 'nombre', e.target.value)} placeholder="Material"
                    className="flex-1 min-w-0 border border-white/60 bg-white/50 rounded px-2.5 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
                  <select value={m.unidad} onChange={e => setMat(idx, 'unidad', e.target.value)}
                    className="w-20 border border-white/60 bg-white/50 rounded px-1 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white">
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <div className="flex items-center gap-0.5 w-24">
                    <span className="text-on-surface-variant text-xs">$</span>
                    <input type="number" min="0" value={m.precio} onChange={e => setMat(idx, 'precio', e.target.value)} placeholder="0"
                      className="w-full border border-white/60 bg-white/50 rounded px-1.5 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
                  </div>
                  <button type="button" onClick={() => removeMat(idx)} className="text-on-surface-variant hover:text-primary shrink-0"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Nota</label>
            <input value={form.nota} onChange={e => set('nota', e.target.value)}
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>
          <div className="flex gap-3 pt-2 pb-safe">
            <button type="submit"
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
              {proveedor?.id ? 'Guardar cambios' : 'Agregar proveedor'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 border border-white/60 bg-white/40 rounded-full text-sm font-dm text-on-surface-variant hover:border-primary transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PÁGINA PROVEEDORES ───────────────────────────────────────────────────────
export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [modal, setModal] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    const u = subscribeProveedores(setProveedores)
    return () => u()
  }, [])

  const filtrados = proveedores.filter(p =>
    !busqueda ||
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.materiales || []).some(m => m.nombre?.toLowerCase().includes(busqueda.toLowerCase())))

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      {modal && (
        <Modal
          proveedor={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={async (data) => { await saveProveedor(data); setModal(null) }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[80] p-0 md:p-4">
          <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full md:max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-primary" /></div>
              <p className="font-barlow font-bold text-on-surface text-lg leading-tight">¿Eliminar "{confirmDelete.nombre}"?</p>
            </div>
            <div className="flex gap-3 pt-1 pb-safe">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-white/50 rounded py-2.5 text-sm font-dm text-on-surface-variant hover:border-on-surface transition-colors">Cancelar</button>
              <button onClick={async () => { await deleteProveedor(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 bg-primary text-white rounded py-2.5 text-sm font-dm font-medium hover:bg-red-700 transition-colors">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6 px-0.5 md:px-0">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-on-surface tracking-wide">PROVEEDORES</h1>
          <p className="text-on-surface-variant text-xs md:text-sm font-dm mt-1">{proveedores.length} proveedores · precios de materiales</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
          <Plus size={15} /> <span className="hidden sm:inline">Nuevo</span> proveedor
        </button>
      </div>

      {/* Buscador */}
      <div className="relative flex-1 md:max-w-xs mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar proveedor o material…"
          className="w-full pl-9 pr-3 py-2.5 rounded-full border border-white/50 bg-white/50 text-sm font-dm focus:outline-none focus:border-on-surface" />
      </div>

      {filtrados.length === 0 ? (
        <div className="glass-panel rounded-widget py-16 text-center text-on-surface-variant text-sm font-dm">
          {proveedores.length === 0 ? 'Sin proveedores. Agrega el primero.' : 'Sin resultados.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map(p => {
            const wa = telWhatsApp(p.telefono)
            return (
              <div key={p.id} className="glass-panel rounded-widget p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Truck size={17} className="text-on-surface-variant shrink-0" />
                      <p className="font-barlow text-lg font-bold text-on-surface leading-tight truncate">{p.nombre}</p>
                    </div>
                    {p.direccion && <p className="text-[11px] text-on-surface-variant font-dm mt-1 flex items-center gap-1"><MapPin size={12} /> {p.direccion}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setModal({ ...p })} title="Editar" className="p-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirmDelete(p)} title="Eliminar" className="p-1.5 rounded border border-red-200 text-primary hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Contacto */}
                {(p.telefono || p.email) && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.telefono && (
                      <a href={`tel:${p.telefono}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/50 text-[11px] font-dm text-on-surface-variant hover:border-on-surface hover:text-on-surface">
                        <Phone size={12} /> {p.telefono}
                      </a>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-green-300 text-[11px] font-dm text-green-700 hover:bg-green-50">
                        <WhatsAppIcon size={12} /> WhatsApp
                      </a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/50 text-[11px] font-dm text-on-surface-variant hover:border-primary hover:text-primary">
                        <Mail size={12} /> {p.email}
                      </a>
                    )}
                  </div>
                )}

                {/* Materiales que vende */}
                <div className="mt-3 pt-3 border-t border-white/50 flex-1">
                  <p className="text-[10px] font-dm uppercase tracking-wider text-on-surface-variant mb-1.5">Materiales ({(p.materiales || []).length})</p>
                  {(p.materiales || []).length === 0 ? (
                    <p className="text-[11px] text-on-surface-variant/70 font-dm">Sin materiales cargados.</p>
                  ) : (
                    <div className="space-y-1">
                      {(p.materiales || []).map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 text-sm font-dm">
                          <span className="text-on-surface truncate">{m.nombre} <span className="text-on-surface-variant text-[11px]">/{m.unidad}</span></span>
                          <span className="font-semibold text-on-surface shrink-0">{clp(m.precio)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {p.nota && <p className="text-[11px] text-on-surface-variant/80 font-dm mt-2 italic">{p.nota}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
