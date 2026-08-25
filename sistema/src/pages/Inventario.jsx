import { useState, useEffect } from 'react'
import {
  subscribeInventario, saveInventarioItem, deleteInventarioItem, subscribeProveedores,
} from '../utils/storage'
import { clp } from '../utils/formatters'
import { Plus, Search, Trash2, Edit2, X, Boxes, Package, Plus as PlusIcon, Minus } from 'lucide-react'

// Tipos de unidad para el inventario (cómo se mide el stock)
const TIPOS = [
  { v: 'm2', label: 'm² (metro cuadrado)' },
  { v: 'ml', label: 'metro lineal' },
  { v: 'unidad', label: 'unidad' },
  { v: 'plancha', label: 'plancha' },
  { v: 'rollo', label: 'rollo' },
  { v: 'caja', label: 'caja' },
  { v: 'kilo', label: 'kilo' },
  { v: 'litro', label: 'litro' },
  { v: 'set', label: 'set' },
]
const tipoLabel = (v) => TIPOS.find(t => t.v === v)?.v || v

const EMPTY = { nombre: '', tipo: 'm2', cantidad: '', precio: '', proveedorId: '', nota: '' }

// ─── MODAL CREAR/EDITAR ÍTEM ──────────────────────────────────────────────────
function Modal({ item, proveedores, onClose, onSave }) {
  const [form, setForm] = useState(item?.id ? { ...EMPTY, ...item } : { ...EMPTY })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    onSave({
      ...form,
      nombre: form.nombre.trim(),
      cantidad: parseFloat(form.cantidad) || 0,
      precio: parseFloat(form.precio) || 0,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-[32px] md:rounded-t-widget">
          <h2 className="font-barlow text-xl font-bold tracking-wide">{item?.id ? 'EDITAR ÍTEM' : 'NUEVO ÍTEM'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Material *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required autoFocus
              placeholder="Ej. Acrílico 3mm blanco, Rollo vinil adhesivo…"
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Se mide por</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white">
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Cantidad en stock</label>
              <input type="number" min="0" step="0.01" value={form.cantidad} onChange={e => set('cantidad', e.target.value)}
                placeholder="0"
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Precio (costo por unidad)</label>
              <input type="number" min="0" value={form.precio} onChange={e => set('precio', e.target.value)}
                placeholder="0"
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Proveedor (opcional)</label>
              <select value={form.proveedorId} onChange={e => set('proveedorId', e.target.value)}
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white">
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Nota</label>
            <input value={form.nota} onChange={e => set('nota', e.target.value)}
              placeholder="Ej. medida 1.22×2.44m, color, calibre…"
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>
          <div className="flex gap-3 pt-2 pb-safe">
            <button type="submit"
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
              {item?.id ? 'Guardar cambios' : 'Agregar al inventario'}
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

// ─── PÁGINA INVENTARIO ────────────────────────────────────────────────────────
export default function Inventario() {
  const [items, setItems] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [modal, setModal] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    const u1 = subscribeInventario(setItems)
    const u2 = subscribeProveedores(setProveedores)
    return () => { u1(); u2() }
  }, [])

  const provNombre = (id) => proveedores.find(p => p.id === id)?.nombre || ''

  const filtrados = items.filter(i =>
    !busqueda || i.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || provNombre(i.proveedorId).toLowerCase().includes(busqueda.toLowerCase()))

  const valorTotal = items.reduce((s, i) => s + (i.cantidad || 0) * (i.precio || 0), 0)

  const ajustarStock = (item, delta) => {
    const nueva = Math.max(0, (item.cantidad || 0) + delta)
    saveInventarioItem({ ...item, cantidad: nueva })
  }

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      {modal && (
        <Modal
          item={modal.id ? modal : null}
          proveedores={proveedores}
          onClose={() => setModal(null)}
          onSave={async (data) => { await saveInventarioItem(data); setModal(null) }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[80] p-0 md:p-4">
          <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full md:max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-primary" />
              </div>
              <p className="font-barlow font-bold text-on-surface text-lg leading-tight">¿Eliminar "{confirmDelete.nombre}"?</p>
            </div>
            <div className="flex gap-3 pt-1 pb-safe">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-white/50 rounded py-2.5 text-sm font-dm text-on-surface-variant hover:border-on-surface transition-colors">Cancelar</button>
              <button onClick={async () => { await deleteInventarioItem(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 bg-primary text-white rounded py-2.5 text-sm font-dm font-medium hover:bg-red-700 transition-colors">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6 px-0.5 md:px-0">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-on-surface tracking-wide">INVENTARIO</h1>
          <p className="text-on-surface-variant text-xs md:text-sm font-dm mt-1">Stock de materiales de Birth Studio</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
          <Plus size={15} /> <span className="hidden sm:inline">Nuevo</span> ítem
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-4 mb-4 md:mb-6">
        <div className="glass-panel rounded-widget px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-on-surface-variant" /><p className="text-xs font-dm uppercase tracking-wider text-on-surface-variant">Ítems distintos</p></div>
          <p className="font-barlow text-2xl md:text-3xl font-bold text-on-surface">{items.length}</p>
        </div>
        <div className="glass-panel rounded-widget px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-2 mb-1"><Boxes size={16} className="text-green-600" /><p className="text-xs font-dm uppercase tracking-wider text-on-surface-variant">Valor del inventario</p></div>
          <p className="font-barlow text-2xl md:text-3xl font-bold text-green-700">{clp(valorTotal)}</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative flex-1 md:max-w-xs mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar material o proveedor…"
          className="w-full pl-9 pr-3 py-2.5 rounded-full border border-white/50 bg-white/50 text-sm font-dm focus:outline-none focus:border-on-surface" />
      </div>

      {filtrados.length === 0 ? (
        <div className="glass-panel rounded-widget py-16 text-center text-on-surface-variant text-sm font-dm">
          {items.length === 0 ? 'Sin materiales en el inventario. Agrega el primero.' : 'Sin resultados.'}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-2.5">
            {filtrados.map(i => (
              <div key={i.id} className="glass-panel rounded-widget px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-dm font-semibold text-on-surface leading-tight">{i.nombre}</p>
                    <p className="text-[11px] text-on-surface-variant font-dm mt-0.5">
                      {clp(i.precio)}/{tipoLabel(i.tipo)}{i.proveedorId && ` · ${provNombre(i.proveedorId)}`}
                    </p>
                    {i.nota && <p className="text-[11px] text-on-surface-variant/80 font-dm mt-0.5">{i.nota}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setModal({ ...i })} className="p-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirmDelete(i)} className="p-1.5 rounded border border-red-200 text-primary hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/50">
                  <div className="flex items-center gap-2">
                    <button onClick={() => ajustarStock(i, -1)} className="w-7 h-7 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant active:bg-white/70"><Minus size={13} /></button>
                    <span className="font-barlow text-lg font-bold text-on-surface min-w-[3rem] text-center">{i.cantidad ?? 0} <span className="text-xs font-dm text-on-surface-variant">{tipoLabel(i.tipo)}</span></span>
                    <button onClick={() => ajustarStock(i, 1)} className="w-7 h-7 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant active:bg-white/70"><PlusIcon size={13} /></button>
                  </div>
                  <span className="text-sm font-dm font-bold text-green-700">{clp((i.cantidad || 0) * (i.precio || 0))}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block glass-panel rounded-widget overflow-hidden">
            <table className="w-full text-sm font-dm">
              <thead>
                <tr className="border-b border-white/50">
                  <th className="text-left px-5 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Material</th>
                  <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Proveedor</th>
                  <th className="text-right px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Precio unit.</th>
                  <th className="text-center px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Stock</th>
                  <th className="text-right px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Valor</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(i => (
                  <tr key={i.id} className="border-b border-white/50 hover:bg-white/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-on-surface">{i.nombre}</p>
                      {i.nota && <p className="text-[11px] text-on-surface-variant">{i.nota}</p>}
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">{provNombre(i.proveedorId) || '—'}</td>
                    <td className="px-3 py-3 text-right text-on-surface-variant">{clp(i.precio)}/{tipoLabel(i.tipo)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => ajustarStock(i, -1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant hover:bg-white/70"><Minus size={12} /></button>
                        <span className="font-medium text-on-surface min-w-[3.5rem] text-center">{i.cantidad ?? 0} {tipoLabel(i.tipo)}</span>
                        <button onClick={() => ajustarStock(i, 1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant hover:bg-white/70"><PlusIcon size={12} /></button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-green-700">{clp((i.cantidad || 0) * (i.precio || 0))}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setModal({ ...i })} title="Editar" className="p-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface"><Edit2 size={14} /></button>
                        <button onClick={() => setConfirmDelete(i)} title="Eliminar" className="p-1.5 rounded border border-red-200 text-primary hover:border-primary hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
