import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CATEGORIAS, PRODUCTOS, MULTIPLICADORES,
  TARJETAS, BANDERAS_VELA, VOLANTES,
  BASTIDORES_PROVEEDOR, BASTIDORES_BIRTH, PALOMAS,
  PENDONES,
} from '../data/productos'
import { clp } from '../utils/formatters'
import { Plus, Trash2, ChevronRight, ArrowRight, RotateCcw } from 'lucide-react'

// ─── Sub-formularios por categoría especial ──────────────────────────────────

function TarjetasForm({ onAgregar }) {
  const [cantidad, setCantidad] = useState(100)
  const [caras, setCaras] = useState('1cara')
  const [usarBirth, setUsarBirth] = useState(false)
  const [mult, setMult] = useState(2)

  const precBirth = TARJETAS.preciosBirth[cantidad]?.[caras]
  const precProv = TARJETAS.preciosProveedor[cantidad]?.[caras]
  const precio = usarBirth && precBirth ? precBirth : (precProv ? precProv * mult : null)

  const handleAgregar = () => {
    if (!precio) return
    onAgregar({
      descripcion: `Tarjetas de presentación ${cantidad} und × ${caras === '1cara' ? '1 cara' : '2 caras'}`,
      cantidad: 1, precioUnitario: precio, total: precio,
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <select value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
            {TARJETAS.cantidades.map(n => <option key={n} value={n}>{n} und</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Caras</label>
          <select value={caras} onChange={e => setCaras(e.target.value)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
            <option value="1cara">1 cara</option>
            <option value="2caras">2 caras</option>
          </select>
        </div>
      </div>
      {!usarBirth && (
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Multiplicador</label>
          <div className="flex gap-2">
            {MULTIPLICADORES.map(m => (
              <button key={m.id} onClick={() => setMult(m.valor)}
                className={`flex-1 py-2 rounded text-sm font-dm border transition-colors ${mult === m.valor ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                x{m.valor}
              </button>
            ))}
          </div>
        </div>
      )}
      {precBirth && (
        <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
          <input type="checkbox" checked={usarBirth} onChange={e => setUsarBirth(e.target.checked)} className="accent-birth-black" />
          <span className="text-birth-gray-4">Usar precio Birth directo ({clp(precBirth)})</span>
        </label>
      )}
      <PrecioPreview precio={precio} />
      <AgregarBtn onClick={handleAgregar} disabled={!precio} />
    </div>
  )
}

function VolantesForm({ onAgregar }) {
  const [medida, setMedida] = useState('10x14.5cm')
  const [caras, setCaras] = useState('1 cara')
  const [cantidad, setCantidad] = useState(100)
  const precio = VOLANTES.precios[medida]?.[caras]?.[cantidad]

  const handleAgregar = () => {
    if (!precio) return
    onAgregar({ descripcion: `Volantes ${medida} ${caras} — ${cantidad} und`, cantidad: 1, precioUnitario: precio, total: precio })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Medida</label>
        <select value={medida} onChange={e => setMedida(e.target.value)}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
          {VOLANTES.medidas.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Caras</label>
          <select value={caras} onChange={e => setCaras(e.target.value)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
            {VOLANTES.caras.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <select value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
            {VOLANTES.cantidades.map(n => <option key={n} value={n}>{n} und</option>)}
          </select>
        </div>
      </div>
      <PrecioPreview precio={precio} />
      <AgregarBtn onClick={handleAgregar} disabled={!precio} />
    </div>
  )
}

function BastidoresForm({ onAgregar }) {
  const [tipo, setTipo] = useState('proveedor')
  const [bastidor, setBastidor] = useState(BASTIDORES_PROVEEDOR[0].id)
  const [tipoBirth, setTipoBirth] = useState(BASTIDORES_BIRTH[0].id)
  const [caras, setCaras] = useState('una')
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [mult, setMult] = useState(2)
  const [esPaloma, setEsPaloma] = useState(false)
  const [paloma, setPaloma] = useState(PALOMAS[0].id)

  let precio = null
  let desc = ''

  if (tipo === 'proveedor') {
    const b = BASTIDORES_PROVEEDOR.find(b => b.id === bastidor)
    if (b) {
      precio = caras === 'una' ? b.precioCara * mult : b.precioDoble * mult
      desc = `${b.nombre} ${caras === 'una' ? '1 cara' : 'doble cara'}`
    }
  } else if (esPaloma) {
    const p = PALOMAS.find(p => p.id === paloma)
    if (p) { precio = p.precio; desc = `Paloma publicitaria ${p.nombre.replace('Paloma ', '')}` }
  } else {
    const b = BASTIDORES_BIRTH.find(b => b.id === tipoBirth)
    if (b && ancho && alto) {
      const area = parseFloat(ancho) * parseFloat(alto)
      precio = Math.round(area * b.precio)
      desc = `${b.nombre} ${ancho}×${alto}m (${area.toFixed(2)}m²)`
    }
  }

  const handleAgregar = () => {
    if (!precio) return
    onAgregar({ descripcion: desc, cantidad: 1, precioUnitario: precio, total: precio })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setTipo('proveedor')}
          className={`flex-1 py-2 rounded text-sm font-dm border ${tipo === 'proveedor' ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
          Proveedor
        </button>
        <button onClick={() => setTipo('birth')}
          className={`flex-1 py-2 rounded text-sm font-dm border ${tipo === 'birth' ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
          Precio Birth
        </button>
      </div>

      {tipo === 'proveedor' ? (
        <>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Tamaño</label>
            <select value={bastidor} onChange={e => setBastidor(e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              {BASTIDORES_PROVEEDOR.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Caras</label>
              <select value={caras} onChange={e => setCaras(e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                <option value="una">Una cara</option>
                <option value="doble">Doble cara</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Multiplicador</label>
              <select value={mult} onChange={e => setMult(parseInt(e.target.value))}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                {MULTIPLICADORES.map(m => <option key={m.id} value={m.valor}>×{m.valor} — {m.label}</option>)}
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
            <input type="checkbox" checked={esPaloma} onChange={e => setEsPaloma(e.target.checked)} className="accent-birth-black" />
            <span className="text-birth-gray-4">Paloma publicitaria (precio fijo)</span>
          </label>
          {esPaloma ? (
            <select value={paloma} onChange={e => setPaloma(e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              {PALOMAS.map(p => <option key={p.id} value={p.id}>{p.nombre} — {clp(p.precio)}</option>)}
            </select>
          ) : (
            <>
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Tipo</label>
                <select value={tipoBirth} onChange={e => setTipoBirth(e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                  {BASTIDORES_BIRTH.map(b => <option key={b.id} value={b.id}>{b.nombre} — {clp(b.precio)}/m²</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Ancho (m)</label>
                  <input type="number" min="0" step="0.01" value={ancho} onChange={e => setAncho(e.target.value)}
                    className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="1.20" />
                </div>
                <div>
                  <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Alto (m)</label>
                  <input type="number" min="0" step="0.01" value={alto} onChange={e => setAlto(e.target.value)}
                    className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="0.80" />
                </div>
              </div>
            </>
          )}
        </>
      )}
      <PrecioPreview precio={precio} />
      <AgregarBtn onClick={handleAgregar} disabled={!precio} />
    </div>
  )
}

function PendonesForm({ onAgregar }) {
  const [pendon, setPendon] = useState(PENDONES[0].id)
  const [cantidad, setCantidad] = useState(1)

  const p = PENDONES.find(p => p.id === pendon)
  const precio = p ? p.precio * cantidad : null

  const handleAgregar = () => {
    if (!precio) return
    onAgregar({ descripcion: `${p.nombre}${cantidad > 1 ? ` × ${cantidad}` : ''}`, cantidad, precioUnitario: p.precio, total: precio })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Modelo</label>
        <select value={pendon} onChange={e => setPendon(e.target.value)}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
          {PENDONES.map(p => <option key={p.id} value={p.id}>{p.nombre} — {clp(p.precio)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
        <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
      </div>
      <PrecioPreview precio={precio} />
      <AgregarBtn onClick={handleAgregar} disabled={!precio} />
    </div>
  )
}

function BanderaVelaForm({ onAgregar }) {
  const [item, setItem] = useState(BANDERAS_VELA[0].id)
  const [cantidad, setCantidad] = useState(1)
  const [mult, setMult] = useState(2)

  const p = BANDERAS_VELA.find(b => b.id === item)
  const precio = p ? Math.round((p.aplicaMultiplicador ? p.precio * mult : p.precio) * cantidad) : null

  const handleAgregar = () => {
    if (!precio) return
    onAgregar({ descripcion: `${p.nombre}${cantidad > 1 ? ` × ${cantidad}` : ''}`, cantidad, precioUnitario: Math.round(precio / cantidad), total: precio })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Ítem</label>
        <select value={item} onChange={e => setItem(e.target.value)}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
          {BANDERAS_VELA.map(b => <option key={b.id} value={b.id}>{b.nombre} — {clp(b.precio)}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
        </div>
        {BANDERAS_VELA.find(b => b.id === item)?.aplicaMultiplicador && (
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Multiplicador</label>
            <select value={mult} onChange={e => setMult(parseInt(e.target.value))}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              {MULTIPLICADORES.map(m => <option key={m.id} value={m.valor}>×{m.valor}</option>)}
            </select>
          </div>
        )}
      </div>
      <PrecioPreview precio={precio} />
      <AgregarBtn onClick={handleAgregar} disabled={!precio} />
    </div>
  )
}

// ─── Formulario genérico (m², ml, unidad, plancha) ───────────────────────────
function GenericoForm({ categoria, onAgregar }) {
  const productos = PRODUCTOS[categoria] || []
  const [prodId, setProdId] = useState(productos[0]?.id || '')
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [mult, setMult] = useState(2)
  const [inclMult, setInclMult] = useState(true)
  const [desc, setDesc] = useState('')

  const prod = productos.find(p => p.id === prodId)

  useEffect(() => {
    if (productos.length > 0) {
      setProdId(productos[0].id)
      setAncho('')
      setAlto('')
      setCantidad(1)
    }
  }, [categoria])

  if (!prod) return null

  const unidad = prod.unidad
  const precioCosto = prod.precio

  let area = null
  let precioFinal = null

  if (unidad === 'm2') {
    area = parseFloat(ancho || 0) * parseFloat(alto || 0)
    if (area > 0 && precioCosto > 0) {
      precioFinal = prod.aplicaMultiplicador && inclMult
        ? Math.round(area * precioCosto * mult)
        : Math.round(area * precioCosto)
    }
  } else if (unidad === 'ml') {
    const metros = parseFloat(ancho || 0)
    if (metros > 0 && precioCosto > 0) {
      precioFinal = prod.aplicaMultiplicador && inclMult
        ? Math.round(metros * precioCosto * mult)
        : Math.round(metros * precioCosto)
    }
  } else if (unidad === 'libre' || precioCosto === 0) {
    precioFinal = parseFloat(cantidad) || null
  } else {
    if (cantidad > 0 && precioCosto > 0) {
      precioFinal = prod.aplicaMultiplicador && inclMult
        ? Math.round(cantidad * precioCosto * mult)
        : Math.round(cantidad * precioCosto)
    }
  }

  const descAuto = () => {
    if (unidad === 'm2') return `${prod.nombre} ${ancho}×${alto}m (${(area || 0).toFixed(2)}m²)`
    if (unidad === 'ml') return `${prod.nombre} ${ancho}m lineal`
    if (unidad === 'libre') return prod.nombre
    return `${prod.nombre} × ${cantidad}`
  }

  const handleAgregar = () => {
    if (!precioFinal) return
    onAgregar({
      descripcion: desc || descAuto(),
      cantidad: unidad === 'm2' || unidad === 'ml' ? 1 : cantidad,
      precioUnitario: unidad === 'm2' || unidad === 'ml' ? precioFinal : (precioFinal / cantidad),
      total: precioFinal,
    })
    setDesc('')
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Producto</label>
        <select value={prodId} onChange={e => setProdId(e.target.value)}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
          {productos.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombre} — {p.unidad === 'libre' ? 'precio libre' : clp(p.precio) + '/' + p.unidad}
            </option>
          ))}
        </select>
        {prod.nota && <p className="text-xs text-birth-gray-3 mt-1 font-dm">{prod.nota}</p>}
      </div>

      {unidad === 'm2' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Ancho (m)</label>
            <input type="number" min="0" step="0.01" value={ancho} onChange={e => setAncho(e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="1.20" />
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Alto (m)</label>
            <input type="number" min="0" step="0.01" value={alto} onChange={e => setAlto(e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="0.80" />
          </div>
          {area > 0 && (
            <div className="col-span-2 bg-birth-gray px-3 py-2 rounded text-xs font-dm text-birth-gray-4">
              Área: <strong className="text-birth-black">{area.toFixed(2)} m²</strong>
              &nbsp;· Costo proveedor: <strong>{clp(area * precioCosto)}</strong>
            </div>
          )}
        </div>
      )}

      {unidad === 'ml' && (
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Metros lineales</label>
          <input type="number" min="0" step="0.01" value={ancho} onChange={e => setAncho(e.target.value)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="2.50" />
        </div>
      )}

      {(unidad === 'unidad' || unidad === 'plancha' || unidad === 'hora' || unidad === 'set' || unidad === 'proyecto' || unidad === 'año' || unidad === 'dia') && (
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">
            {unidad === 'hora' ? 'Horas' : unidad === 'dia' ? 'Días' : 'Cantidad'}
          </label>
          <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
        </div>
      )}

      {unidad === 'libre' && (
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Monto ($)</label>
          <input type="number" min="0" value={cantidad} onChange={e => setCantidad(parseFloat(e.target.value) || 0)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="0" />
        </div>
      )}

      {prod.aplicaMultiplicador && unidad !== 'libre' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Multiplicador de instalación</label>
            <label className="flex items-center gap-1.5 text-xs font-dm cursor-pointer">
              <input type="checkbox" checked={inclMult} onChange={e => setInclMult(e.target.checked)} className="accent-birth-black" />
              <span className="text-birth-gray-4">Aplicar</span>
            </label>
          </div>
          <div className="flex gap-2">
            {MULTIPLICADORES.map(m => (
              <button key={m.id} onClick={() => setMult(m.valor)}
                className={`flex-1 py-1.5 rounded text-xs font-dm border transition-colors ${mult === m.valor && inclMult ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                x{m.valor}<br />
                <span className="text-[10px] opacity-70">{m.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Descripción personalizada (opcional)</label>
        <input value={desc} onChange={e => setDesc(e.target.value)}
          placeholder={descAuto()}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
      </div>

      <PrecioPreview precio={precioFinal} />
      <AgregarBtn onClick={handleAgregar} disabled={!precioFinal} />
    </div>
  )
}

function ManualForm({ onAgregar }) {
  const [desc, setDesc] = useState('')
  const [precio, setPrecio] = useState('')
  const [cantidad, setCantidad] = useState(1)

  const total = (parseFloat(precio) || 0) * cantidad

  const handleAgregar = () => {
    if (!desc || !precio) return
    onAgregar({ descripcion: desc, cantidad, precioUnitario: parseFloat(precio), total })
    setDesc(''); setPrecio(''); setCantidad(1)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Descripción</label>
        <input value={desc} onChange={e => setDesc(e.target.value)}
          className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="Ej: Diseño gráfico personalizado" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Precio unitario</label>
          <input type="number" min="0" value={precio} onChange={e => setPrecio(e.target.value)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cantidad</label>
          <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)}
            className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
        </div>
      </div>
      <PrecioPreview precio={total || null} />
      <AgregarBtn onClick={handleAgregar} disabled={!desc || !precio} />
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function PrecioPreview({ precio }) {
  if (!precio) return null
  return (
    <div className="bg-birth-black text-white rounded px-4 py-3">
      <p className="text-xs font-dm opacity-60 mb-0.5">Precio de venta estimado</p>
      <p className="font-barlow text-2xl font-bold">{clp(precio)}</p>
    </div>
  )
}

function AgregarBtn({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      <Plus size={16} /> Agregar a cotización
    </button>
  )
}

// ─── FORMULARIO PARA CATEGORÍAS ESPECIALES ───────────────────────────────────
const ESPECIALES = ['tarjetas', 'volantes', 'bastidor', 'pendon', 'bandera_vela']

function CategoriaForm({ categoria, onAgregar }) {
  if (categoria === 'tarjetas') return <TarjetasForm onAgregar={onAgregar} />
  if (categoria === 'volantes') return <VolantesForm onAgregar={onAgregar} />
  if (categoria === 'bastidor') return <BastidoresForm onAgregar={onAgregar} />
  if (categoria === 'pendon') return <PendonesForm onAgregar={onAgregar} />
  if (categoria === 'bandera_vela') return <BanderaVelaForm onAgregar={onAgregar} />
  if (categoria === 'manual') return <ManualForm onAgregar={onAgregar} />
  return <GenericoForm categoria={categoria} onAgregar={onAgregar} />
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function Cotizador() {
  const navigate = useNavigate()
  const location = useLocation()
  const [categoria, setCategoria] = useState('tela')
  const [items, setItems] = useState([])
  const [conIva, setConIva] = useState(true)
  const [descuento, setDescuento] = useState(0)

  // Pre-cargar cliente desde navegación
  const clientePreload = location.state?.cliente || null

  const agregarItem = (item) => {
    setItems(prev => [...prev, { ...item, _id: crypto.randomUUID() }])
  }

  const quitarItem = (id) => {
    setItems(prev => prev.filter(i => i._id !== id))
  }

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const descuentoMonto = Math.round(subtotal * (descuento / 100))
  const subtotalConDesc = subtotal - descuentoMonto
  const iva = conIva ? Math.round(subtotalConDesc * 0.19) : 0
  const total = subtotalConDesc + iva

  const irACotizacion = () => {
    const itemsCot = items.map(({ _id, ...rest }) => rest)
    navigate('/cotizaciones', {
      state: {
        items: itemsCot,
        cliente: clientePreload,
      }
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-barlow text-4xl font-bold text-birth-black tracking-wide">COTIZADOR</h1>
          <p className="text-birth-gray-3 text-sm font-dm mt-1">Calcula precios y arma tu cotización</p>
        </div>
        {items.length > 0 && (
          <button onClick={() => setItems([])}
            className="flex items-center gap-2 text-sm font-dm text-birth-gray-4 hover:text-birth-black border border-birth-gray-2 px-4 py-2 rounded hover:border-birth-black transition-colors">
            <RotateCcw size={14} /> Limpiar todo
          </button>
        )}
      </div>

      {clientePreload && (
        <div className="mb-4 bg-birth-gray border border-birth-gray-2 rounded px-4 py-2.5 flex items-center gap-2 text-sm font-dm">
          <span className="text-birth-gray-4">Cotizando para:</span>
          <span className="font-medium text-birth-black">{clientePreload.nombre}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Panel calculadora */}
        <div className="lg:col-span-3 space-y-4">
          {/* Selector categoría */}
          <div className="bg-white border border-birth-gray-2 rounded p-5">
            <p className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider mb-3">Categoría de producto</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CATEGORIAS.map(cat => (
                <button key={cat.id} onClick={() => setCategoria(cat.id)}
                  className={`px-3 py-2 rounded text-sm font-dm border text-left transition-all ${
                    categoria === cat.id
                      ? 'bg-birth-black text-white border-birth-black'
                      : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario de la categoría seleccionada */}
          <div className="bg-white border border-birth-gray-2 rounded p-5">
            <div className="flex items-center gap-2 mb-4">
              <ChevronRight size={16} className="text-birth-red" />
              <h2 className="font-barlow text-lg font-bold tracking-wide text-birth-black">
                {CATEGORIAS.find(c => c.id === categoria)?.label}
              </h2>
            </div>
            <CategoriaForm categoria={categoria} onAgregar={agregarItem} />
          </div>
        </div>

        {/* Panel cotización */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-birth-gray-2 rounded">
            <div className="px-5 py-4 border-b border-birth-gray-2">
              <h2 className="font-barlow text-lg font-bold tracking-wide">COTIZACIÓN</h2>
              <p className="text-xs text-birth-gray-3 font-dm">{items.length} ítem{items.length !== 1 ? 's' : ''}</p>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center px-5">
                <p className="text-birth-gray-3 text-sm font-dm">Agrega productos desde el calculador</p>
              </div>
            ) : (
              <div className="divide-y divide-birth-gray-2 max-h-72 overflow-y-auto">
                {items.map(item => (
                  <div key={item._id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-dm font-medium text-birth-black leading-snug truncate">{item.descripcion}</p>
                      <p className="text-xs text-birth-gray-3 mt-0.5 font-dm">
                        {item.cantidad} × {clp(item.precioUnitario)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-barlow text-base font-bold">{clp(item.total)}</span>
                      <button onClick={() => quitarItem(item._id)} className="p-1 text-birth-gray-3 hover:text-birth-red">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales */}
            {items.length > 0 && (
              <div className="px-5 pb-5 pt-4 border-t border-birth-gray-2 space-y-3">
                <label className="flex items-center gap-2 text-sm font-dm cursor-pointer">
                  <input type="checkbox" checked={conIva} onChange={e => setConIva(e.target.checked)} className="accent-birth-black" />
                  <span className="text-birth-gray-4">Incluir IVA (19%)</span>
                </label>

                <div>
                  <label className="block text-xs text-birth-gray-4 mb-1 font-dm">Descuento (%)</label>
                  <input type="number" min="0" max="100" value={descuento} onChange={e => setDescuento(parseFloat(e.target.value) || 0)}
                    className="w-24 border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                    <span>Subtotal</span><span>{clp(subtotal)}</span>
                  </div>
                  {descuento > 0 && (
                    <div className="flex justify-between text-sm font-dm text-birth-red">
                      <span>Descuento {descuento}%</span><span>-{clp(descuentoMonto)}</span>
                    </div>
                  )}
                  {conIva && (
                    <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                      <span>IVA 19%</span><span>{clp(iva)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-barlow text-xl font-bold text-birth-black pt-2 border-t border-birth-gray-2">
                    <span>TOTAL</span><span>{clp(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-dm text-birth-gray-3">
                    <span>Anticipo 50%</span><span>{clp(Math.round(total * 0.5))}</span>
                  </div>
                </div>

                <button onClick={irACotizacion}
                  className="w-full flex items-center justify-center gap-2 bg-birth-black text-white py-3 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors mt-2">
                  Crear cotización formal <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
