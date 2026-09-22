import { useState, useEffect, Fragment } from 'react'
import {
  subscribeInventario, saveInventarioItem, deleteInventarioItem, subscribeProveedores,
  registrarMovimiento, subscribeMovimientosItem,
  renombrarGrupoInventario, eliminarGrupoInventario,
} from '../utils/storage'
import { clp, hoy, fechaCorta } from '../utils/formatters'
import {
  Plus, Search, Trash2, Edit2, X, Boxes, Package, Plus as PlusIcon, Minus,
  AlertTriangle, Download, History, ArrowDownToLine, ArrowUpFromLine, ChevronRight,
} from 'lucide-react'

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

const EMPTY = { nombre: '', grupo: '', tipo: 'm2', cantidad: '', stockVerde: '', stockMinimo: '', precio: '', proveedorId: '', nota: '' }

// Orden de los grupos en la vista (menú → submenú). Los grupos que no estén
// aquí van al final; "Otros" siempre último.
const GRUPO_DEFAULT = 'Otros'
const ORDEN_GRUPOS = [
  'Acrílicos', 'Trovicel', 'Aluminio compuesto', 'Lonas e impresión',
  'Adhesivos', 'Cables', 'Calugas LED', 'Cintas LED',
  'Fuentes y eléctrico', 'Insumos y químicos',
]

// Mapea la unidad del proveedor (m², ml…) al tipo del inventario (m2, ml…)
const UNIDAD_A_TIPO = { 'm²': 'm2', 'm2': 'm2', 'ml': 'ml', 'unidad': 'unidad', 'plancha': 'plancha', 'rollo': 'rollo', 'caja': 'caja', 'kilo': 'kilo', 'litro': 'litro', 'set': 'set' }

// Semáforo de stock con dos umbrales editables por ítem (los define el usuario):
//   stockVerde  = umbral óptimo (verde si el stock llega o supera este número)
//   stockMinimo = umbral crítico (rojo si el stock cae a este número o menos)
// Entre ambos → amarillo. Sin umbrales → neutro (solo marca agotado en rojo).
// Devuelve 'verde' | 'amarillo' | 'rojo' | 'ok'.
export const estadoStock = (i) => {
  const c = i.cantidad || 0
  const rojo = i.stockMinimo || 0
  const verde = i.stockVerde || 0
  if (verde > 0 && c >= verde) return 'verde'
  if (c <= 0) return 'rojo'
  if (rojo > 0 && c <= rojo) return 'rojo'
  if (verde > 0) return 'amarillo'
  if (rojo > 0) return 'verde'
  return 'ok'
}

// Color del texto de la cantidad según el semáforo.
const colorEstado = (e) => e === 'verde' ? 'text-green-600' : e === 'amarillo' ? 'text-amber-600' : e === 'rojo' ? 'text-red-600' : 'text-on-surface'

// Punto de color del semáforo (verde / amarillo / rojo / neutro).
function DotEstado({ estado }) {
  const c = estado === 'verde' ? 'bg-green-500' : estado === 'amarillo' ? 'bg-amber-500' : estado === 'rojo' ? 'bg-red-500' : 'bg-on-surface-variant/40'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${c} shrink-0`} />
}

// Etiqueta de texto solo cuando hay alerta (amarillo/rojo). Verde va sin texto.
function BadgeStock({ estado, agotado }) {
  if (estado === 'rojo') return <span className="inline-block px-2 py-0.5 text-[10px] font-dm font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">{agotado ? 'Sin stock' : 'Crítico'}</span>
  if (estado === 'amarillo') return <span className="inline-block px-2 py-0.5 text-[10px] font-dm font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Bajo</span>
  return null
}

// ─── MODAL KARDEX (movimientos de un ítem) ────────────────────────────────────
function KardexModal({ item, onClose }) {
  const [movs, setMovs] = useState([])
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [guardando, setGuardando] = useState(false)

  useEffect(() => subscribeMovimientosItem(item.id, setMovs), [item.id])

  // El saldo más reciente lo da el último movimiento; si no hay, la cantidad del ítem.
  const stock = movs.length ? movs[0].stockResultante : (item.cantidad || 0)

  const registrar = async (e) => {
    e.preventDefault()
    const c = parseFloat(cantidad)
    if (!(c > 0) || guardando) return
    setGuardando(true)
    try {
      await registrarMovimiento({ itemId: item.id, tipo, cantidad: c, motivo: motivo.trim(), fecha })
      setCantidad(''); setMotivo('')
    } catch (err) {
      alert(err.message || 'No se pudo registrar el movimiento')
    } finally {
      setGuardando(false)
    }
  }

  const exportar = () => {
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
    const cab = ['Fecha', 'Tipo', 'Cantidad', 'Motivo', 'Stock resultante', 'Nota']
    const filas = [...movs].reverse().map(m => [
      m.fecha, m.tipo === 'salida' ? 'Salida' : 'Entrada', m.cantidad, m.motivo, m.stockResultante, m.nota || '',
    ].map(esc).join(','))
    const csv = '﻿' + [cab.join(','), ...filas].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `kardex_${(item.nombre || 'item').replace(/\s+/g, '_')}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[70] p-0 md:p-4">
      <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-[32px] md:rounded-t-widget">
          <div className="min-w-0">
            <h2 className="font-barlow text-xl font-bold tracking-wide truncate">MOVIMIENTOS</h2>
            <p className="text-xs text-on-surface-variant font-dm truncate">{item.nombre} · Stock actual: <b>{stock}</b></p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
        </div>

        {/* Registrar un movimiento */}
        <form onSubmit={registrar} className="p-5 space-y-3 border-b border-white/40">
          <div className="inline-flex rounded-full border border-white/60 bg-white/50 p-0.5">
            <button type="button" onClick={() => setTipo('entrada')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-dm transition-colors ${tipo === 'entrada' ? 'bg-green-600 text-white' : 'text-on-surface-variant'}`}>
              <ArrowDownToLine size={14} /> Entrada
            </button>
            <button type="button" onClick={() => setTipo('salida')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-dm transition-colors ${tipo === 'salida' ? 'bg-red-600 text-white' : 'text-on-surface-variant'}`}>
              <ArrowUpFromLine size={14} /> Salida
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Cantidad</label>
              <input type="number" min="0" step="0.01" value={cantidad} onChange={e => setCantidad(e.target.value)} autoFocus
                placeholder="0" className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Motivo</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder={tipo === 'entrada' ? 'Ej. Compra, devolución…' : 'Ej. Uso en trabajo, merma…'}
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>
          <button type="submit" disabled={guardando || !(parseFloat(cantidad) > 0)}
            className="w-full bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors disabled:opacity-45">
            {guardando ? 'Registrando…' : `Registrar ${tipo}`}
          </button>
        </form>

        {/* Historial */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-dm text-sm font-semibold text-on-surface">Historial</h3>
            {movs.length > 0 && (
              <button type="button" onClick={exportar}
                className="flex items-center gap-1.5 text-xs font-dm text-on-surface-variant hover:text-primary">
                <Download size={13} /> Exportar
              </button>
            )}
          </div>
          {movs.length === 0 ? (
            <p className="text-sm text-on-surface-variant font-dm py-6 text-center">Aún no hay movimientos registrados.</p>
          ) : (
            <div className="divide-y divide-white/40">
              {movs.map(m => {
                const salida = m.tipo === 'salida'
                return (
                  <div key={m.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-dm font-semibold ${salida ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {salida ? <ArrowUpFromLine size={10} /> : <ArrowDownToLine size={10} />}{salida ? 'Salida' : 'Entrada'}
                        </span>
                        <span className={`font-barlow font-bold ${salida ? 'text-red-600' : 'text-green-600'}`}>{salida ? '−' : '+'}{m.cantidad}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-dm mt-0.5">{fechaCorta(m.fecha)}{m.motivo ? ` · ${m.motivo}` : ''}</p>
                    </div>
                    <span className="text-xs font-dm text-on-surface-variant shrink-0">Queda: <b className="text-on-surface">{m.stockResultante}</b></span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MODAL CREAR/EDITAR ÍTEM ──────────────────────────────────────────────────
function Modal({ item, proveedores, gruposExistentes = [], onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY, ...(item || {}) })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Materiales de todos los proveedores, en una lista plana para el selector.
  const opcionesProv = proveedores.flatMap(p =>
    (p.materiales || []).map((m, i) => ({
      key: `${p.id}:${i}`, proveedorId: p.id, proveedorNombre: p.nombre,
      nombre: m.nombre, unidad: m.unidad, precio: m.precio,
    })))

  const traerDeProveedor = (key) => {
    const o = opcionesProv.find(x => x.key === key)
    if (!o) return
    const tipo = UNIDAD_A_TIPO[o.unidad]
    setForm(f => ({
      ...f,
      nombre: f.nombre?.trim() ? f.nombre : o.nombre,
      precio: o.precio ?? f.precio,
      proveedorId: o.proveedorId,
      tipo: tipo && TIPOS.some(t => t.v === tipo) ? tipo : f.tipo,
    }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    onSave({
      ...form,
      nombre: form.nombre.trim(),
      grupo: (form.grupo || '').trim(),
      cantidad: parseFloat(form.cantidad) || 0,
      stockVerde: parseFloat(form.stockVerde) || 0,
      stockMinimo: parseFloat(form.stockMinimo) || 0,
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
          {opcionesProv.length > 0 && (
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Traer de proveedor (opcional)</label>
              <select value="" onChange={e => traerDeProveedor(e.target.value)}
                className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white">
                <option value="">Rellenar desde un material de proveedor…</option>
                {opcionesProv.map(o => (
                  <option key={o.key} value={o.key}>{o.proveedorNombre} · {o.nombre} — {clp(o.precio)}/{o.unidad}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Material *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required autoFocus
              placeholder="Ej. Acrílico 3mm blanco, Rollo vinil adhesivo…"
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Grupo / categoría</label>
            <input list="grupos-inv" value={form.grupo} onChange={e => set('grupo', e.target.value)}
              placeholder="Ej. Acrílicos, Cintas LED, Insumos…"
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
            <datalist id="grupos-inv">
              {gruposExistentes.map(g => <option key={g} value={g} />)}
            </datalist>
            <p className="text-[11px] text-on-surface-variant/80 font-dm mt-1">Agrupa los materiales para desplegarlos juntos. Déjalo vacío y quedará en "Otros".</p>
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
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Precio (costo por unidad)</label>
            <input type="number" min="0" value={form.precio} onChange={e => set('precio', e.target.value)}
              placeholder="0"
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white" />
          </div>

          {/* Semáforo de stock: los umbrales los defines tú */}
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5 font-dm uppercase tracking-wider">Alertas de stock (semáforo)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-green-200 bg-green-50/60 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-[11px] font-dm text-green-700">Verde (óptimo) desde</span></div>
                <input type="number" min="0" step="0.01" value={form.stockVerde} onChange={e => set('stockVerde', e.target.value)}
                  placeholder="Ej. 5"
                  className="w-full bg-transparent text-sm font-dm focus:outline-none" />
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50/60 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-[11px] font-dm text-red-700">Rojo (crítico) hasta</span></div>
                <input type="number" min="0" step="0.01" value={form.stockMinimo} onChange={e => set('stockMinimo', e.target.value)}
                  placeholder="Ej. 1"
                  className="w-full bg-transparent text-sm font-dm focus:outline-none" />
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant/80 font-dm mt-1.5">
              🟢 {form.stockVerde || '—'} o más · 🟡 entre medio · 🔴 {form.stockMinimo || '—'} o menos. Déjalos en blanco si ese material no necesita alertas.
            </p>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Proveedor (opcional)</label>
            <select value={form.proveedorId} onChange={e => set('proveedorId', e.target.value)}
              className="w-full border border-white/60 bg-white/50 rounded-full px-4 py-2 text-sm font-dm focus:outline-none focus:border-primary focus:bg-white">
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
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
  const [movModal, setMovModal] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [soloBajo, setSoloBajo] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expandidos, setExpandidos] = useState(() => new Set()) // grupos abiertos (móvil)
  const [categoriaSel, setCategoriaSel] = useState('Todos') // categoría activa (escritorio)

  useEffect(() => {
    const u1 = subscribeInventario(setItems)
    const u2 = subscribeProveedores(setProveedores)
    return () => { u1(); u2() }
  }, [])

  const provNombre = (id) => proveedores.find(p => p.id === id)?.nombre || ''

  // Ítems que necesitan atención (rojo = crítico o amarillo = bajo).
  const porReponer = items.filter(i => { const e = estadoStock(i); return e === 'rojo' || e === 'amarillo' })

  const filtrados = items.filter(i => {
    if (soloBajo) { const e = estadoStock(i); if (e !== 'rojo' && e !== 'amarillo') return false }
    return !busqueda || i.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || provNombre(i.proveedorId).toLowerCase().includes(busqueda.toLowerCase())
  })

  const valorTotal = items.reduce((s, i) => s + (i.cantidad || 0) * (i.precio || 0), 0)

  // Grupos existentes (para sugerir en el modal).
  const gruposExistentes = [...new Set(items.map(i => (i.grupo || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'))

  // Agrupa los materiales filtrados por su grupo, en el orden definido.
  const ordenGrupo = (n) => {
    const k = ORDEN_GRUPOS.indexOf(n)
    return k === -1 ? (n === GRUPO_DEFAULT ? 1000 : 900) : k
  }
  const grupos = (() => {
    const mapa = new Map()
    for (const i of filtrados) {
      const g = (i.grupo || '').toString().trim() || GRUPO_DEFAULT
      if (!mapa.has(g)) mapa.set(g, [])
      mapa.get(g).push(i)
    }
    return [...mapa.keys()]
      .sort((a, b) => ordenGrupo(a) - ordenGrupo(b) || a.localeCompare(b, 'es'))
      .map(g => ({ grupo: g, items: mapa.get(g).sort((x, y) => (x.nombre || '').localeCompare(y.nombre || '', 'es')) }))
  })()

  // Al buscar o filtrar por bajo stock, mostramos todos los grupos abiertos.
  const mostrarTodo = !!busqueda.trim() || soloBajo
  const toggleGrupo = (g) => setExpandidos(prev => {
    const next = new Set(prev)
    if (next.has(g)) next.delete(g); else next.add(g)
    return next
  })

  // Master-detail (escritorio): categoría activa y sus materiales. Si la
  // categoría elegida desaparece del filtro, cae a "Todos".
  const totalItems = grupos.reduce((s, g) => s + g.items.length, 0)
  const catSel = (categoriaSel !== 'Todos' && grupos.some(g => g.grupo === categoriaSel)) ? categoriaSel : 'Todos'
  const contentGrupos = catSel === 'Todos' ? grupos : grupos.filter(g => g.grupo === catSel)
  const contentCount = contentGrupos.reduce((s, g) => s + g.items.length, 0)
  const grupoAlerta = (g) => g.items.some(i => { const e = estadoStock(i); return e === 'rojo' || e === 'amarillo' })

  // Renombrar / eliminar un grupo completo (todos sus materiales).
  const renombrarGrupo = async (grupo) => {
    const nuevo = window.prompt(`Nuevo nombre para el grupo "${grupo}":`, grupo)
    const limpio = (nuevo || '').trim()
    if (!limpio || limpio === grupo) return
    try {
      await renombrarGrupoInventario(grupo, limpio)
      if (categoriaSel === grupo) setCategoriaSel(limpio)
    } catch { window.alert('No se pudo renombrar el grupo.') }
  }
  const eliminarGrupo = async (grupo) => {
    const n = grupos.find(g => g.grupo === grupo)?.items.length || 0
    if (!window.confirm(`¿Eliminar el grupo "${grupo}" y sus ${n} material${n === 1 ? '' : 'es'}?\n\nEsta acción NO se puede deshacer.`)) return
    try {
      await eliminarGrupoInventario(grupo)
      if (categoriaSel === grupo) setCategoriaSel('Todos')
    } catch { window.alert('No se pudo eliminar el grupo.') }
  }

  // El +/- rápido también queda registrado en el kardex como entrada/salida.
  const ajustarStock = (item, delta) => {
    registrarMovimiento({
      itemId: item.id,
      tipo: delta < 0 ? 'salida' : 'entrada',
      cantidad: Math.abs(delta),
      motivo: 'Ajuste rápido',
      fecha: hoy(),
    }).catch(() => {})
  }

  // Exporta el inventario completo a CSV (Google Sheets / Excel).
  const exportarCSV = () => {
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
    const estLabel = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo', ok: '—' }
    const cab = ['Material', 'Se mide por', 'Cantidad', 'Umbral verde', 'Umbral rojo', 'Estado', 'Precio unit', 'Valor', 'Proveedor', 'Nota']
    const filas = items.map(i => [
      i.nombre, tipoLabel(i.tipo), i.cantidad || 0, i.stockVerde || '', i.stockMinimo || '',
      estLabel[estadoStock(i)], i.precio || 0, (i.cantidad || 0) * (i.precio || 0), provNombre(i.proveedorId), i.nota || '',
    ].map(esc).join(','))
    const csv = '﻿' + [cab.join(','), ...filas].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      {modal && (
        <Modal
          item={modal}
          proveedores={proveedores}
          gruposExistentes={gruposExistentes}
          onClose={() => setModal(null)}
          onSave={async (data) => { await saveInventarioItem(data); setModal(null) }}
        />
      )}

      {movModal && (
        <KardexModal item={movModal} onClose={() => setMovModal(null)} />
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
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV} disabled={items.length === 0}
            className="flex items-center gap-2 border border-white/60 bg-white/50 rounded-full px-3.5 py-2.5 text-sm font-dm text-on-surface hover:border-primary transition-colors disabled:opacity-40">
            <Download size={15} /> <span className="hidden sm:inline">Excel/Sheets</span>
          </button>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
            <Plus size={15} /> <span className="hidden sm:inline">Nuevo</span> ítem
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4 mb-4 md:mb-6">
        <div className="glass-panel rounded-widget px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-on-surface-variant" /><p className="text-xs font-dm uppercase tracking-wider text-on-surface-variant">Ítems distintos</p></div>
          <p className="font-barlow text-2xl md:text-3xl font-bold text-on-surface">{items.length}</p>
        </div>
        <div className="glass-panel rounded-widget px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-2 mb-1"><Boxes size={16} className="text-green-600" /><p className="text-xs font-dm uppercase tracking-wider text-on-surface-variant">Valor del inventario</p></div>
          <p className="font-barlow text-2xl md:text-3xl font-bold text-green-700">{clp(valorTotal)}</p>
        </div>
        {/* Alerta de reorden: toca para filtrar solo lo que hay que reponer */}
        <button
          type="button"
          onClick={() => setSoloBajo(v => !v)}
          className={`glass-panel rounded-widget px-4 py-4 md:px-6 md:py-5 text-left col-span-2 md:col-span-1 transition-all ${soloBajo ? 'ring-2 ring-amber-400' : ''} ${porReponer.length ? 'hover:ring-2 hover:ring-amber-300' : ''}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className={porReponer.length ? 'text-amber-600' : 'text-on-surface-variant'} />
            <p className="text-xs font-dm uppercase tracking-wider text-on-surface-variant">Por reponer</p>
          </div>
          <p className={`font-barlow text-2xl md:text-3xl font-bold ${porReponer.length ? 'text-amber-600' : 'text-on-surface'}`}>{porReponer.length}</p>
          <p className="text-[11px] font-dm text-on-surface-variant/80 mt-0.5">
            {porReponer.length === 0 ? 'Todo con stock suficiente' : soloBajo ? 'Filtrando · toca para ver todo' : 'Toca para ver solo estos'}
          </p>
        </button>
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
        {/* Móvil: acordeón de grupos */}
        <div className="md:hidden space-y-2.5">
          {grupos.map(({ grupo, items: itemsGrupo }) => {
            const abierto = mostrarTodo || expandidos.has(grupo)
            const alerta = itemsGrupo.some(i => { const e = estadoStock(i); return e === 'rojo' || e === 'amarillo' })
            return (
              <div key={grupo} className="glass-panel rounded-widget overflow-hidden">
                {/* Cabecera del grupo (menú desplegable) */}
                <button type="button" onClick={() => toggleGrupo(grupo)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/40 transition-colors">
                  <ChevronRight size={16} className={`text-on-surface-variant transition-transform shrink-0 ${abierto ? 'rotate-90' : ''}`} />
                  <span className="font-barlow font-bold text-on-surface tracking-wide flex-1 truncate">{grupo}</span>
                  {alerta && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Hay material por reponer" />}
                  <span className="text-xs font-dm text-on-surface-variant shrink-0">{itemsGrupo.length}</span>
                </button>
                {/* Materiales del grupo (submenú) */}
                {abierto && (
                  <div className="border-t border-white/50 divide-y divide-white/40">
                    {itemsGrupo.map(i => {
                      const e = estadoStock(i)
                      return (
                        <div key={i.id} className="flex items-center gap-2 px-3 md:px-4 py-2.5">
                          <DotEstado estado={e} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-dm text-sm text-on-surface leading-tight truncate">{i.nombre}</p>
                              <BadgeStock estado={e} agotado={(i.cantidad || 0) <= 0} />
                            </div>
                            {i.nota && <p className="text-[11px] text-on-surface-variant/80 font-dm truncate">{i.nota}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => ajustarStock(i, -1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant hover:bg-white/70"><Minus size={12} /></button>
                            <span className={`font-dm text-sm font-semibold min-w-[3.4rem] text-center ${colorEstado(e)}`}>{i.cantidad ?? 0} <span className="text-[10px] text-on-surface-variant">{tipoLabel(i.tipo)}</span></span>
                            <button onClick={() => ajustarStock(i, 1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant hover:bg-white/70"><PlusIcon size={12} /></button>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setMovModal(i)} title="Movimientos" className="p-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface"><History size={13} /></button>
                            <button onClick={() => setModal({ ...i })} title="Editar" className="p-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface"><Edit2 size={13} /></button>
                            <button onClick={() => setConfirmDelete(i)} title="Eliminar" className="p-1.5 rounded border border-red-200 text-primary hover:bg-red-50"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Escritorio: panel de categorías + tabla (master-detail) */}
        <div className="hidden md:flex gap-4 items-start">
          <div className="w-56 shrink-0 glass-panel rounded-widget p-2 sticky top-4">
            <button type="button" onClick={() => setCategoriaSel('Todos')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm font-dm transition-colors ${catSel === 'Todos' ? 'bg-primary/10 text-on-surface font-semibold' : 'text-on-surface-variant hover:bg-white/50'}`}>
              <span className="flex-1 truncate">Todos</span>
              <span className="text-xs opacity-70">{totalItems}</span>
            </button>
            <div className="my-1 border-t border-white/40" />
            {grupos.map(g => (
              <button key={g.grupo} type="button" onClick={() => setCategoriaSel(g.grupo)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm font-dm transition-colors ${catSel === g.grupo ? 'bg-primary/10 text-on-surface font-semibold' : 'text-on-surface-variant hover:bg-white/50'}`}>
                <span className="flex-1 truncate">{g.grupo}</span>
                {grupoAlerta(g) && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Hay material por reponer" />}
                <span className="text-xs opacity-70">{g.items.length}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 glass-panel rounded-widget overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/50">
              <div className="min-w-0">
                <h2 className="font-barlow font-bold text-on-surface tracking-wide text-lg leading-tight truncate">{catSel}</h2>
                <p className="text-[11px] text-on-surface-variant font-dm">{contentCount} {contentCount === 1 ? 'material' : 'materiales'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {catSel !== 'Todos' && catSel !== GRUPO_DEFAULT && (
                  <>
                    <button onClick={() => renombrarGrupo(catSel)} title="Renombrar este grupo"
                      className="flex items-center gap-1.5 border border-black/10 bg-white text-on-surface-variant px-3 py-2 rounded-full text-sm font-dm hover:border-on-surface hover:text-on-surface transition-colors">
                      <Edit2 size={14} /> Editar grupo
                    </button>
                    <button onClick={() => eliminarGrupo(catSel)} title="Eliminar este grupo y sus materiales"
                      className="flex items-center gap-1.5 border border-red-200 bg-red-50/70 text-primary px-3 py-2 rounded-full text-sm font-dm hover:bg-primary hover:text-white transition-colors">
                      <Trash2 size={14} /> Eliminar grupo
                    </button>
                  </>
                )}
                <button onClick={() => setModal({ grupo: catSel === 'Todos' ? '' : catSel })}
                  className="flex items-center gap-2 bg-primary text-on-primary px-3.5 py-2 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
                  <Plus size={15} /> Nuevo
                </button>
              </div>
            </div>
            <table className="w-full text-sm font-dm">
              <thead>
                <tr className="border-b border-white/50 text-xs text-on-surface-variant uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Material</th>
                  <th className="text-left px-3 py-2.5 font-medium">Unidad</th>
                  <th className="text-center px-3 py-2.5 font-medium">Stock</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {contentGrupos.map(g => (
                  <Fragment key={g.grupo}>
                    {catSel === 'Todos' && (
                      <tr className="bg-white/40">
                        <td colSpan={4} className="px-4 py-1.5 font-barlow font-bold text-on-surface tracking-wide text-[11px] uppercase">
                          {g.grupo} <span className="text-on-surface-variant font-dm normal-case">· {g.items.length}</span>
                        </td>
                      </tr>
                    )}
                    {g.items.map(i => {
                      const e = estadoStock(i)
                      return (
                        <tr key={i.id} className="border-b border-white/40 hover:bg-white/40">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <DotEstado estado={e} />
                              <span className="text-on-surface truncate">{i.nombre}</span>
                              <BadgeStock estado={e} agotado={(i.cantidad || 0) <= 0} />
                            </div>
                            {i.nota && <p className="text-[11px] text-on-surface-variant truncate">{i.nota}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{tipoLabel(i.tipo)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => ajustarStock(i, -1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant hover:bg-white/70"><Minus size={12} /></button>
                              <span className={`font-semibold min-w-[3rem] text-center ${colorEstado(e)}`}>{i.cantidad ?? 0}</span>
                              <button onClick={() => ajustarStock(i, 1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-white/50 text-on-surface-variant hover:bg-white/70"><PlusIcon size={12} /></button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => setMovModal(i)} title="Movimientos (historial)"
                                className="p-2 rounded-lg border border-black/10 bg-white text-on-surface-variant hover:border-on-surface hover:text-on-surface transition-colors"><History size={15} /></button>
                              <button onClick={() => setModal({ ...i })} title="Editar material"
                                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-black/10 bg-white text-on-surface-variant hover:border-on-surface hover:text-on-surface transition-colors">
                                <Edit2 size={15} /><span className="text-xs font-dm">Editar</span>
                              </button>
                              <button onClick={() => setConfirmDelete(i)} title="Eliminar material"
                                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-red-200 bg-red-50/70 text-primary hover:bg-primary hover:text-white transition-colors">
                                <Trash2 size={15} /><span className="text-xs font-dm">Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
