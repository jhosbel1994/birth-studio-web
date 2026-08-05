import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { clp } from '../../utils/formatters'
import {
  subscribeMateriales, saveMaterial, deleteMaterial, seedMaterialesSiVacio,
  getMultiplicadorMateriales, setMultiplicadorMateriales,
} from '../../utils/storage'
import { calcularCostoMaterial, calcularMateriales } from '../../utils/materialesCalc'
import {
  MATERIALES_SEED, MULTIPLICADORES_MATERIALES, MULTIPLICADOR_MATERIALES_DEFAULT, UNIDADES_MATERIAL,
} from '../../data/materiales'

const normalizar = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

// ─── FILA DE MATERIAL — checkbox + cantidad + (precio manual si aplica) ────
function FilaMaterial({ material, estado, onToggle, onCantidad, onPrecioManual, onEdit, onDelete }) {
  const { subtotal } = calcularCostoMaterial(material, estado)
  const sinPrecio = material.precio == null
  const activo = !!estado?.activo

  return (
    <div className={`flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-birth-gray-2 transition-opacity ${activo ? '' : 'opacity-60'}`}>
      <label className="flex items-center gap-2.5 flex-1 min-w-[11rem] cursor-pointer">
        <input type="checkbox" checked={activo} onChange={e => onToggle(e.target.checked)} className="accent-birth-black shrink-0" />
        <span className="min-w-0">
          <span className="block text-sm font-dm font-medium text-birth-black truncate">{material.nombre}</span>
          <span className="block text-[11px] text-birth-gray-3 font-dm">
            {sinPrecio ? 'Sin precio fijo — ingresar costo' : `${clp(material.precio)} / ${material.unidad}`}
            {material.nota ? ` · ${material.nota}` : ''}
          </span>
        </span>
      </label>

      <input
        type="number" min="0" step="0.01" value={estado?.cantidad ?? ''} disabled={!activo}
        onChange={e => onCantidad(e.target.value)} placeholder="Cant."
        className="w-16 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
      />

      {sinPrecio && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-birth-gray-3 text-xs">$</span>
          <input
            type="number" min="0" value={estado?.precioManual ?? ''} disabled={!activo}
            onChange={e => onPrecioManual(e.target.value)} placeholder="Costo"
            className="w-20 text-right border border-birth-gray-2 rounded px-1.5 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
          />
        </div>
      )}

      <span className="text-sm font-barlow font-bold w-20 text-right shrink-0">{subtotal > 0 ? clp(subtotal) : '—'}</span>

      <button onClick={onEdit} className="p-1.5 text-birth-gray-3 hover:text-birth-black shrink-0"><Pencil size={13} /></button>
      <button onClick={onDelete} className="p-1.5 text-birth-gray-3 hover:text-birth-red shrink-0"><Trash2 size={13} /></button>
    </div>
  )
}

// ─── FORMULARIO NUEVO/EDITAR MATERIAL ──────────────────────────────────────
function FormMaterial({ form, setForm, onSave, onCancel }) {
  return (
    <form onSubmit={onSave} className="p-4 border-b border-birth-gray-2 space-y-3 bg-birth-gray">
      <p className="text-xs font-dm font-medium text-birth-gray-4 uppercase tracking-wider">
        {form.id ? 'Editar material' : 'Nuevo material'}
      </p>
      <input
        value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
        placeholder="Nombre (ej: Cloroformo)" required autoFocus
        className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.unidad || ''} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
          placeholder="Unidad" required list="unidades-material"
          className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white"
        />
        <input
          type="number" min="0" value={form.precio ?? ''} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
          placeholder="Precio (vacío = a convenir)"
          className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white"
        />
      </div>
      <datalist id="unidades-material">
        {UNIDADES_MATERIAL.map(u => <option key={u} value={u} />)}
      </datalist>
      <input
        value={form.nota || ''} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
        placeholder="Nota (opcional, ej: cada 200 unidades aprox)"
        className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white"
      />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-birth-black text-white py-2 rounded text-sm font-dm hover:bg-birth-red transition-colors">
          {form.id ? 'Guardar cambios' : 'Agregar material'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 border border-birth-gray-2 rounded text-sm font-dm text-birth-gray-4 hover:border-birth-black">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── PANEL PRINCIPAL ────────────────────────────────────────────────────────
export default function MaterialesPanel() {
  const [materiales, setMateriales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [query, setQuery] = useState('')
  const [itemsState, setItemsState] = useState({})
  const [form, setForm] = useState(null)
  const [multiplicador, setMultiplicadorState] = useState(MULTIPLICADOR_MATERIALES_DEFAULT)
  const [guardadoOk, setGuardadoOk] = useState(false)

  useEffect(() => {
    let unsub = () => {}
    seedMaterialesSiVacio(MATERIALES_SEED).finally(() => {
      unsub = subscribeMateriales(list => { setMateriales(list); setCargando(false) })
    })
    getMultiplicadorMateriales().then(setMultiplicadorState)
    return () => unsub()
  }, [])

  const setActivo = (id, activo) =>
    setItemsState(s => ({ ...s, [id]: { ...s[id], activo, cantidad: s[id]?.cantidad ?? '1' } }))
  const setCantidad = (id, cantidad) => setItemsState(s => ({ ...s, [id]: { ...s[id], cantidad } }))
  const setPrecioManual = (id, precioManual) => setItemsState(s => ({ ...s, [id]: { ...s[id], precioManual } }))

  const handleSaveForm = async (e) => {
    e.preventDefault()
    if (!form.nombre?.trim() || !form.unidad?.trim()) return
    await saveMaterial({
      ...form,
      precio: form.precio === '' || form.precio == null ? null : parseFloat(form.precio),
    })
    setForm(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este material de la base de datos?')) return
    await deleteMaterial(id)
    setItemsState(s => { const copia = { ...s }; delete copia[id]; return copia })
  }

  const handleMultiplicadorDefault = () => {
    setMultiplicadorMateriales(parseFloat(multiplicador) || 0).catch(() => {})
    setGuardadoOk(true)
    setTimeout(() => setGuardadoOk(false), 1500)
  }

  const filtrados = query.trim()
    ? materiales.filter(m => normalizar(m.nombre).includes(normalizar(query.trim())))
    : materiales

  const resultado = useMemo(
    () => calcularMateriales(materiales, itemsState, multiplicador),
    [materiales, itemsState, multiplicador]
  )

  const construirDescripcion = () => {
    const activos = materiales
      .filter(m => itemsState[m.id]?.activo)
      .map(m => {
        const cant = itemsState[m.id]?.cantidad
        return `${m.nombre}${cant && cant !== '1' ? ` ×${cant}` : ''}`
      })
    const base = activos.length ? `Materiales: ${activos.join(', ')}` : 'Materiales'
    return `${base} | Multiplicador ×${multiplicador}`
  }

  const handleAgregar = () => {
    if (!resultado.ventaNeta) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: {
        descripcion: construirDescripcion(),
        cantidad: 1,
        precioUnitario: resultado.ventaNeta,
        total: resultado.ventaNeta,
        materialesSnapshot: { itemsState, multiplicador, resultado },
      },
    }))
  }

  return (
    <div className="lg:grid lg:grid-cols-3 lg:gap-4 lg:p-4 lg:items-start">
      {/* ── Base de datos de materiales ── */}
      <div className="lg:col-span-2 lg:border lg:border-birth-gray-2 lg:rounded">
        <div className="px-4 py-2 bg-white border-b border-birth-gray-2">
          <input
            value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar material..."
            className="w-full border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black"
          />
        </div>

        {cargando ? (
          <p className="p-4 text-sm text-birth-gray-3 font-dm">Cargando materiales...</p>
        ) : filtrados.length === 0 ? (
          <p className="p-4 text-sm text-birth-gray-3 font-dm">Sin resultados{query ? ` para "${query}"` : ''}.</p>
        ) : (
          filtrados.map(m => (
            <FilaMaterial
              key={m.id} material={m} estado={itemsState[m.id]}
              onToggle={v => setActivo(m.id, v)}
              onCantidad={v => setCantidad(m.id, v)}
              onPrecioManual={v => setPrecioManual(m.id, v)}
              onEdit={() => setForm({ ...m })}
              onDelete={() => handleDelete(m.id)}
            />
          ))
        )}

        {form !== null ? (
          <FormMaterial form={form} setForm={setForm} onSave={handleSaveForm} onCancel={() => setForm(null)} />
        ) : (
          <div className="px-4 py-3">
            <button onClick={() => setForm({})}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-birth-gray-3 rounded py-2.5 text-sm font-dm text-birth-gray-4 hover:border-birth-black hover:text-birth-black transition-colors">
              <Plus size={14} /> Agregar material nuevo
            </button>
          </div>
        )}
      </div>

      {/* ── Multiplicador + resumen ── */}
      <div className="mt-4 lg:mt-0 lg:sticky lg:top-0 lg:self-start bg-white border border-birth-gray-2 rounded divide-y divide-birth-gray-2">
        <div className="p-4 space-y-3">
          <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">Multiplicador de venta</p>
          <div className="flex gap-1.5">
            {MULTIPLICADORES_MATERIALES.map(v => (
              <button key={v} onClick={() => setMultiplicadorState(v)}
                className={`flex-1 py-1.5 rounded text-xs font-dm border transition-colors ${multiplicador === v ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                ×{v}
              </button>
            ))}
            <input
              type="number" min="0" step="0.1" value={multiplicador}
              onChange={e => setMultiplicadorState(parseFloat(e.target.value) || 0)}
              className="w-16 text-center border-2 border-birth-black rounded px-1 py-1.5 text-xs font-dm font-bold focus:outline-none focus:border-birth-red"
            />
          </div>
          <button onClick={handleMultiplicadorDefault} className="text-[11px] font-dm text-birth-red hover:underline">
            {guardadoOk ? 'Guardado ✓' : `Guardar ×${multiplicador} como predeterminado`}
          </button>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider mb-1">Resumen</p>
          <div className="flex justify-between text-sm font-dm text-birth-gray-4">
            <span>Costo directo</span><span>{clp(resultado.costoTotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-dm text-birth-gray-4">
            <span>Utilidad</span><span>{clp(resultado.utilidad)}</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-birth-black rounded px-4 py-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-dm text-white/60">Precio de venta (neto)</span>
              <span className="font-barlow font-bold text-xl text-white">{clp(resultado.ventaNeta)}</span>
            </div>
            <div className="flex justify-between text-xs font-dm text-white/60">
              <span>+ IVA 19%</span><span className="text-white/80">{clp(resultado.ventaIva)}</span>
            </div>
            <div className="flex justify-between text-xs font-dm text-white/60">
              <span>Anticipo 50%</span><span className="text-white/80">{clp(resultado.anticipo)}</span>
            </div>
          </div>

          <button onClick={handleAgregar} disabled={!resultado.ventaNeta}
            className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-3 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Plus size={15} /> Agregar a cotización
          </button>
        </div>
      </div>
    </div>
  )
}
