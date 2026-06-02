import { useState, useEffect } from 'react'
import {
  CATEGORIAS, PRODUCTOS, MULTIPLICADORES,
  TARJETAS, BANDERAS_VELA, VOLANTES,
  BASTIDORES_PROVEEDOR, BASTIDORES_BIRTH, PALOMAS, PENDONES,
} from '../data/productos'
import { getClientes, saveCliente, saveCotizacion, getClienteById } from '../utils/storage'
import { generarCotizacionPDF } from '../utils/pdf'
import { enviarCotizacionEmailJS, abrirGmailCompose } from '../utils/email'
import { clp, hoy, sumarDias } from '../utils/formatters'
import {
  Plus, Trash2, RotateCcw, ArrowRight,
  User, UserPlus, X, Download, Save, Mail, Eye,
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

  const handleGuardarEnBD = () => {
    if (!nombre.trim()) return
    const c = saveCliente({ nombre, rut, empresa: '', ciudad: '', correo: '', telefono: '' })
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
    <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-birth-gray-2 transition-colors ${added ? 'bg-green-50' : 'hover:bg-birth-gray'}`}>
      {/* Nombre + precio unitario */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-dm font-medium truncate text-birth-black">{producto.nombre}</p>
        {producto.precio > 0 && (
          <p className="text-[11px] text-birth-gray-3 font-dm">
            {clp(producto.precio)}/{u === 'libre' ? 'libre' : u}
            {producto.aplicaMultiplicador && <span className="ml-1 text-birth-red">×{multiplicador}</span>}
          </p>
        )}
      </div>

      {/* Inputs según unidad */}
      {u === 'm2' && (
        <div className="flex items-center gap-1 shrink-0">
          <input type="number" min="0" step="0.01" value={d1} onChange={e => setD1(e.target.value)}
            placeholder="A" className="w-14 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          <span className="text-birth-gray-3 text-xs">×</span>
          <input type="number" min="0" step="0.01" value={d2} onChange={e => setD2(e.target.value)}
            placeholder="H" className="w-14 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
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
  )
}

// ─── PANEL DE PRODUCTOS GENÉRICO ──────────────────────────────────────────
function ProductosGenericos({ categoria, multiplicador, setMultiplicador }) {
  const productos = PRODUCTOS[categoria] || []
  if (!productos.length) return <p className="p-4 text-sm text-birth-gray-3 font-dm">Sin productos en esta categoría.</p>

  const tieneMultiplicador = productos.some(p => p.aplicaMultiplicador)

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
      <div className="px-2 py-1 bg-birth-gray border-b border-birth-gray-2">
        <div className="flex items-center text-[10px] text-birth-gray-3 font-dm uppercase tracking-wider px-2 gap-2">
          <span className="flex-1">Producto</span>
          <span className="w-32">Medida / Cantidad</span>
          <span className="w-20 text-right">Total</span>
          <span className="w-8"></span>
        </div>
      </div>
      {productos.map(p => (
        <ProductoFila key={p.id} producto={p} multiplicador={multiplicador} />
      ))}
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

// ─── PANEL DE PRODUCTOS SEGÚN CATEGORÍA ──────────────────────────────────
function CategoriaPanel({ categoria, multiplicador, setMultiplicador }) {
  if (categoria === 'tarjetas') return <TarjetasPanel multiplicador={multiplicador} />
  if (categoria === 'volantes') return <VolantesPanel />
  if (categoria === 'bastidor') return <BastidoresPanel multiplicador={multiplicador} />
  if (categoria === 'pendon') return <PendonesPanel />
  if (categoria === 'bandera_vela') return <BanderaVelaPanel multiplicador={multiplicador} />
  if (categoria === 'manual') return <ManualPanel />
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
  const [emailCliente, setEmailCliente] = useState(() => {
    // Pre-cargar email si el cliente está en BD
    if (clienteId) {
      const c = getClienteById(clienteId)
      return c?.correo || ''
    }
    return ''
  })
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
    const cot = saveCotizacion(buildCot())
    const cliente = getClienteById(clienteId) || { nombre: clienteNombre }
    if (conPdf) await generarCotizacionPDF(cot, cliente, 'download')
    setLoading(false)
    onGuardado()
    onClose()
  }

  const handlePreview = async () => {
    setLoading(true)
    const cotTmp = buildCot()
    cotTmp.numero = cotTmp.numero || '????'
    // Guardamos temporalmente para tener número
    const cot = saveCotizacion(cotTmp)
    const cliente = getClienteById(clienteId) || { nombre: clienteNombre }
    const result = await generarCotizacionPDF(cot, cliente, 'preview')
    setPreview(result)
    setLoading(false)
    onGuardado() // limpiar items ya que se guardó
  }

  const handleEnviarEmail = async () => {
    if (!emailCliente.trim()) return
    setLoading(true)
    setMsgEmail(null)
    const cot = saveCotizacion(buildCot())
    const cliente = getClienteById(clienteId) || { nombre: clienteNombre }

    // Intentar EmailJS primero, fallback a Gmail
    try {
      await enviarCotizacionEmailJS(cot, cliente, emailCliente)
      setMsgEmail({ tipo: 'ok', texto: `Email enviado a ${emailCliente}` })
      onGuardado()
    } catch {
      // Fallback: abrir Gmail compose + descargar PDF
      await generarCotizacionPDF(cot, cliente, 'download')
      abrirGmailCompose(cot, cliente, emailCliente)
      setMsgEmail({ tipo: 'info', texto: 'PDF descargado. Gmail abierto — adjunta el PDF al correo.' })
      onGuardado()
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

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────
export default function Cotizador() {
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [categoria, setCategoria] = useState('tela')
  const [multiplicador, setMultiplicador] = useState(2)
  const [items, setItems] = useState([])
  const [conIva, setConIva] = useState(true)
  const [modal, setModal] = useState(false)

  const cargarClientes = () => setClientes(getClientes())
  useEffect(() => {
    cargarClientes()
    const handler = (e) => {
      setItems(prev => [...prev, { ...e.detail, _id: crypto.randomUUID() }])
    }
    window.addEventListener('cotizador:agregar', handler)
    return () => window.removeEventListener('cotizador:agregar', handler)
  }, [])

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const iva = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva

  return (
    <div className="p-6 h-full">
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-barlow text-4xl font-bold text-birth-black tracking-wide">COTIZADOR</h1>
          <p className="text-birth-gray-3 text-xs font-dm mt-0.5">Selecciona categoría, ingresa medidas y agrega a la cotización</p>
        </div>
        {items.length > 0 && (
          <button onClick={() => setItems([])}
            className="flex items-center gap-1.5 text-sm font-dm text-birth-gray-4 hover:text-birth-black border border-birth-gray-2 px-3 py-1.5 rounded hover:border-birth-black transition-colors">
            <RotateCcw size={13} /> Limpiar
          </button>
        )}
      </div>

      {/* Barra de cliente */}
      <ClienteBar
        clienteId={clienteId} setClienteId={setClienteId}
        clienteNombre={clienteNombre} setClienteNombre={setClienteNombre}
        clientes={clientes} onClienteGuardado={cargarClientes}
      />

      {/* Grid principal: categorías | productos | cotización */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-260px)] min-h-[500px]">

        {/* Categorías */}
        <div className="col-span-2 bg-white border border-birth-gray-2 rounded overflow-y-auto">
          {CATEGORIAS.map(cat => (
            <button key={cat.id} onClick={() => setCategoria(cat.id)}
              className={`w-full text-left px-3 py-2.5 text-sm font-dm border-l-2 transition-all ${
                categoria === cat.id
                  ? 'border-birth-red bg-birth-gray font-medium text-birth-black'
                  : 'border-transparent text-birth-gray-4 hover:bg-birth-gray hover:text-birth-black'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Productos */}
        <div className="col-span-6 bg-white border border-birth-gray-2 rounded overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-birth-gray-2 px-4 py-2.5 z-10">
            <h2 className="font-barlow text-sm font-bold tracking-wider text-birth-black uppercase">
              {CATEGORIAS.find(c => c.id === categoria)?.label}
            </h2>
          </div>
          <CategoriaPanel
            categoria={categoria}
            multiplicador={multiplicador}
            setMultiplicador={setMultiplicador}
          />
        </div>

        {/* Cotización */}
        <div className="col-span-4 bg-white border border-birth-gray-2 rounded flex flex-col">
          <div className="px-4 py-2.5 border-b border-birth-gray-2 flex items-center justify-between">
            <h2 className="font-barlow text-sm font-bold tracking-wider">COTIZACIÓN</h2>
            <span className="text-xs text-birth-gray-3 font-dm">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto divide-y divide-birth-gray-2">
            {items.length === 0 ? (
              <p className="text-birth-gray-3 text-sm font-dm text-center py-10">Sin ítems</p>
            ) : items.map(item => (
              <div key={item._id} className="flex items-start gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-dm font-medium text-birth-black leading-snug">{item.descripcion}</p>
                  <p className="text-[10px] text-birth-gray-3 mt-0.5">{item.cantidad} × {clp(item.precioUnitario)}</p>
                </div>
                <span className="font-barlow text-sm font-bold shrink-0">{clp(item.total)}</span>
                <button onClick={() => setItems(prev => prev.filter(i => i._id !== item._id))}
                  className="text-birth-gray-3 hover:text-birth-red shrink-0 mt-0.5"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>

          {/* Totales + IVA */}
          {items.length > 0 && (
            <div className="px-4 py-3 border-t border-birth-gray-2 space-y-2">
              <label className="flex items-center gap-2 text-xs font-dm cursor-pointer">
                <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-birth-black" />
                <span className="text-birth-gray-4">IVA 19%</span>
              </label>
              <div className="flex justify-between text-xs font-dm text-birth-gray-4">
                <span>Subtotal</span><span>{clp(subtotal)}</span>
              </div>
              {conIva && <div className="flex justify-between text-xs font-dm text-birth-gray-4"><span>IVA</span><span>{clp(iva)}</span></div>}
              <div className="flex justify-between font-barlow text-lg font-bold border-t border-birth-gray-2 pt-1">
                <span>TOTAL</span><span>{clp(total)}</span>
              </div>
              <button onClick={() => setModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors mt-1">
                Crear cotización formal <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
