import { useState, useEffect } from 'react'
import { getCotizaciones, saveCotizacion, deleteCotizacion, getClientes, saveCliente } from '../utils/storage'
import { getClienteById } from '../utils/storage'
import { clp, fechaCorta, hoy, sumarDias, ESTADOS } from '../utils/formatters'
import { generarCotizacionPDF } from '../utils/pdf'
import { Plus, Download, Trash2, Edit2, X, ChevronDown, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const EMPTY_COT = {
  clienteId: '', clienteNombre: '', descripcion: '',
  fecha: hoy(), validez: 15,
  items: [],
  formaPago: 'Transferencia bancaria — 50% anticipo, 50% contra entrega',
  plazoEntrega: '', incluye: '', noIncluye: '',
  conIva: true, estado: 'por_aceptar',
  fechaInicio: '', fechaEntrega: '',
}

const EMPTY_ITEM = { descripcion: '', cantidad: 1, precioUnitario: 0, total: 0 }

function calcularTotales(items, conIva) {
  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const iva = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva
  const anticipo = Math.round(total * 0.5)
  const saldo = total - anticipo
  return { subtotal, iva, total, anticipo, saldo }
}

function ItemRow({ item, idx, onChange, onDelete }) {
  const set = (k, v) => {
    const updated = { ...item, [k]: v }
    if (k === 'cantidad' || k === 'precioUnitario') {
      updated.total = Math.round((updated.cantidad || 0) * (updated.precioUnitario || 0))
    }
    onChange(idx, updated)
  }
  return (
    <tr className="border-b border-birth-gray-2">
      <td className="py-2 pr-2">
        <input value={item.descripcion} onChange={e => set('descripcion', e.target.value)}
          className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
      </td>
      <td className="py-2 px-2 w-20">
        <input type="number" min="0" value={item.cantidad} onChange={e => set('cantidad', parseFloat(e.target.value) || 0)}
          className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm text-center focus:outline-none focus:border-birth-black" />
      </td>
      <td className="py-2 px-2 w-32">
        <input type="number" min="0" value={item.precioUnitario} onChange={e => set('precioUnitario', parseFloat(e.target.value) || 0)}
          className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm text-right focus:outline-none focus:border-birth-black" />
      </td>
      <td className="py-2 pl-2 w-32 text-right font-medium text-sm font-dm pr-2">{clp(item.total)}</td>
      <td className="py-2 w-8">
        <button onClick={() => onDelete(idx)} className="p-1 text-birth-gray-3 hover:text-birth-red"><X size={14} /></button>
      </td>
    </tr>
  )
}

function ModalCotizacion({ cotizacion, clientes, onClose, onSave }) {
  const [form, setForm] = useState(cotizacion?.id ? { ...cotizacion } : { ...EMPTY_COT })
  const [nuevoCliente, setNuevoCliente] = useState(false)
  const [ncForm, setNcForm] = useState({ nombre: '', empresa: '', rut: '', ciudad: '', correo: '', telefono: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const totales = calcularTotales(form.items, form.conIva)
  const fechaVencimiento = sumarDias(form.fecha, parseInt(form.validez) || 15)

  const agregarItem = () => set('items', [...form.items, { ...EMPTY_ITEM }])

  const updateItem = (idx, item) => {
    const items = [...form.items]
    items[idx] = item
    set('items', items)
  }

  const deleteItem = (idx) => set('items', form.items.filter((_, i) => i !== idx))

  const handleClienteChange = (id) => {
    const c = clientes.find(c => c.id === id)
    set('clienteId', id)
    set('clienteNombre', c ? c.nombre : '')
  }

  const crearCliente = () => {
    if (!ncForm.nombre.trim()) return
    const c = saveCliente(ncForm)
    handleClienteChange(c.id)
    setNuevoCliente(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      ...totales,
      fechaVencimiento,
    }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded w-full max-w-3xl shadow-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t z-10">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {cotizacion?.id ? `EDITAR COTIZACIÓN #${cotizacion.numero}` : 'NUEVA COTIZACIÓN'}
          </h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cliente *</label>
            {!nuevoCliente ? (
              <div className="flex gap-2">
                <select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)}
                  className="flex-1 border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` — ${c.empresa}` : ''}</option>)}
                </select>
                <button type="button" onClick={() => setNuevoCliente(true)}
                  className="px-3 border border-birth-gray-2 rounded text-sm font-dm text-birth-gray-4 hover:border-birth-black transition-colors whitespace-nowrap">
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="border border-birth-gray-2 rounded p-4 space-y-3">
                <p className="text-xs font-dm text-birth-gray-4 uppercase tracking-wider">Crear cliente rápido</p>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Nombre *" value={ncForm.nombre} onChange={e => setNcForm(f => ({ ...f, nombre: e.target.value }))}
                    className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
                  <input placeholder="Empresa" value={ncForm.empresa} onChange={e => setNcForm(f => ({ ...f, empresa: e.target.value }))}
                    className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
                  <input placeholder="RUT" value={ncForm.rut} onChange={e => setNcForm(f => ({ ...f, rut: e.target.value }))}
                    className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
                  <input placeholder="Ciudad" value={ncForm.ciudad} onChange={e => setNcForm(f => ({ ...f, ciudad: e.target.value }))}
                    className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={crearCliente}
                    className="bg-birth-black text-white px-4 py-1.5 rounded text-sm font-dm hover:bg-birth-red transition-colors">
                    Crear y seleccionar
                  </button>
                  <button type="button" onClick={() => setNuevoCliente(false)}
                    className="text-sm font-dm text-birth-gray-4 hover:text-birth-black">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fechas y estado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Validez (días)</label>
              <input type="number" min="1" value={form.validez} onChange={e => set('validez', parseInt(e.target.value) || 15)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Inicio trabajo</label>
              <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Fecha entrega</label>
              <input type="date" value={form.fechaEntrega} onChange={e => set('fechaEntrega', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Descripción del proyecto</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Ítems</label>
              <button type="button" onClick={agregarItem}
                className="flex items-center gap-1 text-xs font-dm text-birth-black hover:text-birth-red">
                <Plus size={12} /> Agregar ítem
              </button>
            </div>
            <div className="border border-birth-gray-2 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-birth-gray">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Descripción</th>
                    <th className="text-center px-2 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider w-20">Cant.</th>
                    <th className="text-right px-2 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider w-32">P. Unit.</th>
                    <th className="text-right px-2 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider w-32">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {form.items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-birth-gray-3 text-sm font-dm">Sin ítems. Agrega uno.</td></tr>
                  ) : form.items.map((item, idx) => (
                    <ItemRow key={idx} item={item} idx={idx} onChange={updateItem} onDelete={deleteItem} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* IVA y totales */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Forma de pago</label>
                <input value={form.formaPago} onChange={e => set('formaPago', e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
              </div>
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Plazo de entrega</label>
                <input value={form.plazoEntrega} onChange={e => set('plazoEntrega', e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="Ej: 5 días hábiles" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Incluye</label>
                  <textarea value={form.incluye} onChange={e => set('incluye', e.target.value)} rows={2}
                    className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">No incluye</label>
                  <textarea value={form.noIncluye} onChange={e => set('noIncluye', e.target.value)} rows={2}
                    className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="w-52 border border-birth-gray-2 rounded p-4 space-y-2 shrink-0">
              <label className="flex items-center gap-2 text-sm font-dm cursor-pointer mb-3">
                <input type="checkbox" checked={form.conIva} onChange={e => set('conIva', e.target.checked)}
                  className="accent-birth-black" />
                <span className="text-birth-gray-4">Incluir IVA (19%)</span>
              </label>
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>Subtotal neto</span><span>{clp(totales.subtotal)}</span>
              </div>
              {form.conIva && (
                <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                  <span>IVA 19%</span><span>{clp(totales.iva)}</span>
                </div>
              )}
              <div className="border-t border-birth-gray-2 pt-2 flex justify-between font-barlow text-lg font-bold text-birth-black">
                <span>TOTAL</span><span>{clp(totales.total)}</span>
              </div>
              <div className="flex justify-between text-xs font-dm text-birth-gray-4">
                <span>Anticipo 50%</span><span>{clp(totales.anticipo)}</span>
              </div>
              <div className="flex justify-between text-xs font-dm text-birth-gray-4">
                <span>Saldo entrega</span><span>{clp(totales.saldo)}</span>
              </div>
              <div className="pt-2">
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Estado</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                  <option value="por_aceptar">Por aceptar</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-birth-gray-2">
            <button type="submit"
              className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
              {cotizacion?.id ? 'Guardar cambios' : 'Crear cotización'}
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

export default function Cotizaciones() {
  const location = useLocation()
  const [cotizaciones, setCotizaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = () => {
    setCotizaciones(getCotizaciones())
    setClientes(getClientes())
  }

  useEffect(() => {
    cargar()
    // Si venimos del cotizador con ítems pre-cargados
    if (location.state?.items) {
      setModal({ items: location.state.items, clienteId: location.state.cliente?.id || '', clienteNombre: location.state.cliente?.nombre || '' })
    }
  }, [])

  const handleSave = (data) => {
    saveCotizacion(data)
    cargar()
    setModal(null)
  }

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar esta cotización?')) return
    deleteCotizacion(id)
    cargar()
  }

  const handlePDF = (cot) => {
    const cliente = getClienteById(cot.clienteId)
    generarCotizacionPDF(cot, cliente)
  }

  const handleEstado = (cot, estado) => {
    saveCotizacion({ ...cot, estado })
    cargar()
  }

  const filtradas = cotizaciones
    .filter(c => !filtroEstado || c.estado === filtroEstado)
    .filter(c =>
      !busqueda ||
      c.numero?.includes(busqueda) ||
      c.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const initModal = () => {
    const state = location.state
    if (state?.items) {
      return {
        ...EMPTY_COT,
        items: state.items,
        clienteId: state.cliente?.id || '',
        clienteNombre: state.cliente?.nombre || '',
      }
    }
    return { ...EMPTY_COT }
  }

  return (
    <div className="p-8">
      {modal && (
        <ModalCotizacion
          cotizacion={modal.id ? modal : { ...EMPTY_COT, ...modal }}
          clientes={clientes}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-barlow text-4xl font-bold text-birth-black tracking-wide">COTIZACIONES</h1>
          <p className="text-birth-gray-3 text-sm font-dm mt-1">{cotizaciones.length} cotizaciones en total</p>
        </div>
        <button onClick={() => setModal(initModal())}
          className="flex items-center gap-2 bg-birth-black text-white px-5 py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
          <Plus size={16} /> Nueva cotización
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-birth-gray-3" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 pr-4 py-2 border border-birth-gray-2 rounded text-sm font-dm focus:outline-none focus:border-birth-black bg-white w-48" />
        </div>
        <div className="flex gap-1">
          {[
            { v: '', l: 'Todas' },
            { v: 'por_aceptar', l: 'Por aceptar' },
            { v: 'aceptada', l: 'Aceptadas' },
            { v: 'rechazada', l: 'Rechazadas' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setFiltroEstado(v)}
              className={`px-3 py-2 rounded text-xs font-dm border transition-colors ${filtroEstado === v ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-birth-gray-2 rounded">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center text-birth-gray-3 text-sm font-dm">Sin cotizaciones</div>
        ) : (
          <table className="w-full text-sm font-dm">
            <thead>
              <tr className="border-b border-birth-gray-2">
                <th className="text-left px-5 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Número</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Cliente</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Fecha</th>
                <th className="text-right px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Total</th>
                <th className="text-center px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => {
                const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                return (
                  <tr key={c.id} className="border-b border-birth-gray-2 hover:bg-birth-gray">
                    <td className="px-5 py-3 font-medium text-birth-black">#{c.numero}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{c.clienteNombre || '—'}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{fechaCorta(c.createdAt)}</td>
                    <td className="px-3 py-3 text-right font-medium">{clp(c.total)}</td>
                    <td className="px-3 py-3 text-center">
                      <select value={c.estado}
                        onChange={e => handleEstado(c, e.target.value)}
                        className={`text-xs px-2 py-1 rounded border font-dm cursor-pointer focus:outline-none ${est.color} bg-transparent`}>
                        <option value="por_aceptar">Por aceptar</option>
                        <option value="aceptada">Aceptada</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handlePDF(c)} title="Descargar PDF"
                          className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                          <Download size={14} />
                        </button>
                        <button onClick={() => setModal({ ...c })} title="Editar"
                          className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} title="Eliminar"
                          className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
