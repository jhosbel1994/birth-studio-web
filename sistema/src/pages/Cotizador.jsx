import { useState, useEffect, useContext, createContext } from 'react'
import {
  CATEGORIAS, PRODUCTOS, MULTIPLICADORES,
  TARJETAS, BANDERAS_VELA, VOLANTES,
  BASTIDORES_PROVEEDOR, BASTIDORES_BIRTH, PALOMAS, PENDONES,
} from '../data/productos'
import {
  getClientes, saveCliente, saveCotizacion, getClienteById, getMiscelaneos, saveMiscelaneo, deleteMiscelaneo,
  getPreciosProductos, savePreciosProductos, getMultiplicadoresInstalacion, saveMultiplicadoresInstalacion,
} from '../utils/storage'
import { generarCotizacionPDF } from '../utils/pdf'
import { enviarCotizacionEmailJS, abrirGmailCompose } from '../utils/email'
import { clp, hoy, sumarDias } from '../utils/formatters'
import CosteoLetrasPanel from '../components/CosteoLetras/CosteoLetrasPanel'
import MaterialesPanel from '../components/Materiales/MaterialesPanel'
import AdjuntarPrototipo from '../components/AdjuntarPrototipo'
import {
  Plus, Trash2, RotateCcw, ArrowRight,
  User, UserPlus, X, Download, Save, Mail, Eye, Pencil,
  LayoutGrid, List, Search,
} from 'lucide-react'

// ─── CONTEXTOS: precios del catálogo y multiplicadores de instalación ──────
// Ambos son editables por el usuario y persisten en Firestore (settings/).
// Se proveen una sola vez en <Cotizador> y cualquier panel anidado los
// consume sin necesidad de pasarlos por props en cada nivel.
const PreciosContext = createContext({ precios: {}, setPrecio: () => {} })
const MultiplicadoresContext = createContext({ multiplicadores: MULTIPLICADORES, setValorMultiplicador: () => {} })

// Fila de instalación reutilizable: botones ×valor (clic = seleccionar,
// doble clic = editar el valor guardado). Reemplaza los bloques repetidos
// de "MULTIPLICADORES.map(...)" en cada panel.
function MultiplicadorButtons({ multiplicador, setMultiplicador, label = 'Instalación' }) {
  const { multiplicadores, setValorMultiplicador } = useContext(MultiplicadoresContext)
  const [editando, setEditando] = useState(null)
  const [valorInput, setValorInput] = useState('')

  const guardarEdicion = () => {
    const v = parseFloat(valorInput)
    if (editando && !isNaN(v) && v > 0) {
      const anterior = multiplicadores.find(m => m.id === editando)?.valor
      setValorMultiplicador(editando, v)
      if (multiplicador === anterior) setMultiplicador(v)
    }
    setEditando(null)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label && <span className="text-xs text-on-surface-variant font-dm uppercase tracking-wider shrink-0">{label}:</span>}
      <div className="flex gap-1 flex-wrap">
        {multiplicadores.map(m => editando === m.id ? (
          <input key={m.id} type="number" min="0" step="0.1" autoFocus value={valorInput}
            onChange={e => setValorInput(e.target.value)}
            onBlur={guardarEdicion}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="w-14 text-center border-2 border-primary rounded px-1 py-1 text-xs font-dm focus:outline-none"
          />
        ) : (
          <button key={m.id}
            onClick={() => setMultiplicador(m.valor)}
            onDoubleClick={() => { setEditando(m.id); setValorInput(String(m.valor)) }}
            title={`${m.label} — doble clic para editar el valor`}
            className={`px-2.5 py-1 rounded text-xs font-dm border transition-colors ${multiplicador === m.valor ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
            ×{m.valor}
          </button>
        ))}
      </div>
      <span className="text-xs text-on-surface-variant font-dm">
        {multiplicadores.find(m => m.valor === multiplicador)?.label}
      </span>
    </div>
  )
}

// ─── BARRA DE CLIENTE (top) ────────────────────────────────────────────────
function ClienteBar({ clienteId, setClienteId, clienteNombre, setClienteNombre, clientes, onClienteGuardado }) {
  const [modo, setModo] = useState('existente') // 'existente' | 'rapido'
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [guardar, setGuardar] = useState(false)

  const handleSeleccionar = (id) => {
    const c = clientes.find(c => c.id === id)
    setClienteId(id)
    setClienteNombre(c ? c.nombre : '')
  }

  // Actualiza nombre en tiempo real sin necesidad de clic en Confirmar
  const handleNombreChange = (v) => {
    setNombre(v)
    if (!guardar) {
      setClienteId('')
      setClienteNombre(v)
    }
  }

  const handleGuardarEnBD = async () => {
    if (!nombre.trim()) return
    const c = await saveCliente({ nombre, rut, empresa: '', ciudad: '', correo: '', telefono: '' })
    setClienteId(c.id)
    setClienteNombre(c.nombre)
    onClienteGuardado()
    setGuardar(false)
  }

  return (
    <div className="glass-panel rounded-widget px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
      <span className="text-xs text-on-surface-variant font-dm uppercase tracking-wider shrink-0">Cliente:</span>

      {/* Toggle modo */}
      <div className="flex gap-1 shrink-0">
        <button onClick={() => setModo('existente')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-dm border transition-colors ${modo === 'existente' ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
          <User size={12} /> Existente
        </button>
        <button onClick={() => setModo('rapido')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-dm border transition-colors ${modo === 'rapido' ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
          <UserPlus size={12} /> Rápido
        </button>
      </div>

      {/* Campos según modo */}
      {modo === 'existente' ? (
        <select value={clienteId} onChange={e => handleSeleccionar(e.target.value)}
          className="flex-1 min-w-40 max-w-xs border border-white/50 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface bg-white">
          <option value="">Sin cliente</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` — ${c.empresa}` : ''}</option>)}
        </select>
      ) : (
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <input
            value={nombre}
            onChange={e => handleNombreChange(e.target.value)}
            placeholder="Nombre *"
            className="border border-white/50 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface w-36"
          />
          <input value={rut} onChange={e => setRut(e.target.value)} placeholder="RUT"
            className="border border-white/50 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface w-28" />
          <button
            onClick={handleGuardarEnBD}
            disabled={!nombre.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-on-surface text-white rounded text-xs font-dm hover:bg-primary transition-colors disabled:opacity-40">
            <Save size={11} /> Guardar en BD
          </button>
        </div>
      )}

      {/* Badge cliente activo */}
      {clienteNombre && (
        <div className="flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded shrink-0">
          <User size={12} className="text-on-surface-variant" />
          <span className="text-xs font-dm font-medium text-on-surface">{clienteNombre}</span>
          <button onClick={() => { setClienteId(''); setClienteNombre('') }} className="text-on-surface-variant hover:text-primary ml-1">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── FILA DE PRODUCTO (para categorías genéricas) ─────────────────────────
function ProductoFila({ producto, multiplicador }) {
  const [d1, setD1] = useState('')
  const [d2, setD2] = useState('')
  const [added, setAdded] = useState(false)
  const [editandoPrecio, setEditandoPrecio] = useState(false)
  const [precioInput, setPrecioInput] = useState('')
  const { precios, setPrecio } = useContext(PreciosContext)

  const u = producto.unidad
  const precioBase = precios[producto.id] ?? producto.precio
  const tieneOverride = precios[producto.id] != null && precios[producto.id] !== producto.precio

  let total = 0
  if (u === 'm2') {
    const area = parseFloat(d1 || 0) * parseFloat(d2 || 0)
    if (area > 0) total = producto.aplicaMultiplicador
      ? Math.round(area * precioBase * multiplicador)
      : Math.round(area * precioBase)
  } else if (u === 'ml') {
    const ml = parseFloat(d1 || 0)
    if (ml > 0) total = producto.aplicaMultiplicador
      ? Math.round(ml * precioBase * multiplicador)
      : Math.round(ml * precioBase)
  } else if (u === 'libre') {
    total = parseFloat(d1 || 0)
  } else {
    const qty = parseFloat(d1 || 0) || 1
    if (precioBase > 0) total = producto.aplicaMultiplicador
      ? Math.round(qty * precioBase * multiplicador)
      : Math.round(qty * precioBase)
  }

  const canAdd = total > 0

  const guardarPrecio = () => {
    const v = parseFloat(precioInput)
    if (!isNaN(v) && v >= 0) setPrecio(producto.id, v)
    setEditandoPrecio(false)
  }

  const handleAdd = () => {
    if (!canAdd) return
    let desc = producto.nombre
    if (u === 'm2') desc += ` ${d1}×${d2}m`
    else if (u === 'ml') desc += ` ${d1}ml`
    else if (!['libre', 'proyecto', 'año'].includes(u) && d1 && parseFloat(d1) > 1) desc += ` ×${d1}`

    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: { descripcion: desc, cantidad: 1, precioUnitario: total, total }
    }))

    // Flash visual
    setAdded(true)
    setTimeout(() => setAdded(false), 600)
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 px-4 py-2.5 border-b border-white/50 transition-colors ${added ? 'bg-green-50' : 'hover:bg-white/50'}`}>
      {/* Nombre + precio unitario — fila completa en móvil */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-dm font-medium leading-snug text-on-surface">{producto.nombre}</p>
        {precioBase > 0 && (
          editandoPrecio ? (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-on-surface-variant text-[11px]">$</span>
              <input
                type="number" min="0" autoFocus value={precioInput}
                onChange={e => setPrecioInput(e.target.value)}
                onBlur={guardarPrecio}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                onClick={e => e.stopPropagation()}
                className="w-20 border border-on-surface rounded px-1 py-0.5 text-[11px] font-dm focus:outline-none"
              />
              <span className="text-on-surface-variant text-[11px]">/{u === 'libre' ? 'libre' : u}</span>
            </div>
          ) : (
            <p className="text-[11px] text-on-surface-variant font-dm">
              <button type="button"
                onClick={() => { setPrecioInput(String(precioBase)); setEditandoPrecio(true) }}
                className="hover:text-on-surface hover:underline">
                {clp(precioBase)}/{u === 'libre' ? 'libre' : u}
              </button>
              {tieneOverride && <span className="ml-1 text-primary" title="Precio modificado">●</span>}
              {producto.aplicaMultiplicador && <span className="ml-1 text-primary">×{multiplicador}</span>}
            </p>
          )
        )}
      </div>

      {/* Inputs + total + botón — segunda fila en móvil */}
      <div className="flex items-center gap-2">
        {/* Inputs según unidad */}
        {u === 'm2' && (
          <div className="flex items-center gap-1 shrink-0">
            <input type="number" min="0" step="0.01" value={d1} onChange={e => setD1(e.target.value)}
              placeholder="Ancho" className="w-14 text-center border border-white/50 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
            <span className="text-on-surface-variant text-xs">×</span>
            <input type="number" min="0" step="0.01" value={d2} onChange={e => setD2(e.target.value)}
              placeholder="Alto" className="w-14 text-center border border-white/50 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
        )}
        {u === 'ml' && (
          <input type="number" min="0" step="0.01" value={d1} onChange={e => setD1(e.target.value)}
            placeholder="mt" className="w-16 text-center border border-white/50 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
        )}
        {['unidad', 'plancha', 'hora', 'set', 'dia'].includes(u) && (
          <input type="number" min="1" value={d1 || ''} onChange={e => setD1(e.target.value)}
            placeholder="1" className="w-14 text-center border border-white/50 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
        )}
        {u === 'libre' && (
          <input type="number" min="0" value={d1} onChange={e => setD1(e.target.value)}
            placeholder="$" className="w-20 text-right border border-white/50 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
        )}
        {['proyecto', 'año'].includes(u) && (
          <span className="text-xs text-on-surface-variant font-dm w-14 text-right">{clp(precioBase)}</span>
        )}

        {/* Total preview */}
        <span className={`text-sm font-dm font-bold w-20 text-right shrink-0 ${total > 0 ? 'text-on-surface' : 'text-on-surface-variant/40'}`}>
          {total > 0 ? clp(total) : '—'}
        </span>

        {/* Botón agregar */}
        <button onClick={handleAdd} disabled={!canAdd}
          className={`w-8 h-8 flex items-center justify-center rounded shrink-0 transition-all ${canAdd ? 'bg-primary text-white hover:bg-red-700' : 'bg-white/50-2 text-on-surface-variant cursor-not-allowed'}`}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── UTILIDAD: búsqueda sin importar tildes ni mayúsculas ─────────────────
const normalizar = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

// ─── DATOS AFICHES ACRÍLICOS ───────────────────────────────────────────────
const AFICHES_MEDIDAS = [
  { label: '40×40cm',   m2: 0.16 },
  { label: '50×50cm',   m2: 0.25 },
  { label: '60×60cm',   m2: 0.36 },
  { label: '70×70cm',   m2: 0.49 },
  { label: '80×80cm',   m2: 0.64 },
  { label: '90×90cm',   m2: 0.81 },
  { label: '100×100cm', m2: 1.00 },
  { label: '110×110cm', m2: 1.21 },
  { label: '120×120cm', m2: 1.44 },
  { label: '130×130cm', m2: 1.69 },
  { label: '140×140cm', m2: 1.96 },
  { label: '150×150cm', m2: 2.25 },
]

const PRECIO_M2_AFICHES = {
  simple:       { '3mm': 95000,  '5mm': 125000 },
  adhesivo:     { '3mm': 106000, '5mm': 136000 },
  retro:        { '3mm': 125000, '5mm': 155000 },
  retroRelieve: { '3mm': 150000, '5mm': 180000 },
  relieve:      { '3mm': 130000, '5mm': 157000 },
}
const AFICHES_TIPOS = [
  { id: 'simple',       label: 'Simple' },
  { id: 'adhesivo',     label: 'Con adhesivo' },
  { id: 'retro',        label: 'Con retroiluminación' },
  { id: 'retroRelieve', label: 'Retroiluminado + relieve' },
  { id: 'relieve',      label: 'Relieve sin retroiluminación' },
]

// ─── PANEL AFICHES ACRÍLICOS ───────────────────────────────────────────────
function AfichesAcrilicosPanel() {
  const [grosor, setGrosor]             = useState('3mm')
  const [tipo, setTipo]                 = useState('simple')
  const [medidaIdx, setMedidaIdx]       = useState(null)
  const [conDistPeq, setConDistPeq]         = useState(false)
  const [cantDistPeq, setCantDistPeq]       = useState(4)
  const [conDistGrande, setConDistGrande]   = useState(false)
  const [cantDistGrande, setCantDistGrande] = useState(4)
  const [instalacion, setInstalacion]       = useState('ninguna')
  const [andamioCuerpos, setAndamioCuerpos] = useState(1)
  const [conIva, setConIva]             = useState(false)
  // Personalizados por m² — tipo del panel, grosor propio
  const [cGrosor, setCGrosor]     = useState('3mm')
  const [cForma, setCForma]       = useState('rectangular')
  const [cAncho, setCAncho]       = useState('')
  const [cAlto, setCAlto]         = useState('')
  const [cDiam, setCDiam]         = useState('')
  const [cPrecioM2, setCPrecioM2] = useState('')

  const precioM2Sugerido = PRECIO_M2_AFICHES[tipo]?.[cGrosor] || 0
  const precioM2Custom = parseFloat(cPrecioM2) || precioM2Sugerido

  useEffect(() => {
    setCPrecioM2(String(PRECIO_M2_AFICHES[tipo]?.[cGrosor] || ''))
  }, [tipo, cGrosor])

  function precioMedida(m) {
    return Math.round(m.m2 * (PRECIO_M2_AFICHES[tipo]?.[grosor] || 0))
  }

  // costDist antes de cualquier cálculo que lo use
  const medida   = medidaIdx !== null ? AFICHES_MEDIDAS[medidaIdx] : null
  const base     = medida ? precioMedida(medida) : 0
  const costDist = (conDistPeq ? cantDistPeq * 1500 : 0) + (conDistGrande ? cantDistGrande * 2500 : 0)
  let subtotal   = base + costDist
  if (instalacion === 'sin_andamio') subtotal = Math.round(subtotal * 1.5)
  if (instalacion === 'con_andamio') subtotal = Math.round(subtotal * 1.5) + andamioCuerpos * 5000
  const iva   = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva

  // Calculador personalizado — ahora costDist ya está definido
  const cArea   = cForma === 'rectangular'
    ? (parseFloat(cAncho) || 0) * (parseFloat(cAlto) || 0) / 10000
    : Math.PI * Math.pow((parseFloat(cDiam) || 0) / 2, 2) / 10000
  const cPrecioBase = cArea > 0 ? Math.round(cArea * precioM2Custom) : 0
  let cSubtotal = cPrecioBase > 0 ? cPrecioBase + costDist : 0
  if (cSubtotal > 0) {
    if (instalacion === 'sin_andamio') cSubtotal = Math.round(cSubtotal * 1.5)
    if (instalacion === 'con_andamio') cSubtotal = Math.round(cSubtotal * 1.5) + andamioCuerpos * 5000
  }

  const handleAddCustom = () => {
    if (!cSubtotal) return
    const tipoLabel = AFICHES_TIPOS.find(t => t.id === tipo)?.label
    const forma = cForma === 'rectangular' ? `${cAncho}×${cAlto}cm` : `Ø${cDiam}cm`
    const adics = []
    if (conDistPeq) adics.push(`${cantDistPeq} dist. pequeños`)
    if (conDistGrande) adics.push(`${cantDistGrande} dist. grandes`)
    if (instalacion === 'sin_andamio') adics.push('instalación s/andamio')
    if (instalacion === 'con_andamio') adics.push(`instalación c/andamio ${andamioCuerpos} cuerpos`)
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: {
        descripcion: `Acrílico personalizado ${forma} ${cGrosor} — ${tipoLabel}${adics.length ? ' | ' + adics.join(', ') : ''} (${cArea.toFixed(3)} m²)`,
        cantidad: 1, precioUnitario: cSubtotal, total: cSubtotal,
      }
    }))
    setCAncho(''); setCAlto(''); setCDiam('')
  }

  const handleAdd = () => {
    if (!medida || !subtotal) return
    const tipoLabel = AFICHES_TIPOS.find(t => t.id === tipo).label
    const adics = []
    if (conDistPeq) adics.push(`${cantDistPeq} distanciadores pequeños`)
    if (conDistGrande) adics.push(`${cantDistGrande} distanciadores grandes`)
    if (instalacion === 'sin_andamio') adics.push('instalación s/andamio')
    if (instalacion === 'con_andamio') adics.push(`instalación c/andamio ${andamioCuerpos} cuerpos`)
    const desc = `Afiche acrílico ${medida.label} ${grosor} — ${tipoLabel}${adics.length ? ' | ' + adics.join(', ') : ''}`
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: { descripcion: desc, cantidad: 1, precioUnitario: subtotal, total: subtotal }
    }))
    setMedidaIdx(null)
  }

  return (
    <div className="divide-y divide-white/40">

      {/* ── Filtros ── */}
      <div className="p-4 space-y-4">
        {/* Grosor */}
        <div>
          <p className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider mb-2">Grosor</p>
          <div className="flex gap-1.5">
            {['3mm', '5mm'].map(g => (
              <button key={g} onClick={() => setGrosor(g)}
                className={`px-5 py-1.5 rounded text-sm font-dm border transition-colors ${grosor === g ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
                {g}
              </button>
            ))}
          </div>
          {grosor === '5mm' && (
            <p className="text-[11px] text-primary font-dm mt-1.5">+$15.000 × m² sobre precio base</p>
          )}
        </div>

        {/* Tipo */}
        <div>
          <p className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider mb-2">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {AFICHES_TIPOS.map(t => (
              <button key={t.id} onClick={() => setTipo(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-dm border transition-colors ${tipo === t.id ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabla de precios ── */}
      <div>
        <div className="px-4 py-2 bg-white/50">
          <p className="text-[10px] font-dm font-bold uppercase tracking-wider text-on-surface-variant">
            Selecciona medida — {AFICHES_TIPOS.find(t => t.id === tipo)?.label} · {grosor}
          </p>
        </div>
        {AFICHES_MEDIDAS.map((m, i) => {
          const precio = precioMedida(m)
          const sel    = medidaIdx === i
          return (
            <button key={i} onClick={() => setMedidaIdx(sel ? null : i)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/50 text-left transition-colors ${sel ? 'bg-on-surface' : 'hover:bg-white/50'}`}>
              <div className="flex-1">
                <p className={`text-sm font-dm font-semibold ${sel ? 'text-white' : 'text-on-surface'}`}>{m.label}</p>
                <p className={`text-[11px] font-dm ${sel ? 'text-white/50' : 'text-on-surface-variant'}`}>{m.m2} m²{grosor === '5mm' ? ` · +${clp(Math.round(m.m2*15000))}` : ''}</p>
              </div>
              <span className={`font-barlow font-bold text-lg ${sel ? 'text-white' : 'text-on-surface'}`}>{clp(precio)}</span>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${sel ? 'border-white' : 'border-white/50'}`}>
                {sel && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Adicionales ── */}
      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider">Adicionales</p>

        {/* Distanciadores pequeños */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={conDistPeq} onChange={e => setConDistPeq(e.target.checked)} className="accent-primary" />
          <span className="text-sm font-dm text-on-surface-variant flex-1">Distanciadores pequeños — $1.500 c/u</span>
          {conDistPeq && (
            <input type="number" min="1" value={cantDistPeq} onChange={e => setCantDistPeq(parseInt(e.target.value) || 1)}
              className="w-16 text-center border border-white/50 rounded px-2 py-1 text-sm font-dm focus:outline-none focus:border-on-surface" />
          )}
        </label>
        {/* Distanciadores grandes */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={conDistGrande} onChange={e => setConDistGrande(e.target.checked)} className="accent-primary" />
          <span className="text-sm font-dm text-on-surface-variant flex-1">Distanciadores grandes — $2.500 c/u</span>
          {conDistGrande && (
            <input type="number" min="1" value={cantDistGrande} onChange={e => setCantDistGrande(parseInt(e.target.value) || 1)}
              className="w-16 text-center border border-white/50 rounded px-2 py-1 text-sm font-dm focus:outline-none focus:border-on-surface" />
          )}
        </label>

        {/* Instalación */}
        <div className="space-y-2">
          {[
            { id: 'ninguna',     label: 'Sin instalación' },
            { id: 'sin_andamio', label: 'Instalación sin andamio (× 1.5)' },
            { id: 'con_andamio', label: 'Instalación con andamio (× 1.5 + cuerpos)' },
          ].map(op => (
            <label key={op.id} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="af-inst" value={op.id} checked={instalacion === op.id}
                onChange={() => setInstalacion(op.id)} className="accent-primary" />
              <span className="text-sm font-dm text-on-surface-variant flex-1">{op.label}</span>
              {op.id === 'con_andamio' && instalacion === 'con_andamio' && (
                <div className="flex items-center gap-1.5">
                  <input type="number" min="1" value={andamioCuerpos} onChange={e => setAndamioCuerpos(parseInt(e.target.value) || 1)}
                    className="w-14 text-center border border-white/50 rounded px-2 py-1 text-sm font-dm focus:outline-none focus:border-on-surface" />
                  <span className="text-xs text-on-surface-variant font-dm">cuerpos</span>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* ── Resumen + totales ── */}
      <div className="p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-primary" />
          <span className="text-sm font-dm text-on-surface-variant">Incluir IVA 19% (solo vista previa)</span>
        </label>

        {medida ? (
          <div className="bg-white/50 rounded p-4 space-y-1.5">
            <div className="flex justify-between text-sm font-dm text-on-surface-variant">
              <span>{medida.label} · {grosor} · {AFICHES_TIPOS.find(t => t.id === tipo)?.label}</span>
              <span>{clp(base)}</span>
            </div>
            {conDistPeq && (
              <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                <span>Dist. pequeños ×{cantDistPeq}</span><span>{clp(cantDistPeq * 1500)}</span>
              </div>
            )}
            {conDistGrande && (
              <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                <span>Dist. grandes ×{cantDistGrande}</span><span>{clp(cantDistGrande * 2500)}</span>
              </div>
            )}
            {instalacion === 'sin_andamio' && (
              <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                <span>Instalación s/andamio</span><span>× 1.5</span>
              </div>
            )}
            {instalacion === 'con_andamio' && (
              <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                <span>Instalación c/andamio ({andamioCuerpos} cuerpos)</span>
                <span>× 1.5 + {clp(andamioCuerpos * 5000)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-dm text-on-surface-variant border-t border-white/50 pt-1.5">
              <span>Subtotal neto</span><span>{clp(subtotal)}</span>
            </div>
            {conIva && (
              <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                <span>IVA 19%</span><span>{clp(iva)}</span>
              </div>
            )}
            <div className="flex justify-between font-barlow text-2xl font-bold pt-1">
              <span>TOTAL</span><span className="text-primary">{clp(total)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white/50 rounded p-4 text-center">
            <p className="text-sm font-dm text-on-surface-variant">Selecciona una medida en la tabla</p>
          </div>
        )}

        <button onClick={handleAdd} disabled={!medida || !subtotal}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={15} /> Agregar a cotización
        </button>
      </div>

      {/* ── Acrílico personalizado por m² ── */}
      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm font-bold uppercase tracking-wider text-on-surface-variant">Medida personalizada</p>

        {/* Grosor propio del calculador */}
        <div className="flex gap-1.5">
          {['3mm', '5mm'].map(g => (
            <button key={g} onClick={() => setCGrosor(g)}
              className={`flex-1 py-1.5 rounded text-sm font-dm border transition-colors ${cGrosor === g ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
              {g}
            </button>
          ))}
        </div>

        {/* Precio/m² editable */}
        <div>
          <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1.5">
            Precio por m² — {AFICHES_TIPOS.find(t => t.id === tipo)?.label} · {cGrosor}
            <span className="ml-1 normal-case text-on-surface-variant">(editable)</span>
          </label>
          <input
            type="number" min="0"
            value={cPrecioM2}
            onChange={e => setCPrecioM2(e.target.value)}
            className="w-full border-2 border-on-surface rounded px-3 py-2 text-lg font-barlow font-bold focus:outline-none focus:border-primary"
          />
          {cPrecioM2 && parseFloat(cPrecioM2) !== precioM2Sugerido && (
            <button onClick={() => setCPrecioM2(String(precioM2Sugerido))}
              className="text-[11px] font-dm text-primary mt-1 hover:underline">
              Restaurar sugerido ({clp(precioM2Sugerido)}/m²)
            </button>
          )}
        </div>

        {/* Selector forma */}
        <div className="flex gap-1.5">
          {[{ id: 'rectangular', label: 'Rectangular' }, { id: 'circular', label: 'Circular' }].map(f => (
            <button key={f.id} onClick={() => setCForma(f.id)}
              className={`flex-1 py-1.5 rounded text-sm font-dm border transition-colors ${cForma === f.id ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Inputs dimensiones */}
        {cForma === 'rectangular' ? (
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min="0" value={cAncho} onChange={e => setCAncho(e.target.value)}
              placeholder="Ancho (cm)"
              className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
            <input type="number" min="0" value={cAlto} onChange={e => setCAlto(e.target.value)}
              placeholder="Alto (cm)"
              className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
        ) : (
          <input type="number" min="0" value={cDiam} onChange={e => setCDiam(e.target.value)}
            placeholder="Diámetro (cm)"
            className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
        )}

        {/* Resultado */}
        {cArea > 0 && (
          <div className="bg-on-surface rounded px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-dm text-white/60">{cArea.toFixed(4)} m² × {clp(precioM2Custom)}/m²</p>
              <span className="font-dm text-sm text-white/80">{clp(cPrecioBase)}</span>
            </div>
            {costDist > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-dm text-white/60">Distanciadores</p>
                <span className="font-dm text-sm text-white/80">{clp(costDist)}</span>
              </div>
            )}
            {instalacion !== 'ninguna' && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-dm text-white/60">
                  {instalacion === 'sin_andamio' ? 'Instalación ×1.5' : `Instalación ×1.5 + ${andamioCuerpos} cuerpos`}
                </p>
                <span className="text-white/60 text-xs font-dm">incluido</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/20 pt-1.5">
              <span className="text-xs font-dm text-white/50">{cForma === 'circular' ? 'π × (Ø/2)²' : 'ancho × alto'}</span>
              <span className="font-barlow font-bold text-2xl text-white">{clp(cSubtotal)}</span>
            </div>
          </div>
        )}

        <button onClick={handleAddCustom} disabled={!cSubtotal}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={15} /> Agregar a cotización
        </button>
      </div>
    </div>
  )
}

// ─── PANEL DE PRODUCTOS GENÉRICO ──────────────────────────────────────────
function ProductosGenericos({ categoria, multiplicador, setMultiplicador }) {
  const productos = PRODUCTOS[categoria] || []
  const [query, setQuery] = useState('')

  if (!productos.length) return <p className="p-4 text-sm text-on-surface-variant font-dm">Sin productos en esta categoría.</p>

  const tieneMultiplicador = productos.some(p => p.aplicaMultiplicador)
  const filtrados = query.trim()
    ? productos.filter(p => normalizar(p.nombre).includes(normalizar(query.trim())))
    : productos

  return (
    <div>
      {tieneMultiplicador && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/50 border-b border-white/50">
          <MultiplicadorButtons multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
        </div>
      )}
      <div className="px-4 py-2 bg-white border-b border-white/50">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full border border-white/50 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface"
        />
      </div>
      <div className="px-2 py-1 bg-white/50 border-b border-white/50">
        <div className="hidden sm:flex items-center text-[10px] text-on-surface-variant font-dm uppercase tracking-wider px-2 gap-2">
          <span className="flex-1">Producto</span>
          <span className="w-32">Medida / Cantidad</span>
          <span className="w-20 text-right">Total</span>
          <span className="w-8"></span>
        </div>
      </div>
      {filtrados.length === 0
        ? <p className="p-4 text-sm text-on-surface-variant font-dm">Sin resultados para "{query}"</p>
        : filtrados.map(p => <ProductoFila key={p.id} producto={p} multiplicador={multiplicador} />)
      }
    </div>
  )
}

// ─── FORMULARIO CORTE RECTANGULAR ACRÍLICO ────────────────────────────────
function AcrilicoRectangularPanel({ multiplicador }) {
  const AREA_PLANCHA = 1.22 * 2.44

  const materiales = [
    { id: 'bnt_3mm', label: 'Blanco / Negro / Transparente 3mm', costoM2: Math.round(75000 / AREA_PLANCHA) },
    { id: 'color_3mm', label: 'Color 3mm',                        costoM2: Math.round(95000 / AREA_PLANCHA) },
    { id: 'bnt_5mm', label: 'Blanco / Negro / Transparente 5mm', costoM2: Math.round(125000 / AREA_PLANCHA) },
  ]

  const [matId, setMatId] = useState('bnt_3mm')
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [precioM2, setPrecioM2] = useState('')

  const mat = materiales.find(m => m.id === matId)

  useEffect(() => {
    if (mat) setPrecioM2(String(mat.costoM2 * multiplicador))
  }, [matId, multiplicador])

  const area = (parseFloat(ancho) || 0) * (parseFloat(alto) || 0) / 10000
  const total = area > 0 && precioM2 ? Math.round(area * parseFloat(precioM2)) : 0

  const handleAdd = () => {
    if (!area || !total) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: {
        descripcion: `Acrílico rect. ${mat.label} ${ancho}×${alto}cm`,
        cantidad: 1, precioUnitario: total, total,
      }
    }))
    setAncho(''); setAlto('')
  }

  return (
    <div className="p-4 space-y-3">
      <select value={matId} onChange={e => setMatId(e.target.value)}
        className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
        {materiales.map(m => (
          <option key={m.id} value={m.id}>{m.label} — costo {clp(m.costoM2)}/m²</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" value={ancho} onChange={e => setAncho(e.target.value)}
          placeholder="Ancho (cm)"
          className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
        <input type="number" min="0" value={alto} onChange={e => setAlto(e.target.value)}
          placeholder="Alto (cm)"
          className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
      </div>

      {area > 0 && (
        <p className="text-xs text-on-surface-variant font-dm">Área: {area.toFixed(4)} m²</p>
      )}

      <div>
        <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">
          Precio de venta por m² (editable)
        </label>
        <input type="number" min="0" value={precioM2} onChange={e => setPrecioM2(e.target.value)}
          placeholder="$ por m²"
          className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
      </div>

      <div className="flex items-center justify-between bg-white/50 rounded px-4 py-2.5">
        <span className="text-xs font-dm text-on-surface-variant">Total estimado</span>
        <span className="font-barlow text-xl font-bold">{total > 0 ? clp(total) : '—'}</span>
      </div>

      <button onClick={handleAdd} disabled={!area || !total}
        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={15} /> Agregar a cotización
      </button>
    </div>
  )
}

// ─── PANEL ESPECIAL ACRÍLICO ───────────────────────────────────────────────
function AcrilicoPanel({ multiplicador, setMultiplicador }) {
  const todos = PRODUCTOS.acrilico || []
  const [query, setQuery] = useState('')

  const plancha = todos.filter(p => !p.seccion)
  const circular = todos.filter(p => p.seccion === 'circular')

  const q = query.trim()
  const filtrarPlancha = q ? plancha.filter(p => normalizar(p.nombre).includes(normalizar(q))) : plancha
  const filtrarCircular = q ? circular.filter(p => normalizar(p.nombre).includes(normalizar(q))) : circular

  const SectionHeader = ({ label }) => (
    <div className="px-4 py-1.5 bg-white/50 border-b border-white/50">
      <span className="text-[10px] font-dm font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
    </div>
  )

  return (
    <div>
      {/* Selector instalación */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/50 border-b border-white/50">
        <MultiplicadorButtons multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
      </div>

      {/* Buscador */}
      <div className="px-4 py-2 bg-white border-b border-white/50">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full border border-white/50 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface"
        />
      </div>

      {/* Cabecera columnas */}
      <div className="px-2 py-1 bg-white/50 border-b border-white/50">
        <div className="hidden sm:flex items-center text-[10px] text-on-surface-variant font-dm uppercase tracking-wider px-2 gap-2">
          <span className="flex-1">Producto</span>
          <span className="w-32">Medida / Cantidad</span>
          <span className="w-20 text-right">Total</span>
          <span className="w-8"></span>
        </div>
      </div>

      {/* Sección: Por Plancha */}
      {filtrarPlancha.length > 0 && (
        <>
          <SectionHeader label="Por Plancha — 1220×2440mm (precio proveedor × mult.)" />
          {filtrarPlancha.map(p => <ProductoFila key={p.id} producto={p} multiplicador={multiplicador} />)}
        </>
      )}

      {/* Sección: Corte Circular */}
      {filtrarCircular.length > 0 && (
        <>
          <SectionHeader label="Corte Circular ≤60×60cm — precio final al cliente" />
          {filtrarCircular.map(p => <ProductoFila key={p.id} producto={p} multiplicador={multiplicador} />)}
        </>
      )}

      {/* Sección: Corte Rectangular */}
      {!q && (
        <>
          <SectionHeader label="Corte Rectangular — ingresar dimensiones en cm" />
          <AcrilicoRectangularPanel multiplicador={multiplicador} />
        </>
      )}

      {filtrarPlancha.length === 0 && filtrarCircular.length === 0 && q && (
        <p className="p-4 text-sm text-on-surface-variant font-dm">Sin resultados para "{query}"</p>
      )}
    </div>
  )
}

// ─── FORMULARIOS ESPECIALES ────────────────────────────────────────────────

function TarjetasPanel({ multiplicador }) {
  const [cantidad, setCantidad] = useState(100)
  const [caras, setCaras] = useState('1cara')
  const [usarBirth, setUsarBirth] = useState(false)
  const [mult, setMult] = useState(multiplicador)

  const precBirth = TARJETAS.preciosBirth[cantidad]?.[caras]
  const precProv = TARJETAS.preciosProveedor[cantidad]?.[caras]
  const precio = usarBirth && precBirth ? precBirth : (precProv ? precProv * mult : null)

  const add = () => {
    if (!precio) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: { descripcion: `Tarjetas ${cantidad} und × ${caras === '1cara' ? '1 cara' : '2 caras'}`, cantidad: 1, precioUnitario: precio, total: precio }
    }))
  }

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <select value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))}
            className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {TARJETAS.cantidades.map(n => <option key={n} value={n}>{n} und</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Caras</label>
          <select value={caras} onChange={e => setCaras(e.target.value)}
            className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            <option value="1cara">1 cara</option>
            <option value="2caras">2 caras</option>
          </select>
        </div>
      </div>
      {!usarBirth && (
        <MultiplicadorButtons multiplicador={mult} setMultiplicador={setMult} label={null} />
      )}
      {precBirth && (
        <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
          <input type="checkbox" checked={usarBirth} onChange={e => setUsarBirth(e.target.checked)} className="accent-primary" />
          <span className="text-on-surface-variant">Precio Birth directo ({clp(precBirth)})</span>
        </label>
      )}
      <div className="flex items-center justify-between bg-on-surface text-white rounded-2xl px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{precio ? clp(precio) : '—'}</span>
      </div>
      <button onClick={add} disabled={!precio}
        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={15} /> Agregar a cotización
      </button>
    </div>
  )
}

function VolantesPanel() {
  const [medida, setMedida] = useState('10x14.5cm')
  const [caras, setCaras] = useState('1 cara')
  const [cantidad, setCantidad] = useState(100)
  const precio = VOLANTES.precios[medida]?.[caras]?.[cantidad]
  const add = () => {
    if (!precio) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: { descripcion: `Volantes ${medida} ${caras} ${cantidad}und`, cantidad: 1, precioUnitario: precio, total: precio }
    }))
  }
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Medida</label>
        <select value={medida} onChange={e => setMedida(e.target.value)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
          {VOLANTES.medidas.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Caras</label>
          <select value={caras} onChange={e => setCaras(e.target.value)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {VOLANTES.caras.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <select value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {VOLANTES.cantidades.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between bg-on-surface text-white rounded-2xl px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{precio ? clp(precio) : '—'}</span>
      </div>
      <button onClick={add} disabled={!precio}
        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

function BastidoresPanel({ multiplicador }) {
  const { multiplicadores } = useContext(MultiplicadoresContext)
  const [tipo, setTipo] = useState('proveedor')
  const [selProv, setSelProv] = useState(BASTIDORES_PROVEEDOR[0].id)
  const [selBirth, setSelBirth] = useState(BASTIDORES_BIRTH[0].id)
  const [caras, setCaras] = useState('una')
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [esPaloma, setEsPaloma] = useState(false)
  const [selPaloma, setSelPaloma] = useState(PALOMAS[0].id)
  const [mult, setMult] = useState(multiplicador)

  let precio = null, desc = ''
  if (tipo === 'proveedor') {
    const b = BASTIDORES_PROVEEDOR.find(b => b.id === selProv)
    if (b) { precio = (caras === 'una' ? b.precioCara : b.precioDoble) * mult; desc = `${b.nombre} ${caras === 'una' ? '1 cara' : 'doble'}` }
  } else if (esPaloma) {
    const p = PALOMAS.find(p => p.id === selPaloma)
    if (p) { precio = p.precio; desc = p.nombre }
  } else {
    const b = BASTIDORES_BIRTH.find(b => b.id === selBirth)
    if (b && ancho && alto) { precio = Math.round(parseFloat(ancho) * parseFloat(alto) * b.precio); desc = `${b.nombre} ${ancho}×${alto}m` }
  }

  const add = () => {
    if (!precio) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', { detail: { descripcion: desc, cantidad: 1, precioUnitario: precio, total: precio } }))
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        {['proveedor', 'birth'].map(t => (
          <button key={t} onClick={() => setTipo(t)}
            className={`flex-1 py-1.5 rounded text-xs font-dm border transition-colors ${tipo === t ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50'}`}>
            {t === 'proveedor' ? 'Proveedor' : 'Precio Birth'}
          </button>
        ))}
      </div>
      {tipo === 'proveedor' ? (
        <>
          <select value={selProv} onChange={e => setSelProv(e.target.value)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {BASTIDORES_PROVEEDOR.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={caras} onChange={e => setCaras(e.target.value)} className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
              <option value="una">1 cara</option>
              <option value="doble">Doble cara</option>
            </select>
            <select value={mult} onChange={e => setMult(parseFloat(e.target.value))} className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
              {multiplicadores.map(m => <option key={m.id} value={m.valor}>×{m.valor}</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
            <input type="checkbox" checked={esPaloma} onChange={e => setEsPaloma(e.target.checked)} className="accent-primary" />
            <span className="text-on-surface-variant">Paloma publicitaria</span>
          </label>
          {esPaloma ? (
            <select value={selPaloma} onChange={e => setSelPaloma(e.target.value)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
              {PALOMAS.map(p => <option key={p.id} value={p.id}>{p.nombre} — {clp(p.precio)}</option>)}
            </select>
          ) : (
            <>
              <select value={selBirth} onChange={e => setSelBirth(e.target.value)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
                {BASTIDORES_BIRTH.map(b => <option key={b.id} value={b.id}>{b.nombre} — {clp(b.precio)}/m²</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" step="0.01" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="Ancho m" className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none" />
                <input type="number" min="0" step="0.01" value={alto} onChange={e => setAlto(e.target.value)} placeholder="Alto m" className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none" />
              </div>
            </>
          )}
        </>
      )}
      <div className="flex items-center justify-between bg-on-surface text-white rounded-2xl px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{precio ? clp(precio) : '—'}</span>
      </div>
      <button onClick={add} disabled={!precio}
        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

function PendonesPanel() {
  const [sel, setSel] = useState(PENDONES[0].id)
  const [qty, setQty] = useState(1)
  const p = PENDONES.find(p => p.id === sel)
  const total = p ? p.precio * qty : 0
  const add = () => {
    if (!total) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', { detail: { descripcion: `${p.nombre}${qty > 1 ? ` ×${qty}` : ''}`, cantidad: qty, precioUnitario: p.precio, total } }))
  }
  return (
    <div className="p-4 space-y-3">
      <select value={sel} onChange={e => setSel(e.target.value)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
        {PENDONES.map(p => <option key={p.id} value={p.id}>{p.nombre} — {clp(p.precio)}</option>)}
      </select>
      <div>
        <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Cantidad</label>
        <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none" />
      </div>
      <div className="flex items-center justify-between bg-on-surface text-white rounded-2xl px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{clp(total)}</span>
      </div>
      <button onClick={add} className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

function BanderaVelaPanel({ multiplicador }) {
  const { multiplicadores } = useContext(MultiplicadoresContext)
  const [sel, setSel] = useState(BANDERAS_VELA[0].id)
  const [qty, setQty] = useState(1)
  const [mult, setMult] = useState(multiplicador)
  const p = BANDERAS_VELA.find(b => b.id === sel)
  const total = p ? Math.round((p.aplicaMultiplicador ? p.precio * mult : p.precio) * qty) : 0
  const add = () => {
    if (!total) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', { detail: { descripcion: `${p.nombre}${qty > 1 ? ` ×${qty}` : ''}`, cantidad: qty, precioUnitario: Math.round(total / qty), total } }))
  }
  return (
    <div className="p-4 space-y-3">
      <select value={sel} onChange={e => setSel(e.target.value)} className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
        {BANDERAS_VELA.map(b => <option key={b.id} value={b.id}>{b.nombre} — {clp(b.precio)}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none" placeholder="Cantidad" />
        {p?.aplicaMultiplicador && (
          <select value={mult} onChange={e => setMult(parseFloat(e.target.value))} className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {multiplicadores.map(m => <option key={m.id} value={m.valor}>×{m.valor}</option>)}
          </select>
        )}
      </div>
      <div className="flex items-center justify-between bg-on-surface text-white rounded-2xl px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{clp(total)}</span>
      </div>
      <button onClick={add} className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

function MiscelaneosPanel() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(null)

  const recargar = () => getMiscelaneos().then(setItems)

  useEffect(() => { recargar() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre?.trim() || !form.precio) return
    await saveMiscelaneo({ ...form, precio: parseFloat(form.precio) })
    recargar()
    setForm(null)
  }

  const handleAdd = (item) => {
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: { descripcion: item.nombre, cantidad: 1, precioUnitario: item.precio, total: item.precio }
    }))
  }

  return (
    <div>
      {/* Lista de ítems guardados */}
      {items.length === 0 && !form && (
        <div className="px-4 py-8 text-center text-on-surface-variant text-sm font-dm">
          <p>Sin misceláneos. Agrega tornillos, escuadras, pintura, etc.</p>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-white/50 hover:bg-white/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-dm font-medium truncate">{item.nombre}</p>
            <p className="text-[11px] text-on-surface-variant font-dm">{clp(item.precio)}/unidad</p>
          </div>
          <button onClick={() => setForm({ ...item })}
            className="p-1.5 text-on-surface-variant hover:text-on-surface shrink-0">
            <RotateCcw size={13} />
          </button>
          <button onClick={() => deleteMiscelaneo(item.id).then(recargar)}
            className="p-1.5 text-on-surface-variant hover:text-primary shrink-0">
            <Trash2 size={13} />
          </button>
          <button onClick={() => handleAdd(item)}
            className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white hover:bg-red-700 shrink-0">
            <Plus size={14} />
          </button>
        </div>
      ))}

      {/* Formulario nuevo/editar */}
      {form !== null ? (
        <form onSubmit={handleSave} className="p-4 border-t border-white/50 space-y-3 bg-white/50">
          <p className="text-xs font-dm font-medium text-on-surface-variant uppercase tracking-wider">
            {form.id ? 'Editar ítem' : 'Nuevo misceláneo'}
          </p>
          <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre (ej: Tornillo autoperforante)" required
            className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface bg-white" />
          <div className="flex gap-2">
            <input type="number" min="0" value={form.precio || ''} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              placeholder="Precio por unidad" required
              className="flex-1 border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface bg-white" />
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 bg-on-surface text-white py-2 rounded text-sm font-dm hover:bg-primary transition-colors">
              {form.id ? 'Guardar cambios' : 'Agregar'}
            </button>
            <button type="button" onClick={() => setForm(null)}
              className="px-4 border border-white/50 rounded text-sm font-dm text-on-surface-variant hover:border-on-surface">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-white/50">
          <button onClick={() => setForm({})}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-on-surface-variant/40 rounded py-2.5 text-sm font-dm text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors">
            <Plus size={14} /> Agregar misceláneo
          </button>
        </div>
      )}
    </div>
  )
}

function ManualPanel() {
  const [desc, setDesc] = useState('')
  const [precio, setPrecio] = useState('')
  const [qty, setQty] = useState(1)
  const total = (parseFloat(precio) || 0) * qty
  const add = () => {
    if (!desc || !precio) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', { detail: { descripcion: desc, cantidad: qty, precioUnitario: parseFloat(precio), total } }))
    setDesc(''); setPrecio(''); setQty(1)
  }
  return (
    <div className="p-4 space-y-3">
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del ítem" className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="0" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio unit." className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
        <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value)||1)} className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" placeholder="Cant." />
      </div>
      <div className="flex items-center justify-between bg-on-surface text-white rounded-2xl px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{total > 0 ? clp(total) : '—'}</span>
      </div>
      <button onClick={add} disabled={!desc || !precio}
        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

// ─── PANEL FACHADA / ACM ───────────────────────────────────────────────────
const ACM_NORMAL = [
  { id: 'acm_blanco_brill', color: 'Blanco Brillante' },
  { id: 'acm_negro_brill',  color: 'Negro Brillante'  },
  { id: 'acm_rojo_brill',   color: 'Rojo Brillante'   },
  { id: 'acm_azul_brill',   color: 'Azul Brillante'   },
  { id: 'acm_amarillo',     color: 'Amarillo Mate'     },
]
const ACM_MATE = [
  { id: 'acm_mate_blanco',  color: 'Blanco Mate'       },
  { id: 'acm_mate_negro',   color: 'Negro Mate'        },
  { id: 'acm_mate_plata',   color: 'Plata Mate'        },
  { id: 'acm_mate_gray',    color: 'Dark Gray Metallic' },
]

function FachadaPanel({ multiplicador, setMultiplicador }) {
  // ACM Normal
  const [colorNormal, setColorNormal] = useState(ACM_NORMAL[0].color)
  const [qNormal, setQNormal] = useState('')
  // ACM Mate
  const [colorMate, setColorMate] = useState(ACM_MATE[0].color)
  const [qMate, setQMate] = useState('')
  // Lámina Acanalada
  const [qAcan, setQAcan] = useState('')
  // M² personalizado
  const [facPrecioM2, setFacPrecioM2] = useState('')
  const [facAncho, setFacAncho] = useState('')
  const [facAlto, setFacAlto] = useState('')
  // Ítem libre con multiplicador propio
  const [libDesc, setLibDesc] = useState('')
  const [libCosto, setLibCosto] = useState('')
  const [libMult, setLibMult] = useState('2')

  const PRECIO_ACM_NORMAL = 62878
  const PRECIO_ACM_MATE   = 106216
  const PRECIO_ACAN       = 35000
  const ENVIO_ACAN        = 25000

  const totalNormal = qNormal ? Math.round(parseFloat(qNormal) * PRECIO_ACM_NORMAL * multiplicador) : 0
  const totalMate   = qMate   ? Math.round(parseFloat(qMate)   * PRECIO_ACM_MATE   * multiplicador) : 0
  const totalAcan   = qAcan   ? parseFloat(qAcan) * PRECIO_ACAN + ENVIO_ACAN : 0

  const facArea     = (parseFloat(facAncho)||0) * (parseFloat(facAlto)||0) / 10000
  const facTotal    = facArea > 0 && facPrecioM2 ? Math.round(facArea * parseFloat(facPrecioM2)) : 0

  const libTotal    = libCosto && libMult ? Math.round(parseFloat(libCosto) * parseFloat(libMult)) : 0

  const agregar = (descripcion, total) => {
    if (!total) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: { descripcion, cantidad: 1, precioUnitario: total, total }
    }))
  }

  const SH = ({ label }) => (
    <div className="px-4 py-2 bg-white/50 border-y border-white/50">
      <p className="text-[10px] font-dm font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
    </div>
  )

  return (
    <div className="divide-y divide-white/40">

      {/* Multiplicador instalación */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/50">
        <MultiplicadorButtons multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
      </div>

      {/* ── ACM NORMAL / BRILLANTE ── */}
      <SH label={`ACM Normal/Brillante 3mm — ${clp(PRECIO_ACM_NORMAL)}/plancha × mult = ${clp(PRECIO_ACM_NORMAL * multiplicador)}/plancha`} />
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider mb-1.5">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {ACM_NORMAL.map(c => (
              <button key={c.id} onClick={() => setColorNormal(c.color)}
                className={`px-2.5 py-1 rounded text-xs font-dm border transition-colors ${colorNormal === c.color ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
                {c.color}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Cantidad de planchas</label>
            <input type="number" min="1" value={qNormal} onChange={e => setQNormal(e.target.value)}
              placeholder="0" className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
          {totalNormal > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-on-surface-variant font-dm">Total</p>
              <p className="font-barlow font-bold text-xl">{clp(totalNormal)}</p>
            </div>
          )}
        </div>
        <button onClick={() => { agregar(`ACM ${colorNormal} 3mm ×${qNormal} planchas`, totalNormal); setQNormal('') }}
          disabled={!totalNormal}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={14} /> Agregar a cotización
        </button>
      </div>

      {/* ── ACM MATE ── */}
      <SH label={`ACM Mate 4mm — ${clp(PRECIO_ACM_MATE)}/plancha × mult = ${clp(PRECIO_ACM_MATE * multiplicador)}/plancha`} />
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider mb-1.5">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {ACM_MATE.map(c => (
              <button key={c.id} onClick={() => setColorMate(c.color)}
                className={`px-2.5 py-1 rounded text-xs font-dm border transition-colors ${colorMate === c.color ? 'bg-on-surface text-white border-on-surface' : 'bg-white text-on-surface-variant border-white/50 hover:border-on-surface'}`}>
                {c.color}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Cantidad de planchas</label>
            <input type="number" min="1" value={qMate} onChange={e => setQMate(e.target.value)}
              placeholder="0" className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
          {totalMate > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-on-surface-variant font-dm">Total</p>
              <p className="font-barlow font-bold text-xl">{clp(totalMate)}</p>
            </div>
          )}
        </div>
        <button onClick={() => { agregar(`ACM ${colorMate} 4mm ×${qMate} planchas`, totalMate); setQMate('') }}
          disabled={!totalMate}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={14} /> Agregar a cotización
        </button>
      </div>

      {/* ── LÁMINA ACANALADA ── */}
      <SH label={`Lámina Acanalada — ${clp(PRECIO_ACAN)}/unidad + envío fijo ${clp(ENVIO_ACAN)}`} />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Cantidad de láminas</label>
            <input type="number" min="1" value={qAcan} onChange={e => setQAcan(e.target.value)}
              placeholder="0" className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
          {totalAcan > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-on-surface-variant font-dm">Láminas + envío</p>
              <p className="font-barlow font-bold text-xl">{clp(totalAcan)}</p>
            </div>
          )}
        </div>
        {qAcan > 0 && (
          <div className="bg-white/50 rounded px-3 py-2 text-xs font-dm text-on-surface-variant space-y-0.5">
            <div className="flex justify-between"><span>{qAcan} × {clp(PRECIO_ACAN)}</span><span>{clp(parseFloat(qAcan)*PRECIO_ACAN)}</span></div>
            <div className="flex justify-between"><span>Envío fijo</span><span>{clp(ENVIO_ACAN)}</span></div>
          </div>
        )}
        <button onClick={() => { agregar(`Lámina Acanalada ×${qAcan} + envío`, totalAcan); setQAcan('') }}
          disabled={!totalAcan}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={14} /> Agregar a cotización
        </button>
      </div>

      {/* ── POR M² PERSONALIZADO ── */}
      <SH label="Fachada por m² — precio libre" />
      <div className="p-4 space-y-3">
        <div>
          <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Precio por m²</label>
          <input type="number" min="0" value={facPrecioM2} onChange={e => setFacPrecioM2(e.target.value)}
            placeholder="$ por m²" className="w-full border-2 border-on-surface rounded px-3 py-2 text-lg font-barlow font-bold focus:outline-none focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Ancho (cm)</label>
            <input type="number" min="0" value={facAncho} onChange={e => setFacAncho(e.target.value)}
              className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
          <div>
            <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Alto (cm)</label>
            <input type="number" min="0" value={facAlto} onChange={e => setFacAlto(e.target.value)}
              className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
        </div>
        {facArea > 0 && facTotal > 0 && (
          <div className="bg-on-surface rounded px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-dm text-white/60">{facArea.toFixed(3)} m² × {clp(parseFloat(facPrecioM2))}/m²</p>
            <span className="font-barlow font-bold text-xl text-white">{clp(facTotal)}</span>
          </div>
        )}
        <button onClick={() => { agregar(`Fachada por m² ${facAncho}×${facAlto}cm (${facArea.toFixed(3)} m²)`, facTotal); setFacAncho(''); setFacAlto('') }}
          disabled={!facTotal}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={14} /> Agregar a cotización
        </button>
      </div>

      {/* ── ÍTEM LIBRE CON MULTIPLICADOR PROPIO ── */}
      <SH label="Otro tipo de fachada — costo × multiplicador propio" />
      <div className="p-4 space-y-3">
        <input value={libDesc} onChange={e => setLibDesc(e.target.value)}
          placeholder="Descripción del ítem..."
          className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Costo base ($)</label>
            <input type="number" min="0" value={libCosto} onChange={e => setLibCosto(e.target.value)}
              placeholder="0" className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
          <div>
            <label className="text-[11px] font-dm text-on-surface-variant uppercase tracking-wider block mb-1">Multiplicador</label>
            <input type="number" min="1" step="0.1" value={libMult} onChange={e => setLibMult(e.target.value)}
              placeholder="2" className="w-full border-2 border-on-surface rounded px-3 py-2 text-sm font-dm font-bold focus:outline-none focus:border-primary" />
          </div>
        </div>
        {libTotal > 0 && (
          <div className="bg-on-surface rounded px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-dm text-white/60">{clp(parseFloat(libCosto))} × {libMult}</p>
            <span className="font-barlow font-bold text-xl text-white">{clp(libTotal)}</span>
          </div>
        )}
        <button onClick={() => { agregar(libDesc || 'Fachada personalizada', libTotal); setLibDesc(''); setLibCosto(''); setLibMult('2') }}
          disabled={!libTotal || !libDesc}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={14} /> Agregar a cotización
        </button>
      </div>

    </div>
  )
}

// ─── PANEL RESULTADOS BÚSQUEDA GLOBAL ─────────────────────────────────────
function BusquedaGlobalPanel({ resultados, query, multiplicador }) {
  return (
    <div className="flex-1 overflow-y-auto bg-white rounded border border-white/50">
      <div className="px-4 py-2 bg-white/50 border-b border-white/50 sticky top-0">
        <p className="text-xs font-dm text-on-surface-variant">
          {resultados.length > 0
            ? `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''} para "${query}"`
            : `Sin resultados para "${query}"`}
        </p>
      </div>
      {resultados.map(p => (
        <ProductoFila key={`${p.catId}-${p.id}`} producto={p} multiplicador={multiplicador} />
      ))}
      {resultados.length === 0 && (
        <p className="p-6 text-sm text-on-surface-variant font-dm text-center">No se encontró ningún producto</p>
      )}
    </div>
  )
}

// ─── VISTA CUADRÍCULA ─────────────────────────────────────────────────────
function CuadriculaPanel({ categoria, setCategoria, multiplicador, setMultiplicador }) {
  function conteo(catId) { return (PRODUCTOS[catId] || []).length }
  return (
    <div className="flex-1 overflow-y-auto space-y-3 pb-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 px-2.5">
        {CATEGORIAS.map(cat => {
          const activa = cat.id === categoria
          const n = conteo(cat.id)
          return (
            <button key={cat.id} onClick={() => setCategoria(cat.id)}
              className={`text-left p-3 rounded border transition-all ${activa ? 'bg-on-surface border-on-surface' : 'bg-white border-white/50 hover:border-on-surface'}`}>
              <p className={`text-sm font-dm font-semibold leading-tight ${activa ? 'text-white' : 'text-on-surface'}`}>
                {cat.label}
              </p>
              {n > 0 && <p className={`text-[11px] mt-0.5 font-dm ${activa ? 'text-white/60' : 'text-on-surface-variant'}`}>{n} productos</p>}
            </button>
          )
        })}
      </div>
      {categoria && (
        <div className="mx-2.5 bg-white rounded border border-white/50">
          <div className="px-4 py-2.5 border-b border-white/50 bg-white/50 sticky top-0">
            <h3 className="font-barlow text-sm font-bold tracking-wider text-on-surface uppercase">
              {CATEGORIAS.find(c => c.id === categoria)?.label}
            </h3>
          </div>
          <CategoriaPanel categoria={categoria} multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
        </div>
      )}
    </div>
  )
}

// ─── PANEL DE PRODUCTOS SEGÚN CATEGORÍA ──────────────────────────────────
function CategoriaPanel({ categoria, multiplicador, setMultiplicador }) {
  if (categoria === 'tarjetas') return <TarjetasPanel multiplicador={multiplicador} />
  if (categoria === 'volantes') return <VolantesPanel />
  if (categoria === 'bastidor') return <BastidoresPanel multiplicador={multiplicador} />
  if (categoria === 'pendon') return <PendonesPanel />
  if (categoria === 'bandera_vela') return <BanderaVelaPanel multiplicador={multiplicador} />
  if (categoria === 'miscelaneos') return <MiscelaneosPanel />
  if (categoria === 'manual') return <ManualPanel />
  if (categoria === 'acrilico') return <AcrilicoPanel multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
  if (categoria === 'letras_costeo') return <CosteoLetrasPanel />
  if (categoria === 'materiales') return <MaterialesPanel />
  if (categoria === 'afiches_acrilico') return <AfichesAcrilicosPanel />
  if (categoria === 'fachada') return <FachadaPanel multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
  return <ProductosGenericos categoria={categoria} multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
}

// ─── PREVIEW PDF FULL SCREEN ──────────────────────────────────────────────
function PreviewPDF({ url, filename, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 bg-black/95 z-[70] flex flex-col">
      <div className="bg-on-surface px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-white font-barlow text-lg font-bold tracking-wide">VISTA PREVIA</p>
          <p className="text-white/40 text-xs font-dm">{filename}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDownload}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded text-sm font-dm hover:bg-red-700 transition-colors">
            <Download size={14} /> Descargar
          </button>
          <button onClick={onClose}
            className="p-2 text-white/50 hover:text-white border border-white/20 rounded hover:border-white/50 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full bg-white" title="Vista previa PDF" />
    </div>
  )
}

// ─── MODAL CREAR COTIZACIÓN ────────────────────────────────────────────────
function ModalCrearCotizacion({ items, clienteId, clienteNombre, conIvaInicial = true, onClose, onGuardado }) {
  const [descripcion, setDescripcion] = useState('')
  const [formaPago, setFormaPago] = useState('Transferencia bancaria — 50% anticipo, 50% contra entrega')
  const [plazo, setPlazo] = useState('')
  const [conIva, setConIva] = useState(conIvaInicial)
  const [descuento, setDescuento] = useState('')
  const [traslado, setTraslado] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  useEffect(() => {
    if (clienteId) getClienteById(clienteId).then(c => { if (c?.correo) setEmailCliente(c.correo) })
  }, [clienteId])
  const [loading, setLoading] = useState(false)
  const [msgEmail, setMsgEmail] = useState(null)
  const [preview, setPreview] = useState(null)
  const [prototipoImg, setPrototipoImg] = useState(null)

  const subtotalBruto   = items.reduce((s, i) => s + (i.total || 0), 0)
  const pctDesc         = Math.min(Math.max(parseFloat(descuento) || 0, 0), 100)
  const montoDescuento  = pctDesc > 0 ? Math.round(subtotalBruto * pctDesc / 100) : 0
  const subtotal        = subtotalBruto - montoDescuento
  const montoTraslado   = parseFloat(traslado) || 0
  const iva             = conIva ? Math.round(subtotal * 0.19) : 0
  const total           = subtotal + iva + montoTraslado
  const anticipo        = Math.round(total * 0.5)

  const buildCot = () => ({
    clienteId, clienteNombre,
    descripcion, formaPago, plazoEntrega: plazo,
    conIva, fecha: hoy(), validez: 15,
    fechaVencimiento: sumarDias(hoy(), 15),
    items, subtotal, iva, total,
    anticipo, saldo: anticipo,
    descuento: pctDesc,
    montoDescuento,
    traslado: montoTraslado,
    estado: 'por_aceptar',
    ...(prototipoImg ? { prototipoImg } : {}),
  })

  const guardar = async (conPdf = false) => {
    setLoading(true)
    const cot = await saveCotizacion(buildCot())
    const cliente = await getClienteById(clienteId) || { nombre: clienteNombre }
    if (conPdf) await generarCotizacionPDF(cot, cliente, 'download')
    setLoading(false)
    onGuardado()
    onClose()
  }

  const handlePreview = async () => {
    setLoading(true)
    const cot = await saveCotizacion(buildCot())
    const cliente = await getClienteById(clienteId) || { nombre: clienteNombre }
    const result = await generarCotizacionPDF(cot, cliente, 'preview')
    setPreview(result)
    setLoading(false)
    onGuardado()
  }

  const handleEnviarEmail = async () => {
    if (!emailCliente.trim()) return
    setLoading(true)
    setMsgEmail(null)
    const cot = await saveCotizacion(buildCot())
    const cliente = await getClienteById(clienteId) || { nombre: clienteNombre }

    try {
      await enviarCotizacionEmailJS(cot, cliente, emailCliente)
      setMsgEmail({ tipo: 'ok', texto: `Email enviado a ${emailCliente}` })
      onGuardado()
    } catch (err) {
      const detalle = err?.text || err?.message || JSON.stringify(err) || 'error desconocido'
      setMsgEmail({ tipo: 'error', texto: `EmailJS falló: ${detalle}` })
    }
    setLoading(false)
  }

  return (
    <>
      {preview && (
        <PreviewPDF
          url={preview.url}
          filename={preview.filename}
          onClose={() => { URL.revokeObjectURL(preview.url); setPreview(null); onClose() }}
          onDownload={() => {
            const a = document.createElement('a')
            a.href = preview.url
            a.download = preview.filename
            a.click()
          }}
        />
      )}

      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-auto">
        <div className="glass-panel bg-white/90 rounded-widget w-full max-w-lg shadow-xl my-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/40 sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-widget">
            <h2 className="font-barlow text-xl font-bold tracking-wide">CREAR COTIZACIÓN</h2>
            <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-4">
            {/* Resumen items */}
            <div className="bg-white/50 rounded p-3 max-h-28 overflow-y-auto space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm font-dm">
                  <span className="text-on-surface-variant truncate mr-3">{item.descripcion}</span>
                  <span className="font-medium shrink-0">{clp(item.total)}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Descripción del proyecto</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Forma de pago</label>
                <input value={formaPago} onChange={e => setFormaPago(e.target.value)}
                  className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Plazo de entrega</label>
                <input value={plazo} onChange={e => setPlazo(e.target.value)} placeholder="5 días hábiles"
                  className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
              </div>
            </div>

            {/* Email cliente */}
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Email del cliente (para enviar)</label>
              <input type="email" value={emailCliente} onChange={e => setEmailCliente(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
            </div>

            {msgEmail && (
              <div className={`px-3 py-2 rounded text-sm font-dm ${msgEmail.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : msgEmail.tipo === 'error' ? 'bg-red-50 text-primary border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {msgEmail.texto}
              </div>
            )}

            {/* Descuento + IVA + totales */}
            <div className="border-t border-white/50 pt-3 space-y-2">
              {/* Descuento % */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-dm text-on-surface-variant uppercase tracking-wider shrink-0">Descuento</label>
                <div className="flex items-center border border-white/50 rounded overflow-hidden flex-1">
                  <input
                    type="number" min="0" max="100" step="0.5"
                    value={descuento}
                    onChange={e => setDescuento(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-1.5 text-sm font-dm focus:outline-none text-right"
                  />
                  <span className="px-2.5 py-1.5 bg-white/50 text-sm font-dm text-on-surface-variant border-l border-white/50">%</span>
                </div>
                {montoDescuento > 0 && (
                  <span className="text-sm font-dm text-primary shrink-0">−{clp(montoDescuento)}</span>
                )}
              </div>

              {/* Traslado */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-dm text-on-surface-variant uppercase tracking-wider shrink-0">Traslado</label>
                <div className="flex items-center border border-white/50 rounded overflow-hidden flex-1">
                  <span className="px-2.5 py-1.5 bg-white/50 text-sm font-dm text-on-surface-variant border-r border-white/50">$</span>
                  <input
                    type="number" min="0"
                    value={traslado}
                    onChange={e => setTraslado(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-1.5 text-sm font-dm focus:outline-none text-right"
                  />
                </div>
                {montoTraslado > 0 && (
                  <span className="text-sm font-dm text-on-surface-variant shrink-0">{clp(montoTraslado)}</span>
                )}
              </div>

              {/* IVA */}
              <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
                <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-primary" />
                <span className="text-on-surface-variant">Incluir IVA 19%</span>
              </label>

              {/* Desglose */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                  <span>Subtotal bruto</span><span>{clp(subtotalBruto)}</span>
                </div>
                {montoDescuento > 0 && (
                  <div className="flex justify-between text-sm font-dm text-primary">
                    <span>Descuento {pctDesc}%</span><span>−{clp(montoDescuento)}</span>
                  </div>
                )}
                {montoDescuento > 0 && (
                  <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                    <span>Subtotal neto</span><span>{clp(subtotal)}</span>
                  </div>
                )}
                {conIva && (
                  <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                    <span>IVA 19%</span><span>{clp(iva)}</span>
                  </div>
                )}
                {montoTraslado > 0 && (
                  <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                    <span>Traslado</span><span>{clp(montoTraslado)}</span>
                  </div>
                )}
                <div className="flex justify-between font-barlow text-xl font-bold border-t border-white/50 pt-1.5 mt-1">
                  <span>TOTAL</span><span className="text-primary">{clp(total)}</span>
                </div>
              </div>
            </div>

            {/* Prototipo del letrero (opcional) */}
            <AdjuntarPrototipo value={prototipoImg} onChange={setPrototipoImg} />

            {/* Botones — 2 filas */}
            <div className="space-y-2 pt-1">
              {/* Fila 1: preview + guardar + pdf */}
              <div className="flex gap-2">
                <button onClick={handlePreview} disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-white/50 rounded text-sm font-dm hover:border-on-surface transition-colors disabled:opacity-50">
                  <Eye size={14} /> Vista previa
                </button>
                <button onClick={() => guardar(false)} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-on-surface text-white py-2.5 rounded text-sm font-dm hover:bg-gray-800 transition-colors disabled:opacity-60">
                  <Save size={14} /> Guardar
                </button>
                <button onClick={() => guardar(true)} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded text-sm font-dm hover:bg-red-700 transition-colors disabled:opacity-60">
                  <Download size={14} /> {loading ? '...' : 'Guardar + PDF'}
                </button>
              </div>
              {/* Fila 2: enviar por email */}
              <button
                onClick={handleEnviarEmail}
                disabled={loading || !emailCliente.trim()}
                className="w-full flex items-center justify-center gap-2 border border-white/50 py-2.5 rounded text-sm font-dm hover:border-on-surface hover:bg-white/50 transition-colors disabled:opacity-40">
                <Mail size={14} />
                {loading ? 'Enviando...' : `Enviar cotización por email`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── PANEL RESUMEN COTIZACIÓN (reutilizable en móvil y desktop) ──────────────
function QuotePanel({ items, setItems, conIva, setConIva, onCrear }) {
  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const iva = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto divide-y divide-white/40">
        {items.length === 0 ? (
          <p className="text-on-surface-variant text-sm font-dm text-center py-12">Sin ítems agregados</p>
        ) : items.map(item => (
          <div key={item._id} className="flex items-start gap-2 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-dm font-medium text-on-surface leading-snug">{item.descripcion}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{item.cantidad} × {clp(item.precioUnitario)}</p>
            </div>
            <span className="font-barlow text-sm font-bold shrink-0">{clp(item.total)}</span>
            <button onClick={() => setItems(prev => prev.filter(i => i._id !== item._id))}
              className="text-on-surface-variant active:text-primary shrink-0 mt-0.5 p-1"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="px-4 py-4 border-t border-white/50 space-y-2 bg-white">
          <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
            <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-primary" />
            <span className="text-on-surface-variant">IVA 19%</span>
          </label>
          <div className="flex justify-between text-sm font-dm text-on-surface-variant">
            <span>Subtotal</span><span>{clp(subtotal)}</span>
          </div>
          {conIva && <div className="flex justify-between text-sm font-dm text-on-surface-variant"><span>IVA</span><span>{clp(iva)}</span></div>}
          <div className="flex justify-between font-barlow text-xl font-bold border-t border-white/50 pt-2">
            <span>TOTAL</span><span>{clp(total)}</span>
          </div>
          <button onClick={onCrear}
            className="w-full flex items-center justify-center gap-2 bg-on-surface text-white py-3.5 rounded text-sm font-dm font-medium active:bg-primary transition-colors">
            Crear cotización formal <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────
export default function Cotizador() {
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [categoria, setCategoria] = useState('acrilico')
  const [multiplicador, setMultiplicador] = useState(2)
  const [items, setItems] = useState([])
  const [conIva, setConIva] = useState(true)
  const [modal, setModal] = useState(false)
  const [tabMovil, setTabMovil] = useState('calcular')
  const [vistaMode, setVistaMode] = useState('lista')
  const [globalQuery, setGlobalQuery] = useState('')
  const [precios, setPreciosState] = useState({})
  const [multiplicadoresOverride, setMultiplicadoresOverride] = useState({})

  useEffect(() => {
    getPreciosProductos().then(setPreciosState)
    getMultiplicadoresInstalacion().then(setMultiplicadoresOverride)
  }, [])

  const setPrecio = (id, valor) => {
    setPreciosState(prev => {
      const next = { ...prev, [id]: valor }
      savePreciosProductos(next).catch(() => {})
      return next
    })
  }

  const setValorMultiplicador = (id, valor) => {
    setMultiplicadoresOverride(prev => {
      const next = { ...prev, [id]: valor }
      saveMultiplicadoresInstalacion(next).catch(() => {})
      return next
    })
  }

  const multiplicadoresEfectivos = MULTIPLICADORES.map(m => ({
    ...m, valor: multiplicadoresOverride[m.id] ?? m.valor,
  }))

  const busquedaGlobal = globalQuery.trim()
    ? Object.entries(PRODUCTOS).flatMap(([catId, prods]) => {
        const cat = CATEGORIAS.find(c => c.id === catId)
        return prods
          .filter(p => normalizar(p.nombre).includes(normalizar(globalQuery.trim())))
          .map(p => ({ ...p, catId, catLabel: cat?.label || catId }))
      })
    : []

  const cargarClientes = () => getClientes().then(setClientes)
  useEffect(() => {
    cargarClientes()
    const handler = (e) => {
      setItems(prev => [...prev, { ...e.detail, _id: crypto.randomUUID() }])
      // En móvil, al agregar un ítem mostrar brevemente el badge
    }
    window.addEventListener('cotizador:agregar', handler)
    return () => window.removeEventListener('cotizador:agregar', handler)
  }, [])

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const iva = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva

  return (
    <PreciosContext.Provider value={{ precios, setPrecio }}>
    <MultiplicadoresContext.Provider value={{ multiplicadores: multiplicadoresEfectivos, setValorMultiplicador }}>
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {modal && (
        <ModalCrearCotizacion
          items={items.map(({ _id, ...r }) => r)}
          clienteId={clienteId}
          clienteNombre={clienteNombre}
          conIvaInicial={conIva}
          onClose={() => setModal(false)}
          onGuardado={() => setItems([])}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-2.5 pt-3 pb-2 md:px-6 md:pt-6 shrink-0">
        <div>
          <h1 className="font-barlow text-2xl md:text-4xl font-bold text-on-surface tracking-wide">COTIZADOR</h1>
          <p className="text-on-surface-variant text-[10px] md:text-xs font-dm hidden md:block">Selecciona categoría, ingresa medidas y agrega</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle lista / cuadrícula */}
          <div className="flex border border-white/50 rounded overflow-hidden">
            <button onClick={() => setVistaMode('lista')}
              title="Vista lista"
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-dm transition-colors ${vistaMode === 'lista' ? 'bg-on-surface text-white' : 'text-on-surface-variant hover:bg-white/50'}`}>
              <List size={13} /><span className="hidden sm:inline">Lista</span>
            </button>
            <button onClick={() => setVistaMode('cuadricula')}
              title="Vista cuadrícula"
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-dm border-l border-white/50 transition-colors ${vistaMode === 'cuadricula' ? 'bg-on-surface text-white' : 'text-on-surface-variant hover:bg-white/50'}`}>
              <LayoutGrid size={13} /><span className="hidden sm:inline">Cuadrícula</span>
            </button>
          </div>
          {items.length > 0 && (
            <button onClick={() => setItems([])}
              className="flex items-center gap-1.5 text-xs font-dm text-on-surface-variant border border-white/50 px-2.5 py-1.5 rounded">
              <RotateCcw size={11} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Barra de cliente */}
      <div className="px-2.5 md:px-6 shrink-0">
        <ClienteBar
          clienteId={clienteId} setClienteId={setClienteId}
          clienteNombre={clienteNombre} setClienteNombre={setClienteNombre}
          clientes={clientes} onClienteGuardado={cargarClientes}
        />
      </div>

      {/* Buscador global */}
      <div className="px-2.5 md:px-6 pb-2 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            value={globalQuery}
            onChange={e => setGlobalQuery(e.target.value)}
            placeholder="Buscar en todos los productos..."
            className="w-full border border-white/50 rounded pl-8 pr-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface bg-white"
          />
          {globalQuery && (
            <button onClick={() => setGlobalQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── MÓVIL: Tab bar ─────────────────────────────────────────────── */}
      <div className="flex lg:hidden border-b border-white/40 bg-white/50 backdrop-blur-xl shrink-0 mx-2.5 md:mx-6 rounded-t-widget overflow-hidden">
        <button
          onClick={() => setTabMovil('calcular')}
          className={`flex-1 py-2.5 text-sm font-dm font-medium border-b-2 transition-colors ${
            tabMovil === 'calcular' ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant'
          }`}>
          Calcular
        </button>
        <button
          onClick={() => setTabMovil('cotizacion')}
          className={`flex-1 py-2.5 text-sm font-dm font-medium border-b-2 transition-colors relative ${
            tabMovil === 'cotizacion' ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant'
          }`}>
          Cotización
          {items.length > 0 && (
            <span className="absolute top-1.5 right-6 w-4 h-4 bg-primary text-white text-[9px] rounded-full flex items-center justify-center font-dm font-bold">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── MÓVIL: Vista Calcular ───────────────────────────────────────── */}
      <div className={`flex-1 overflow-hidden flex flex-col lg:hidden ${tabMovil === 'calcular' ? 'flex' : 'hidden'}`}>
        {globalQuery.trim() ? (
          /* Resultados búsqueda global */
          <div className="flex-1 overflow-hidden flex flex-col mx-2.5 mb-2">
            <BusquedaGlobalPanel resultados={busquedaGlobal} query={globalQuery} multiplicador={multiplicador} />
          </div>
        ) : vistaMode === 'lista' ? (
          <>
            {/* Chips de categoría (scroll horizontal) */}
            <div className="flex gap-2 overflow-x-auto px-2.5 py-2.5 shrink-0 scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {CATEGORIAS.map(cat => (
                <button key={cat.id} onClick={() => setCategoria(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-dm border transition-colors ${
                    categoria === cat.id
                      ? 'bg-on-surface text-white border-on-surface'
                      : 'bg-white text-on-surface-variant border-white/50'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
            {/* Productos */}
            <div className="flex-1 overflow-y-auto glass-panel mx-2.5 rounded-widget mb-2">
              <CategoriaPanel categoria={categoria} multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
            </div>
          </>
        ) : (
          /* Vista cuadrícula */
          <CuadriculaPanel
            categoria={categoria} setCategoria={setCategoria}
            multiplicador={multiplicador} setMultiplicador={setMultiplicador}
          />
        )}
      </div>

      {/* ─── MÓVIL: Vista Cotización ─────────────────────────────────────── */}
      <div className={`flex-1 overflow-hidden flex flex-col lg:hidden glass-panel mx-2.5 rounded-widget mb-2 ${tabMovil === 'cotizacion' ? 'flex' : 'hidden'}`}>
        <QuotePanel
          items={items} setItems={setItems}
          conIva={conIva} setConIva={setConIva}
          onCrear={() => setModal(true)}
        />
      </div>

      {/* ─── DESKTOP: Layout 3 columnas ─────────────────────────────────── */}
      <div className="hidden lg:grid grid-cols-12 gap-4 flex-1 overflow-hidden px-6 pb-6 md:px-8 md:pb-8">
        {/* Categorías — lista o cuadrícula */}
        <div className={`glass-panel rounded-widget overflow-y-auto ${vistaMode === 'cuadricula' ? 'col-span-3' : 'col-span-2'}`}>
          {vistaMode === 'lista' ? (
            CATEGORIAS.map(cat => (
              <button key={cat.id} onClick={() => setCategoria(cat.id)}
                className={`w-full text-left px-3 py-2.5 text-sm font-dm border-l-2 transition-all ${
                  categoria === cat.id
                    ? 'border-primary bg-white/50 font-medium text-on-surface'
                    : 'border-transparent text-on-surface-variant hover:bg-white/50 hover:text-on-surface'
                }`}>
                {cat.label}
              </button>
            ))
          ) : (
            <div className="grid grid-cols-2 gap-1.5 p-2">
              {CATEGORIAS.map(cat => {
                const activa = cat.id === categoria
                return (
                  <button key={cat.id} onClick={() => setCategoria(cat.id)}
                    className={`text-left p-2.5 rounded border transition-all ${activa ? 'bg-on-surface border-on-surface' : 'bg-white border-white/50 hover:border-on-surface'}`}>
                    <p className={`text-xs font-dm font-semibold leading-tight ${activa ? 'text-white' : 'text-on-surface'}`}>{cat.label}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Productos */}
        <div className={`glass-panel rounded-widget overflow-y-auto ${vistaMode === 'cuadricula' ? 'col-span-5' : 'col-span-6'}`}>
          <div className="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-white/40 px-4 py-2.5 z-10">
            {globalQuery.trim() ? (
              <p className="text-sm font-dm text-on-surface-variant">
                {busquedaGlobal.length} resultado{busquedaGlobal.length !== 1 ? 's' : ''} para "{globalQuery}"
              </p>
            ) : (
              <h2 className="font-barlow text-sm font-bold tracking-wider text-on-surface uppercase">
                {CATEGORIAS.find(c => c.id === categoria)?.label}
              </h2>
            )}
          </div>
          {globalQuery.trim() ? (
            busquedaGlobal.length > 0
              ? busquedaGlobal.map(p => <ProductoFila key={`${p.catId}-${p.id}`} producto={p} multiplicador={multiplicador} />)
              : <p className="p-6 text-sm text-on-surface-variant font-dm text-center">No se encontró ningún producto</p>
          ) : (
            <CategoriaPanel categoria={categoria} multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
          )}
        </div>

        {/* Cotización */}
        <div className="col-span-4 glass-panel rounded-widget flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/40 flex items-center justify-between shrink-0">
            <h2 className="font-barlow text-sm font-bold tracking-wider">COTIZACIÓN</h2>
            <span className="text-xs text-on-surface-variant font-dm">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          </div>
          <QuotePanel
            items={items} setItems={setItems}
            conIva={conIva} setConIva={setConIva}
            onCrear={() => setModal(true)}
          />
        </div>
      </div>
    </div>
    </MultiplicadoresContext.Provider>
    </PreciosContext.Provider>
  )
}
