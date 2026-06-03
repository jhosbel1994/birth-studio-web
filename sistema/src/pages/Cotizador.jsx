import { useState, useEffect } from 'react'
import {
  CATEGORIAS, PRODUCTOS, MULTIPLICADORES,
  TARJETAS, BANDERAS_VELA, VOLANTES,
  BASTIDORES_PROVEEDOR, BASTIDORES_BIRTH, PALOMAS, PENDONES,
} from '../data/productos'
import { getClientes, saveCliente, saveCotizacion, getClienteById, getMiscelaneos, saveMiscelaneo, deleteMiscelaneo } from '../utils/storage'
import { generarCotizacionPDF } from '../utils/pdf'
import { enviarCotizacionEmailJS, abrirGmailCompose } from '../utils/email'
import { clp, hoy, sumarDias } from '../utils/formatters'
import {
  Plus, Trash2, RotateCcw, ArrowRight,
  User, UserPlus, X, Download, Save, Mail, Eye, Pencil,
  LayoutGrid, List, Search,
} from 'lucide-react'

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
    <div className="bg-white border border-birth-gray-2 rounded px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
      <span className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider shrink-0">Cliente:</span>

      {/* Toggle modo */}
      <div className="flex gap-1 shrink-0">
        <button onClick={() => setModo('existente')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-dm border transition-colors ${modo === 'existente' ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
          <User size={12} /> Existente
        </button>
        <button onClick={() => setModo('rapido')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-dm border transition-colors ${modo === 'rapido' ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
          <UserPlus size={12} /> Rápido
        </button>
      </div>

      {/* Campos según modo */}
      {modo === 'existente' ? (
        <select value={clienteId} onChange={e => handleSeleccionar(e.target.value)}
          className="flex-1 min-w-40 max-w-xs border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
          <option value="">Sin cliente</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` — ${c.empresa}` : ''}</option>)}
        </select>
      ) : (
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <input
            value={nombre}
            onChange={e => handleNombreChange(e.target.value)}
            placeholder="Nombre *"
            className="border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black w-36"
          />
          <input value={rut} onChange={e => setRut(e.target.value)} placeholder="RUT"
            className="border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black w-28" />
          <button
            onClick={handleGuardarEnBD}
            disabled={!nombre.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-birth-black text-white rounded text-xs font-dm hover:bg-birth-red transition-colors disabled:opacity-40">
            <Save size={11} /> Guardar en BD
          </button>
        </div>
      )}

      {/* Badge cliente activo */}
      {clienteNombre && (
        <div className="flex items-center gap-1.5 bg-birth-gray px-3 py-1.5 rounded shrink-0">
          <User size={12} className="text-birth-gray-3" />
          <span className="text-xs font-dm font-medium text-birth-black">{clienteNombre}</span>
          <button onClick={() => { setClienteId(''); setClienteNombre('') }} className="text-birth-gray-3 hover:text-birth-red ml-1">
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
  const [agValue, setAgValue] = useState(null) // último precio calculado
  const [added, setAdded] = useState(false)

  // Esta fila reporta al padre vía callback — usamos ref approach
  // Para simplificar, emitimos un evento custom
  const u = producto.unidad

  let total = 0
  if (u === 'm2') {
    const area = parseFloat(d1 || 0) * parseFloat(d2 || 0)
    if (area > 0) total = producto.aplicaMultiplicador
      ? Math.round(area * producto.precio * multiplicador)
      : Math.round(area * producto.precio)
  } else if (u === 'ml') {
    const ml = parseFloat(d1 || 0)
    if (ml > 0) total = producto.aplicaMultiplicador
      ? Math.round(ml * producto.precio * multiplicador)
      : Math.round(ml * producto.precio)
  } else if (u === 'libre') {
    total = parseFloat(d1 || 0)
  } else {
    const qty = parseFloat(d1 || 0) || 1
    if (producto.precio > 0) total = producto.aplicaMultiplicador
      ? Math.round(qty * producto.precio * multiplicador)
      : Math.round(qty * producto.precio)
  }

  const canAdd = total > 0

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
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 px-4 py-2.5 border-b border-birth-gray-2 transition-colors ${added ? 'bg-green-50' : 'hover:bg-birth-gray'}`}>
      {/* Nombre + precio unitario — fila completa en móvil */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-dm font-medium leading-snug text-birth-black">{producto.nombre}</p>
        {producto.precio > 0 && (
          <p className="text-[11px] text-birth-gray-3 font-dm">
            {clp(producto.precio)}/{u === 'libre' ? 'libre' : u}
            {producto.aplicaMultiplicador && <span className="ml-1 text-birth-red">×{multiplicador}</span>}
          </p>
        )}
      </div>

      {/* Inputs + total + botón — segunda fila en móvil */}
      <div className="flex items-center gap-2">
        {/* Inputs según unidad */}
        {u === 'm2' && (
          <div className="flex items-center gap-1 shrink-0">
            <input type="number" min="0" step="0.01" value={d1} onChange={e => setD1(e.target.value)}
              placeholder="Ancho" className="w-14 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
            <span className="text-birth-gray-3 text-xs">×</span>
            <input type="number" min="0" step="0.01" value={d2} onChange={e => setD2(e.target.value)}
              placeholder="Alto" className="w-14 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
        )}
        {u === 'ml' && (
          <input type="number" min="0" step="0.01" value={d1} onChange={e => setD1(e.target.value)}
            placeholder="mt" className="w-16 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        )}
        {['unidad', 'plancha', 'hora', 'set', 'dia'].includes(u) && (
          <input type="number" min="1" value={d1 || ''} onChange={e => setD1(e.target.value)}
            placeholder="1" className="w-14 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        )}
        {u === 'libre' && (
          <input type="number" min="0" value={d1} onChange={e => setD1(e.target.value)}
            placeholder="$" className="w-20 text-right border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        )}
        {['proyecto', 'año'].includes(u) && (
          <span className="text-xs text-birth-gray-3 font-dm w-14 text-right">{clp(producto.precio)}</span>
        )}

        {/* Total preview */}
        <span className={`text-sm font-dm font-bold w-20 text-right shrink-0 ${total > 0 ? 'text-birth-black' : 'text-birth-gray-2'}`}>
          {total > 0 ? clp(total) : '—'}
        </span>

        {/* Botón agregar */}
        <button onClick={handleAdd} disabled={!canAdd}
          className={`w-8 h-8 flex items-center justify-center rounded shrink-0 transition-all ${canAdd ? 'bg-birth-red text-white hover:bg-red-700' : 'bg-birth-gray-2 text-birth-gray-3 cursor-not-allowed'}`}>
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
  const cArea   = cForma === 'rectangular'
    ? (parseFloat(cAncho) || 0) * (parseFloat(cAlto) || 0) / 10000
    : Math.PI * Math.pow((parseFloat(cDiam) || 0) / 2, 2) / 10000
  const cPrecio = cArea > 0 ? Math.round(cArea * precioM2Custom) : 0

  const handleAddCustom = () => {
    if (!cPrecio) return
    const tipoLabel = AFICHES_TIPOS.find(t => t.id === tipo)?.label
    const forma = cForma === 'rectangular' ? `${cAncho}×${cAlto}cm` : `Ø${cDiam}cm`
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: {
        descripcion: `Acrílico personalizado ${forma} ${cGrosor} — ${tipoLabel} (${cArea.toFixed(3)} m²)`,
        cantidad: 1, precioUnitario: cPrecio, total: cPrecio,
      }
    }))
    setCAncho(''); setCAlto(''); setCDiam('')
  }

  function precioMedida(m) {
    return Math.round(m.m2 * (PRECIO_M2_AFICHES[tipo]?.[grosor] || 0))
  }

  const medida   = medidaIdx !== null ? AFICHES_MEDIDAS[medidaIdx] : null
  const base     = medida ? precioMedida(medida) : 0
  const costDist = (conDistPeq ? cantDistPeq * 1500 : 0) + (conDistGrande ? cantDistGrande * 2500 : 0)
  let subtotal   = base + costDist
  if (instalacion === 'sin_andamio') subtotal = Math.round(subtotal * 1.5)
  if (instalacion === 'con_andamio') subtotal = Math.round(subtotal * 1.5) + andamioCuerpos * 5000
  const iva   = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva

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
    <div className="divide-y divide-birth-gray-2">

      {/* ── Filtros ── */}
      <div className="p-4 space-y-4">
        {/* Grosor */}
        <div>
          <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider mb-2">Grosor</p>
          <div className="flex gap-1.5">
            {['3mm', '5mm'].map(g => (
              <button key={g} onClick={() => setGrosor(g)}
                className={`px-5 py-1.5 rounded text-sm font-dm border transition-colors ${grosor === g ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                {g}
              </button>
            ))}
          </div>
          {grosor === '5mm' && (
            <p className="text-[11px] text-birth-red font-dm mt-1.5">+$15.000 × m² sobre precio base</p>
          )}
        </div>

        {/* Tipo */}
        <div>
          <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider mb-2">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {AFICHES_TIPOS.map(t => (
              <button key={t.id} onClick={() => setTipo(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-dm border transition-colors ${tipo === t.id ? 'bg-birth-red text-white border-birth-red' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabla de precios ── */}
      <div>
        <div className="px-4 py-2 bg-birth-gray">
          <p className="text-[10px] font-dm font-bold uppercase tracking-wider text-birth-gray-4">
            Selecciona medida — {AFICHES_TIPOS.find(t => t.id === tipo)?.label} · {grosor}
          </p>
        </div>
        {AFICHES_MEDIDAS.map((m, i) => {
          const precio = precioMedida(m)
          const sel    = medidaIdx === i
          return (
            <button key={i} onClick={() => setMedidaIdx(sel ? null : i)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-birth-gray-2 text-left transition-colors ${sel ? 'bg-birth-black' : 'hover:bg-birth-gray'}`}>
              <div className="flex-1">
                <p className={`text-sm font-dm font-semibold ${sel ? 'text-white' : 'text-birth-black'}`}>{m.label}</p>
                <p className={`text-[11px] font-dm ${sel ? 'text-white/50' : 'text-birth-gray-3'}`}>{m.m2} m²{grosor === '5mm' ? ` · +${clp(Math.round(m.m2*15000))}` : ''}</p>
              </div>
              <span className={`font-barlow font-bold text-lg ${sel ? 'text-white' : 'text-birth-black'}`}>{clp(precio)}</span>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${sel ? 'border-white' : 'border-birth-gray-2'}`}>
                {sel && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Adicionales ── */}
      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">Adicionales</p>

        {/* Distanciadores pequeños */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={conDistPeq} onChange={e => setConDistPeq(e.target.checked)} className="accent-birth-black" />
          <span className="text-sm font-dm text-birth-gray-4 flex-1">Distanciadores pequeños — $1.500 c/u</span>
          {conDistPeq && (
            <input type="number" min="1" value={cantDistPeq} onChange={e => setCantDistPeq(parseInt(e.target.value) || 1)}
              className="w-16 text-center border border-birth-gray-2 rounded px-2 py-1 text-sm font-dm focus:outline-none focus:border-birth-black" />
          )}
        </label>
        {/* Distanciadores grandes */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={conDistGrande} onChange={e => setConDistGrande(e.target.checked)} className="accent-birth-black" />
          <span className="text-sm font-dm text-birth-gray-4 flex-1">Distanciadores grandes — $2.500 c/u</span>
          {conDistGrande && (
            <input type="number" min="1" value={cantDistGrande} onChange={e => setCantDistGrande(parseInt(e.target.value) || 1)}
              className="w-16 text-center border border-birth-gray-2 rounded px-2 py-1 text-sm font-dm focus:outline-none focus:border-birth-black" />
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
                onChange={() => setInstalacion(op.id)} className="accent-birth-black" />
              <span className="text-sm font-dm text-birth-gray-4 flex-1">{op.label}</span>
              {op.id === 'con_andamio' && instalacion === 'con_andamio' && (
                <div className="flex items-center gap-1.5">
                  <input type="number" min="1" value={andamioCuerpos} onChange={e => setAndamioCuerpos(parseInt(e.target.value) || 1)}
                    className="w-14 text-center border border-birth-gray-2 rounded px-2 py-1 text-sm font-dm focus:outline-none focus:border-birth-black" />
                  <span className="text-xs text-birth-gray-3 font-dm">cuerpos</span>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* ── Resumen + totales ── */}
      <div className="p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-birth-black" />
          <span className="text-sm font-dm text-birth-gray-4">Incluir IVA 19% (solo vista previa)</span>
        </label>

        {medida ? (
          <div className="bg-birth-gray rounded p-4 space-y-1.5">
            <div className="flex justify-between text-sm font-dm text-birth-gray-4">
              <span>{medida.label} · {grosor} · {AFICHES_TIPOS.find(t => t.id === tipo)?.label}</span>
              <span>{clp(base)}</span>
            </div>
            {conDistPeq && (
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>Dist. pequeños ×{cantDistPeq}</span><span>{clp(cantDistPeq * 1500)}</span>
              </div>
            )}
            {conDistGrande && (
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>Dist. grandes ×{cantDistGrande}</span><span>{clp(cantDistGrande * 2500)}</span>
              </div>
            )}
            {instalacion === 'sin_andamio' && (
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>Instalación s/andamio</span><span>× 1.5</span>
              </div>
            )}
            {instalacion === 'con_andamio' && (
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>Instalación c/andamio ({andamioCuerpos} cuerpos)</span>
                <span>× 1.5 + {clp(andamioCuerpos * 5000)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-dm text-birth-gray-4 border-t border-birth-gray-2 pt-1.5">
              <span>Subtotal neto</span><span>{clp(subtotal)}</span>
            </div>
            {conIva && (
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>IVA 19%</span><span>{clp(iva)}</span>
              </div>
            )}
            <div className="flex justify-between font-barlow text-2xl font-bold pt-1">
              <span>TOTAL</span><span className="text-birth-red">{clp(total)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-birth-gray rounded p-4 text-center">
            <p className="text-sm font-dm text-birth-gray-3">Selecciona una medida en la tabla</p>
          </div>
        )}

        <button onClick={handleAdd} disabled={!medida || !subtotal}
          className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={15} /> Agregar a cotización
        </button>
      </div>

      {/* ── Acrílico personalizado por m² ── */}
      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm font-bold uppercase tracking-wider text-birth-gray-4">Medida personalizada</p>

        {/* Grosor propio del calculador */}
        <div className="flex gap-1.5">
          {['3mm', '5mm'].map(g => (
            <button key={g} onClick={() => setCGrosor(g)}
              className={`flex-1 py-1.5 rounded text-sm font-dm border transition-colors ${cGrosor === g ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
              {g}
            </button>
          ))}
        </div>

        {/* Precio/m² editable */}
        <div>
          <label className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider block mb-1.5">
            Precio por m² — {AFICHES_TIPOS.find(t => t.id === tipo)?.label} · {cGrosor}
            <span className="ml-1 normal-case text-birth-gray-3">(editable)</span>
          </label>
          <input
            type="number" min="0"
            value={cPrecioM2}
            onChange={e => setCPrecioM2(e.target.value)}
            className="w-full border-2 border-birth-black rounded px-3 py-2 text-lg font-barlow font-bold focus:outline-none focus:border-birth-red"
          />
          {cPrecioM2 && parseFloat(cPrecioM2) !== precioM2Sugerido && (
            <button onClick={() => setCPrecioM2(String(precioM2Sugerido))}
              className="text-[11px] font-dm text-birth-red mt-1 hover:underline">
              Restaurar sugerido ({clp(precioM2Sugerido)}/m²)
            </button>
          )}
        </div>

        {/* Selector forma */}
        <div className="flex gap-1.5">
          {[{ id: 'rectangular', label: 'Rectangular' }, { id: 'circular', label: 'Circular' }].map(f => (
            <button key={f.id} onClick={() => setCForma(f.id)}
              className={`flex-1 py-1.5 rounded text-sm font-dm border transition-colors ${cForma === f.id ? 'bg-birth-red text-white border-birth-red' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Inputs dimensiones */}
        {cForma === 'rectangular' ? (
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min="0" value={cAncho} onChange={e => setCAncho(e.target.value)}
              placeholder="Ancho (cm)"
              className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            <input type="number" min="0" value={cAlto} onChange={e => setCAlto(e.target.value)}
              placeholder="Alto (cm)"
              className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
        ) : (
          <input type="number" min="0" value={cDiam} onChange={e => setCDiam(e.target.value)}
            placeholder="Diámetro (cm)"
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
        )}

        {/* Resultado */}
        {cArea > 0 && (
          <div className="bg-birth-black rounded px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-dm text-white/60">{cArea.toFixed(4)} m² × {clp(precioM2Custom)}/m²{parseFloat(cPrecioM2) !== precioM2Sugerido ? ' ✎' : ''}</p>
              <p className="text-[11px] font-dm text-white/40">{cForma === 'circular' ? 'π × (Ø/2)²' : 'ancho × alto'}</p>
            </div>
            <span className="font-barlow font-bold text-2xl text-white">{clp(cPrecio)}</span>
          </div>
        )}

        <button onClick={handleAddCustom} disabled={!cPrecio}
          className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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

  if (!productos.length) return <p className="p-4 text-sm text-birth-gray-3 font-dm">Sin productos en esta categoría.</p>

  const tieneMultiplicador = productos.some(p => p.aplicaMultiplicador)
  const filtrados = query.trim()
    ? productos.filter(p => normalizar(p.nombre).includes(normalizar(query.trim())))
    : productos

  return (
    <div>
      {tieneMultiplicador && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-birth-gray border-b border-birth-gray-2">
          <span className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Instalación:</span>
          <div className="flex gap-1">
            {MULTIPLICADORES.map(m => (
              <button key={m.id} onClick={() => setMultiplicador(m.valor)}
                className={`px-2.5 py-1 rounded text-xs font-dm border transition-colors ${multiplicador === m.valor ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                ×{m.valor}
              </button>
            ))}
          </div>
          <span className="text-xs text-birth-gray-3 font-dm ml-1">
            {MULTIPLICADORES.find(m => m.valor === multiplicador)?.label}
          </span>
        </div>
      )}
      <div className="px-4 py-2 bg-white border-b border-birth-gray-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black"
        />
      </div>
      <div className="px-2 py-1 bg-birth-gray border-b border-birth-gray-2">
        <div className="hidden sm:flex items-center text-[10px] text-birth-gray-3 font-dm uppercase tracking-wider px-2 gap-2">
          <span className="flex-1">Producto</span>
          <span className="w-32">Medida / Cantidad</span>
          <span className="w-20 text-right">Total</span>
          <span className="w-8"></span>
        </div>
      </div>
      {filtrados.length === 0
        ? <p className="p-4 text-sm text-birth-gray-3 font-dm">Sin resultados para "{query}"</p>
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
        className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
        {materiales.map(m => (
          <option key={m.id} value={m.id}>{m.label} — costo {clp(m.costoM2)}/m²</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" value={ancho} onChange={e => setAncho(e.target.value)}
          placeholder="Ancho (cm)"
          className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
        <input type="number" min="0" value={alto} onChange={e => setAlto(e.target.value)}
          placeholder="Alto (cm)"
          className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
      </div>

      {area > 0 && (
        <p className="text-xs text-birth-gray-3 font-dm">Área: {area.toFixed(4)} m²</p>
      )}

      <div>
        <label className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider block mb-1">
          Precio de venta por m² (editable)
        </label>
        <input type="number" min="0" value={precioM2} onChange={e => setPrecioM2(e.target.value)}
          placeholder="$ por m²"
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
      </div>

      <div className="flex items-center justify-between bg-birth-gray rounded px-4 py-2.5">
        <span className="text-xs font-dm text-birth-gray-4">Total estimado</span>
        <span className="font-barlow text-xl font-bold">{total > 0 ? clp(total) : '—'}</span>
      </div>

      <button onClick={handleAdd} disabled={!area || !total}
        className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
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
    <div className="px-4 py-1.5 bg-birth-gray border-b border-birth-gray-2">
      <span className="text-[10px] font-dm font-bold uppercase tracking-wider text-birth-gray-4">{label}</span>
    </div>
  )

  return (
    <div>
      {/* Selector instalación */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-birth-gray border-b border-birth-gray-2">
        <span className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Instalación:</span>
        <div className="flex gap-1">
          {MULTIPLICADORES.map(m => (
            <button key={m.id} onClick={() => setMultiplicador(m.valor)}
              className={`px-2.5 py-1 rounded text-xs font-dm border transition-colors ${multiplicador === m.valor ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
              ×{m.valor}
            </button>
          ))}
        </div>
        <span className="text-xs text-birth-gray-3 font-dm ml-1">
          {MULTIPLICADORES.find(m => m.valor === multiplicador)?.label}
        </span>
      </div>

      {/* Buscador */}
      <div className="px-4 py-2 bg-white border-b border-birth-gray-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black"
        />
      </div>

      {/* Cabecera columnas */}
      <div className="px-2 py-1 bg-birth-gray border-b border-birth-gray-2">
        <div className="hidden sm:flex items-center text-[10px] text-birth-gray-3 font-dm uppercase tracking-wider px-2 gap-2">
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
        <p className="p-4 text-sm text-birth-gray-3 font-dm">Sin resultados para "{query}"</p>
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
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <select value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {TARJETAS.cantidades.map(n => <option key={n} value={n}>{n} und</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Caras</label>
          <select value={caras} onChange={e => setCaras(e.target.value)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            <option value="1cara">1 cara</option>
            <option value="2caras">2 caras</option>
          </select>
        </div>
      </div>
      {!usarBirth && (
        <div className="flex gap-2">
          {MULTIPLICADORES.map(m => (
            <button key={m.id} onClick={() => setMult(m.valor)}
              className={`flex-1 py-1.5 rounded text-xs font-dm border ${mult === m.valor ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2'}`}>
              ×{m.valor}
            </button>
          ))}
        </div>
      )}
      {precBirth && (
        <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
          <input type="checkbox" checked={usarBirth} onChange={e => setUsarBirth(e.target.checked)} className="accent-birth-black" />
          <span className="text-birth-gray-4">Precio Birth directo ({clp(precBirth)})</span>
        </label>
      )}
      <div className="flex items-center justify-between bg-birth-black text-white rounded px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{precio ? clp(precio) : '—'}</span>
      </div>
      <button onClick={add} disabled={!precio}
        className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
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
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Medida</label>
        <select value={medida} onChange={e => setMedida(e.target.value)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
          {VOLANTES.medidas.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Caras</label>
          <select value={caras} onChange={e => setCaras(e.target.value)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {VOLANTES.caras.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <select value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {VOLANTES.cantidades.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between bg-birth-black text-white rounded px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{precio ? clp(precio) : '—'}</span>
      </div>
      <button onClick={add} disabled={!precio}
        className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

function BastidoresPanel({ multiplicador }) {
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
            className={`flex-1 py-1.5 rounded text-xs font-dm border transition-colors ${tipo === t ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2'}`}>
            {t === 'proveedor' ? 'Proveedor' : 'Precio Birth'}
          </button>
        ))}
      </div>
      {tipo === 'proveedor' ? (
        <>
          <select value={selProv} onChange={e => setSelProv(e.target.value)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {BASTIDORES_PROVEEDOR.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={caras} onChange={e => setCaras(e.target.value)} className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
              <option value="una">1 cara</option>
              <option value="doble">Doble cara</option>
            </select>
            <select value={mult} onChange={e => setMult(parseInt(e.target.value))} className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
              {MULTIPLICADORES.map(m => <option key={m.id} value={m.valor}>×{m.valor}</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
            <input type="checkbox" checked={esPaloma} onChange={e => setEsPaloma(e.target.checked)} className="accent-birth-black" />
            <span className="text-birth-gray-4">Paloma publicitaria</span>
          </label>
          {esPaloma ? (
            <select value={selPaloma} onChange={e => setSelPaloma(e.target.value)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
              {PALOMAS.map(p => <option key={p.id} value={p.id}>{p.nombre} — {clp(p.precio)}</option>)}
            </select>
          ) : (
            <>
              <select value={selBirth} onChange={e => setSelBirth(e.target.value)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
                {BASTIDORES_BIRTH.map(b => <option key={b.id} value={b.id}>{b.nombre} — {clp(b.precio)}/m²</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" step="0.01" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="Ancho m" className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none" />
                <input type="number" min="0" step="0.01" value={alto} onChange={e => setAlto(e.target.value)} placeholder="Alto m" className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none" />
              </div>
            </>
          )}
        </>
      )}
      <div className="flex items-center justify-between bg-birth-black text-white rounded px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{precio ? clp(precio) : '—'}</span>
      </div>
      <button onClick={add} disabled={!precio}
        className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
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
      <select value={sel} onChange={e => setSel(e.target.value)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
        {PENDONES.map(p => <option key={p.id} value={p.id}>{p.nombre} — {clp(p.precio)}</option>)}
      </select>
      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
        <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none" />
      </div>
      <div className="flex items-center justify-between bg-birth-black text-white rounded px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{clp(total)}</span>
      </div>
      <button onClick={add} className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

function BanderaVelaPanel({ multiplicador }) {
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
      <select value={sel} onChange={e => setSel(e.target.value)} className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
        {BANDERAS_VELA.map(b => <option key={b.id} value={b.id}>{b.nombre} — {clp(b.precio)}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none" placeholder="Cantidad" />
        {p?.aplicaMultiplicador && (
          <select value={mult} onChange={e => setMult(parseInt(e.target.value))} className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
            {MULTIPLICADORES.map(m => <option key={m.id} value={m.valor}>×{m.valor}</option>)}
          </select>
        )}
      </div>
      <div className="flex items-center justify-between bg-birth-black text-white rounded px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{clp(total)}</span>
      </div>
      <button onClick={add} className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700">
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
        <div className="px-4 py-8 text-center text-birth-gray-3 text-sm font-dm">
          <p>Sin misceláneos. Agrega tornillos, escuadras, pintura, etc.</p>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-birth-gray-2 hover:bg-birth-gray">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-dm font-medium truncate">{item.nombre}</p>
            <p className="text-[11px] text-birth-gray-3 font-dm">{clp(item.precio)}/unidad</p>
          </div>
          <button onClick={() => setForm({ ...item })}
            className="p-1.5 text-birth-gray-3 hover:text-birth-black shrink-0">
            <RotateCcw size={13} />
          </button>
          <button onClick={() => deleteMiscelaneo(item.id).then(recargar)}
            className="p-1.5 text-birth-gray-3 hover:text-birth-red shrink-0">
            <Trash2 size={13} />
          </button>
          <button onClick={() => handleAdd(item)}
            className="w-8 h-8 flex items-center justify-center rounded bg-birth-red text-white hover:bg-red-700 shrink-0">
            <Plus size={14} />
          </button>
        </div>
      ))}

      {/* Formulario nuevo/editar */}
      {form !== null ? (
        <form onSubmit={handleSave} className="p-4 border-t border-birth-gray-2 space-y-3 bg-birth-gray">
          <p className="text-xs font-dm font-medium text-birth-gray-4 uppercase tracking-wider">
            {form.id ? 'Editar ítem' : 'Nuevo misceláneo'}
          </p>
          <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre (ej: Tornillo autoperforante)" required
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white" />
          <div className="flex gap-2">
            <input type="number" min="0" value={form.precio || ''} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              placeholder="Precio por unidad" required
              className="flex-1 border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white" />
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 bg-birth-black text-white py-2 rounded text-sm font-dm hover:bg-birth-red transition-colors">
              {form.id ? 'Guardar cambios' : 'Agregar'}
            </button>
            <button type="button" onClick={() => setForm(null)}
              className="px-4 border border-birth-gray-2 rounded text-sm font-dm text-birth-gray-4 hover:border-birth-black">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-birth-gray-2">
          <button onClick={() => setForm({})}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-birth-gray-3 rounded py-2.5 text-sm font-dm text-birth-gray-4 hover:border-birth-black hover:text-birth-black transition-colors">
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
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del ítem" className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="0" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio unit." className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
        <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value)||1)} className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="Cant." />
      </div>
      <div className="flex items-center justify-between bg-birth-black text-white rounded px-4 py-2.5">
        <span className="text-xs font-dm opacity-60">Total</span>
        <span className="font-barlow text-xl font-bold">{total > 0 ? clp(total) : '—'}</span>
      </div>
      <button onClick={add} disabled={!desc || !precio}
        className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={15} /> Agregar
      </button>
    </div>
  )
}

// ─── PANEL RESULTADOS BÚSQUEDA GLOBAL ─────────────────────────────────────
function BusquedaGlobalPanel({ resultados, query, multiplicador }) {
  return (
    <div className="flex-1 overflow-y-auto bg-white rounded border border-birth-gray-2">
      <div className="px-4 py-2 bg-birth-gray border-b border-birth-gray-2 sticky top-0">
        <p className="text-xs font-dm text-birth-gray-4">
          {resultados.length > 0
            ? `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''} para "${query}"`
            : `Sin resultados para "${query}"`}
        </p>
      </div>
      {resultados.map(p => (
        <ProductoFila key={`${p.catId}-${p.id}`} producto={p} multiplicador={multiplicador} />
      ))}
      {resultados.length === 0 && (
        <p className="p-6 text-sm text-birth-gray-3 font-dm text-center">No se encontró ningún producto</p>
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
              className={`text-left p-3 rounded border transition-all ${activa ? 'bg-birth-black border-birth-black' : 'bg-white border-birth-gray-2 hover:border-birth-black'}`}>
              <p className={`text-sm font-dm font-semibold leading-tight ${activa ? 'text-white' : 'text-birth-black'}`}>
                {cat.label}
              </p>
              {n > 0 && <p className={`text-[11px] mt-0.5 font-dm ${activa ? 'text-white/60' : 'text-birth-gray-3'}`}>{n} productos</p>}
            </button>
          )
        })}
      </div>
      {categoria && (
        <div className="mx-2.5 bg-white rounded border border-birth-gray-2">
          <div className="px-4 py-2.5 border-b border-birth-gray-2 bg-birth-gray sticky top-0">
            <h3 className="font-barlow text-sm font-bold tracking-wider text-birth-black uppercase">
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
  if (categoria === 'afiches_acrilico') return <AfichesAcrilicosPanel />
  return <ProductosGenericos categoria={categoria} multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
}

// ─── PREVIEW PDF FULL SCREEN ──────────────────────────────────────────────
function PreviewPDF({ url, filename, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 bg-black/95 z-[70] flex flex-col">
      <div className="bg-birth-black px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-white font-barlow text-lg font-bold tracking-wide">VISTA PREVIA</p>
          <p className="text-white/40 text-xs font-dm">{filename}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDownload}
            className="flex items-center gap-2 bg-birth-red text-white px-4 py-2 rounded text-sm font-dm hover:bg-red-700 transition-colors">
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
function ModalCrearCotizacion({ items, clienteId, clienteNombre, onClose, onGuardado }) {
  const [descripcion, setDescripcion] = useState('')
  const [formaPago, setFormaPago] = useState('Transferencia bancaria — 50% anticipo, 50% contra entrega')
  const [plazo, setPlazo] = useState('')
  const [conIva, setConIva] = useState(true)
  const [emailCliente, setEmailCliente] = useState('')
  useEffect(() => {
    if (clienteId) getClienteById(clienteId).then(c => { if (c?.correo) setEmailCliente(c.correo) })
  }, [clienteId])
  const [loading, setLoading] = useState(false)
  const [msgEmail, setMsgEmail] = useState(null) // { tipo: 'ok'|'error', texto }
  const [preview, setPreview] = useState(null) // { url, filename }

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const iva = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva
  const anticipo = Math.round(total * 0.5)

  const buildCot = () => ({
    clienteId, clienteNombre,
    descripcion, formaPago, plazoEntrega: plazo,
    conIva, fecha: hoy(), validez: 15,
    fechaVencimiento: sumarDias(hoy(), 15),
    items, subtotal, iva, total,
    anticipo, saldo: anticipo,
    estado: 'por_aceptar',
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
        <div className="bg-white rounded w-full max-w-lg shadow-xl my-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t">
            <h2 className="font-barlow text-xl font-bold tracking-wide">CREAR COTIZACIÓN</h2>
            <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-4">
            {/* Resumen items */}
            <div className="bg-birth-gray rounded p-3 max-h-28 overflow-y-auto space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm font-dm">
                  <span className="text-birth-gray-4 truncate mr-3">{item.descripcion}</span>
                  <span className="font-medium shrink-0">{clp(item.total)}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Descripción del proyecto</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Forma de pago</label>
                <input value={formaPago} onChange={e => setFormaPago(e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
              </div>
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Plazo de entrega</label>
                <input value={plazo} onChange={e => setPlazo(e.target.value)} placeholder="5 días hábiles"
                  className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
              </div>
            </div>

            {/* Email cliente */}
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Email del cliente (para enviar)</label>
              <input type="email" value={emailCliente} onChange={e => setEmailCliente(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>

            {msgEmail && (
              <div className={`px-3 py-2 rounded text-sm font-dm ${msgEmail.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : msgEmail.tipo === 'error' ? 'bg-red-50 text-birth-red border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {msgEmail.texto}
              </div>
            )}

            {/* IVA + totales */}
            <div className="border-t border-birth-gray-2 pt-3 space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-dm cursor-pointer mb-2">
                <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-birth-black" />
                <span className="text-birth-gray-4">Incluir IVA 19%</span>
              </label>
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>Subtotal</span><span>{clp(subtotal)}</span>
              </div>
              {conIva && <div className="flex justify-between text-sm font-dm text-birth-gray-4"><span>IVA 19%</span><span>{clp(iva)}</span></div>}
              <div className="flex justify-between font-barlow text-xl font-bold">
                <span>TOTAL</span><span className="text-birth-red">{clp(total)}</span>
              </div>
            </div>

            {/* Botones — 2 filas */}
            <div className="space-y-2 pt-1">
              {/* Fila 1: preview + guardar + pdf */}
              <div className="flex gap-2">
                <button onClick={handlePreview} disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-birth-gray-2 rounded text-sm font-dm hover:border-birth-black transition-colors disabled:opacity-50">
                  <Eye size={14} /> Vista previa
                </button>
                <button onClick={() => guardar(false)} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-birth-black text-white py-2.5 rounded text-sm font-dm hover:bg-gray-800 transition-colors disabled:opacity-60">
                  <Save size={14} /> Guardar
                </button>
                <button onClick={() => guardar(true)} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm hover:bg-red-700 transition-colors disabled:opacity-60">
                  <Download size={14} /> {loading ? '...' : 'Guardar + PDF'}
                </button>
              </div>
              {/* Fila 2: enviar por email */}
              <button
                onClick={handleEnviarEmail}
                disabled={loading || !emailCliente.trim()}
                className="w-full flex items-center justify-center gap-2 border border-birth-gray-2 py-2.5 rounded text-sm font-dm hover:border-birth-black hover:bg-birth-gray transition-colors disabled:opacity-40">
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
      <div className="flex-1 overflow-y-auto divide-y divide-birth-gray-2">
        {items.length === 0 ? (
          <p className="text-birth-gray-3 text-sm font-dm text-center py-12">Sin ítems agregados</p>
        ) : items.map(item => (
          <div key={item._id} className="flex items-start gap-2 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-dm font-medium text-birth-black leading-snug">{item.descripcion}</p>
              <p className="text-xs text-birth-gray-3 mt-0.5">{item.cantidad} × {clp(item.precioUnitario)}</p>
            </div>
            <span className="font-barlow text-sm font-bold shrink-0">{clp(item.total)}</span>
            <button onClick={() => setItems(prev => prev.filter(i => i._id !== item._id))}
              className="text-birth-gray-3 active:text-birth-red shrink-0 mt-0.5 p-1"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="px-4 py-4 border-t border-birth-gray-2 space-y-2 bg-white">
          <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
            <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-birth-black" />
            <span className="text-birth-gray-4">IVA 19%</span>
          </label>
          <div className="flex justify-between text-sm font-dm text-birth-gray-4">
            <span>Subtotal</span><span>{clp(subtotal)}</span>
          </div>
          {conIva && <div className="flex justify-between text-sm font-dm text-birth-gray-4"><span>IVA</span><span>{clp(iva)}</span></div>}
          <div className="flex justify-between font-barlow text-xl font-bold border-t border-birth-gray-2 pt-2">
            <span>TOTAL</span><span>{clp(total)}</span>
          </div>
          <button onClick={onCrear}
            className="w-full flex items-center justify-center gap-2 bg-birth-black text-white py-3.5 rounded text-sm font-dm font-medium active:bg-birth-red transition-colors">
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
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {modal && (
        <ModalCrearCotizacion
          items={items.map(({ _id, ...r }) => r)}
          clienteId={clienteId}
          clienteNombre={clienteNombre}
          onClose={() => setModal(false)}
          onGuardado={() => setItems([])}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-2.5 pt-3 pb-2 md:px-6 md:pt-6 shrink-0">
        <div>
          <h1 className="font-barlow text-2xl md:text-4xl font-bold text-birth-black tracking-wide">COTIZADOR</h1>
          <p className="text-birth-gray-3 text-[10px] md:text-xs font-dm hidden md:block">Selecciona categoría, ingresa medidas y agrega</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle lista / cuadrícula */}
          <div className="flex border border-birth-gray-2 rounded overflow-hidden">
            <button onClick={() => setVistaMode('lista')}
              title="Vista lista"
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-dm transition-colors ${vistaMode === 'lista' ? 'bg-birth-black text-white' : 'text-birth-gray-4 hover:bg-birth-gray'}`}>
              <List size={13} /><span className="hidden sm:inline">Lista</span>
            </button>
            <button onClick={() => setVistaMode('cuadricula')}
              title="Vista cuadrícula"
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-dm border-l border-birth-gray-2 transition-colors ${vistaMode === 'cuadricula' ? 'bg-birth-black text-white' : 'text-birth-gray-4 hover:bg-birth-gray'}`}>
              <LayoutGrid size={13} /><span className="hidden sm:inline">Cuadrícula</span>
            </button>
          </div>
          {items.length > 0 && (
            <button onClick={() => setItems([])}
              className="flex items-center gap-1.5 text-xs font-dm text-birth-gray-4 border border-birth-gray-2 px-2.5 py-1.5 rounded">
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-birth-gray-3 pointer-events-none" />
          <input
            value={globalQuery}
            onChange={e => setGlobalQuery(e.target.value)}
            placeholder="Buscar en todos los productos..."
            className="w-full border border-birth-gray-2 rounded pl-8 pr-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white"
          />
          {globalQuery && (
            <button onClick={() => setGlobalQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-birth-gray-3 hover:text-birth-black">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── MÓVIL: Tab bar ─────────────────────────────────────────────── */}
      <div className="flex lg:hidden border-b border-birth-gray-2 bg-white shrink-0 mx-2.5 md:mx-6 rounded-t overflow-hidden">
        <button
          onClick={() => setTabMovil('calcular')}
          className={`flex-1 py-2.5 text-sm font-dm font-medium border-b-2 transition-colors ${
            tabMovil === 'calcular' ? 'border-birth-red text-birth-black' : 'border-transparent text-birth-gray-3'
          }`}>
          Calcular
        </button>
        <button
          onClick={() => setTabMovil('cotizacion')}
          className={`flex-1 py-2.5 text-sm font-dm font-medium border-b-2 transition-colors relative ${
            tabMovil === 'cotizacion' ? 'border-birth-red text-birth-black' : 'border-transparent text-birth-gray-3'
          }`}>
          Cotización
          {items.length > 0 && (
            <span className="absolute top-1.5 right-6 w-4 h-4 bg-birth-red text-white text-[9px] rounded-full flex items-center justify-center font-dm font-bold">
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
                      ? 'bg-birth-black text-white border-birth-black'
                      : 'bg-white text-birth-gray-4 border-birth-gray-2'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
            {/* Productos */}
            <div className="flex-1 overflow-y-auto bg-white mx-2.5 rounded border border-birth-gray-2 mb-2">
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
      <div className={`flex-1 overflow-hidden flex flex-col lg:hidden bg-white mx-2.5 rounded border border-birth-gray-2 mb-2 ${tabMovil === 'cotizacion' ? 'flex' : 'hidden'}`}>
        <QuotePanel
          items={items} setItems={setItems}
          conIva={conIva} setConIva={setConIva}
          onCrear={() => setModal(true)}
        />
      </div>

      {/* ─── DESKTOP: Layout 3 columnas ─────────────────────────────────── */}
      <div className="hidden lg:grid grid-cols-12 gap-4 flex-1 overflow-hidden px-6 pb-6 md:px-8 md:pb-8">
        {/* Categorías — lista o cuadrícula */}
        <div className={`bg-white border border-birth-gray-2 rounded overflow-y-auto ${vistaMode === 'cuadricula' ? 'col-span-3' : 'col-span-2'}`}>
          {vistaMode === 'lista' ? (
            CATEGORIAS.map(cat => (
              <button key={cat.id} onClick={() => setCategoria(cat.id)}
                className={`w-full text-left px-3 py-2.5 text-sm font-dm border-l-2 transition-all ${
                  categoria === cat.id
                    ? 'border-birth-red bg-birth-gray font-medium text-birth-black'
                    : 'border-transparent text-birth-gray-4 hover:bg-birth-gray hover:text-birth-black'
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
                    className={`text-left p-2.5 rounded border transition-all ${activa ? 'bg-birth-black border-birth-black' : 'bg-white border-birth-gray-2 hover:border-birth-black'}`}>
                    <p className={`text-xs font-dm font-semibold leading-tight ${activa ? 'text-white' : 'text-birth-black'}`}>{cat.label}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Productos */}
        <div className={`bg-white border border-birth-gray-2 rounded overflow-y-auto ${vistaMode === 'cuadricula' ? 'col-span-5' : 'col-span-6'}`}>
          <div className="sticky top-0 bg-white border-b border-birth-gray-2 px-4 py-2.5 z-10">
            {globalQuery.trim() ? (
              <p className="text-sm font-dm text-birth-gray-4">
                {busquedaGlobal.length} resultado{busquedaGlobal.length !== 1 ? 's' : ''} para "{globalQuery}"
              </p>
            ) : (
              <h2 className="font-barlow text-sm font-bold tracking-wider text-birth-black uppercase">
                {CATEGORIAS.find(c => c.id === categoria)?.label}
              </h2>
            )}
          </div>
          {globalQuery.trim() ? (
            busquedaGlobal.length > 0
              ? busquedaGlobal.map(p => <ProductoFila key={`${p.catId}-${p.id}`} producto={p} multiplicador={multiplicador} />)
              : <p className="p-6 text-sm text-birth-gray-3 font-dm text-center">No se encontró ningún producto</p>
          ) : (
            <CategoriaPanel categoria={categoria} multiplicador={multiplicador} setMultiplicador={setMultiplicador} />
          )}
        </div>

        {/* Cotización */}
        <div className="col-span-4 bg-white border border-birth-gray-2 rounded flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-birth-gray-2 flex items-center justify-between shrink-0">
            <h2 className="font-barlow text-sm font-bold tracking-wider">COTIZACIÓN</h2>
            <span className="text-xs text-birth-gray-3 font-dm">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          </div>
          <QuotePanel
            items={items} setItems={setItems}
            conIva={conIva} setConIva={setConIva}
            onCrear={() => setModal(true)}
          />
        </div>
      </div>
    </div>
  )
}
