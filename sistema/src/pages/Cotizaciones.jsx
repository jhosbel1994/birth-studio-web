import { useState, useEffect } from 'react'
import { getCotizaciones, saveCotizacion, deleteCotizacion, getClientes, saveCliente, getClienteById } from '../utils/storage'
import { clp, fechaCorta, hoy, sumarDias, ESTADOS } from '../utils/formatters'
import { generarCotizacionPDF } from '../utils/pdf'
import { enviarCotizacionEmailJS, abrirGmailCompose, buildWhatsAppUrl } from '../utils/email'
import { useLocation } from 'react-router-dom'
import {
  Plus, Download, Trash2, Edit2, X, Search,
  Eye, Mail, MessageCircle, FileText, MoreHorizontal, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react'

const EMPTY_COT = {
  clienteId: '', clienteNombre: '', descripcion: '',
  fecha: hoy(), validez: 15,
  items: [],
  formaPago: 'Transferencia bancaria — 50% anticipo, 50% contra entrega',
  plazoEntrega: '', incluye: '', noIncluye: '',
  conIva: true, estado: 'por_aceptar',
  fechaInicio: '', fechaEntrega: '',
}

function calcularTotales(items, conIva) {
  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const iva = conIva ? Math.round(subtotal * 0.19) : 0
  const total = subtotal + iva
  const anticipo = Math.round(total * 0.5)
  const saldo = total - anticipo
  return { subtotal, iva, total, anticipo, saldo }
}

// ─── MODAL RESUMEN INLINE (sin PDF) ──────────────────────────────────────────
function ModalResumen({ cotizacion, cliente, onClose }) {
  const est = ESTADOS[cotizacion.estado] || ESTADOS.por_aceptar
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg md:rounded shadow-xl max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-birth-black px-5 py-4 flex items-center justify-between rounded-t-2xl md:rounded-t-2xl">
          <div>
            <p className="text-white/50 text-[10px] font-dm uppercase tracking-wider">Cotización</p>
            <p className="text-white font-barlow text-2xl font-bold tracking-wider">#{cotizacion.numero}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded border ${est.color}`}>{est.label}</span>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Cliente + fecha */}
          <div className="grid grid-cols-2 gap-3 text-sm font-dm">
            <div>
              <p className="text-[10px] text-birth-gray-4 uppercase tracking-wider mb-0.5">Cliente</p>
              <p className="font-medium text-birth-black">{cotizacion.clienteNombre || '—'}</p>
              {cliente?.empresa && <p className="text-xs text-birth-gray-3">{cliente.empresa}</p>}
            </div>
            <div>
              <p className="text-[10px] text-birth-gray-4 uppercase tracking-wider mb-0.5">Fecha</p>
              <p className="font-medium text-birth-black">{fechaCorta(cotizacion.fecha)}</p>
              {cotizacion.fechaVencimiento && <p className="text-xs text-birth-gray-3">Vence: {fechaCorta(cotizacion.fechaVencimiento)}</p>}
            </div>
          </div>

          {cotizacion.descripcion && (
            <div>
              <p className="text-[10px] text-birth-gray-4 uppercase tracking-wider mb-1">Proyecto</p>
              <p className="text-sm text-birth-gray-4 font-dm">{cotizacion.descripcion}</p>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-[10px] text-birth-gray-4 uppercase tracking-wider mb-2">Ítems</p>
            <div className="border border-birth-gray-2 rounded overflow-hidden">
              {(cotizacion.items || []).map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2.5 text-sm font-dm ${i > 0 ? 'border-t border-birth-gray-2' : ''}`}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-medium text-birth-black truncate">{item.descripcion}</p>
                    <p className="text-xs text-birth-gray-3">{item.cantidad} × {clp(item.precioUnitario)}</p>
                  </div>
                  <span className="font-bold shrink-0">{clp(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="bg-birth-gray rounded p-4 space-y-1.5">
            <div className="flex justify-between text-sm font-dm text-birth-gray-4">
              <span>Subtotal neto</span><span>{clp(cotizacion.subtotal)}</span>
            </div>
            {cotizacion.iva > 0 && (
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>IVA (19%)</span><span>{clp(cotizacion.iva)}</span>
              </div>
            )}
            <div className="flex justify-between font-barlow text-xl font-bold pt-1 border-t border-birth-gray-2">
              <span>TOTAL</span><span className="text-birth-red">{clp(cotizacion.total)}</span>
            </div>
            <div className="flex justify-between text-xs font-dm text-birth-gray-3">
              <span>Anticipo 50%</span><span>{clp(cotizacion.anticipo)}</span>
            </div>
          </div>

          {cotizacion.formaPago && (
            <div className="text-sm font-dm">
              <span className="text-birth-gray-4">Forma de pago: </span>
              <span className="text-birth-black">{cotizacion.formaPago}</span>
            </div>
          )}
          {cotizacion.plazoEntrega && (
            <div className="text-sm font-dm">
              <span className="text-birth-gray-4">Plazo: </span>
              <span className="text-birth-black">{cotizacion.plazoEntrega}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MODAL PREVIEW PDF ────────────────────────────────────────────────────────
function ModalPreviewPDF({ url, filename, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 bg-black/95 z-[60] flex flex-col">
      <div className="bg-birth-black px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-white font-barlow text-base font-bold tracking-wide">VISTA PREVIA</p>
          <p className="text-white/30 text-[10px] font-dm truncate max-w-[200px]">{filename}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDownload}
            className="flex items-center gap-1.5 bg-birth-red text-white px-3 py-2 rounded text-xs font-dm hover:bg-red-700 transition-colors">
            <Download size={13} /> Descargar
          </button>
          <button onClick={onClose}
            className="p-2 text-white/40 hover:text-white border border-white/15 rounded transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full bg-white" title="Vista previa" />
    </div>
  )
}

function ToastEnvio({ estado, onClose }) {
  if (!estado) return null
  const Icon = estado.tipo === 'enviando' ? Loader2 : estado.tipo === 'ok' ? CheckCircle : AlertCircle
  return (
    <div className="fixed left-2 right-2 bottom-[76px] md:left-auto md:right-5 md:bottom-5 md:w-80 z-[70]">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-md border shadow-lg ${
        estado.tipo === 'error'
          ? 'bg-white border-birth-red text-birth-black'
          : 'bg-birth-black border-birth-black text-white'
      }`}>
        <Icon size={18} className={`${estado.tipo === 'enviando' ? 'animate-spin' : ''} ${estado.tipo === 'ok' ? 'text-birth-red' : ''}`} />
        <p className="flex-1 text-sm font-dm leading-snug">{estado.mensaje}</p>
        {estado.tipo !== 'enviando' && (
          <button onClick={onClose} className="text-current/45 hover:text-current"><X size={15} /></button>
        )}
      </div>
    </div>
  )
}

function ActionPill({ icon: Icon, label, tone = 'neutral', onClick, disabled }) {
  const styles = {
    neutral: 'bg-white text-birth-black border-birth-gray-2 active:border-birth-black',
    black: 'bg-birth-black text-white border-birth-black active:bg-birth-red',
    red: 'bg-birth-red text-white border-birth-red active:bg-birth-black',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-10 px-3 rounded-md border flex items-center justify-center gap-2 text-xs font-dm font-medium transition-colors disabled:opacity-45 ${styles[tone]}`}
    >
      <Icon size={15} strokeWidth={2} />
      <span>{label}</span>
    </button>
  )
}

// ─── MENÚ DE ACCIONES ─────────────────────────────────────────────────────────
function AccionesMenu({ cotizacion, onResumen, onVerPDF, onDescargar, onEditar, onEliminar, onEnviarEmail, onEnviarWhatsApp, onClose }) {
  const cliente = getClienteById(cotizacion.clienteId)

  const acciones = [
    {
      grupo: 'Ver',
      items: [
        { icon: Eye, label: 'Ver resumen', desc: 'Inline sin PDF', onClick: onResumen },
        { icon: FileText, label: 'Ver PDF', desc: 'Vista previa', onClick: onVerPDF },
        { icon: Download, label: 'Descargar PDF', desc: 'Guardar archivo', onClick: onDescargar },
      ]
    },
    {
      grupo: 'Compartir',
      items: [
        { icon: Mail, label: 'Enviar por email', desc: cliente?.correo || 'Pedir email', onClick: onEnviarEmail },
        { icon: MessageCircle, label: 'Enviar por WhatsApp', desc: cliente?.telefono || 'Sin teléfono guardado', onClick: onEnviarWhatsApp },
      ]
    },
    {
      grupo: 'Gestión',
      items: [
        { icon: Edit2, label: 'Editar', desc: '', onClick: onEditar },
        { icon: Trash2, label: 'Eliminar', desc: '', onClick: onEliminar, danger: true },
      ]
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-xs rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header del menú */}
        <div className="px-4 py-3 border-b border-birth-gray-2 flex items-center justify-between">
          <div>
            <p className="font-barlow font-bold text-birth-black">#{cotizacion.numero}</p>
            <p className="text-xs text-birth-gray-3 font-dm">{cotizacion.clienteNombre || '—'} · {clp(cotizacion.total)}</p>
          </div>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black p-1"><X size={16} /></button>
        </div>

        {acciones.map(grupo => (
          <div key={grupo.grupo}>
            <p className="px-4 pt-3 pb-1 text-[9px] font-dm uppercase tracking-widest text-birth-gray-3">{grupo.grupo}</p>
            {grupo.items.map(({ icon: Icon, label, desc, onClick, danger }) => (
              <button key={label} onClick={onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-birth-gray transition-colors active:bg-birth-gray-2 ${danger ? 'text-birth-red' : 'text-birth-black'}`}>
                <Icon size={17} strokeWidth={1.75} className={danger ? 'text-birth-red' : 'text-birth-gray-4'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-dm font-medium">{label}</p>
                  {desc && <p className="text-[10px] text-birth-gray-3 truncate">{desc}</p>}
                </div>
              </button>
            ))}
          </div>
        ))}
        <div className="pb-safe h-4" />
      </div>
    </div>
  )
}

// ─── MODAL COTIZACIÓN (crear/editar) ─────────────────────────────────────────
function MobileItemCard({ item, idx, onChange, onDelete }) {
  const set = (k, v) => {
    const updated = { ...item, [k]: v }
    if (k === 'cantidad' || k === 'precioUnitario') {
      updated.total = Math.round((updated.cantidad || 0) * (updated.precioUnitario || 0))
    }
    onChange(idx, updated)
  }
  return (
    <div className="border border-birth-gray-2 rounded p-3 space-y-2">
      <div className="flex gap-2">
        <input value={item.descripcion} onChange={e => set('descripcion', e.target.value)}
          placeholder="Descripción del ítem"
          className="flex-1 min-w-0 border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        <button type="button" onClick={() => onDelete(idx)} className="shrink-0 p-1.5 text-birth-gray-3 active:text-birth-red">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-birth-gray-4 font-dm uppercase tracking-wider mb-0.5">Cant.</label>
          <input type="number" min="0" value={item.cantidad} onChange={e => set('cantidad', parseFloat(e.target.value) || 0)}
            className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm text-center focus:outline-none focus:border-birth-black" />
        </div>
        <div>
          <label className="block text-[10px] text-birth-gray-4 font-dm uppercase tracking-wider mb-0.5">Precio unit.</label>
          <input type="number" min="0" value={item.precioUnitario} onChange={e => set('precioUnitario', parseFloat(e.target.value) || 0)}
            className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm text-right focus:outline-none focus:border-birth-black" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-0.5 border-t border-birth-gray-2">
        <span className="text-xs text-birth-gray-4 font-dm">Total</span>
        <span className="font-barlow text-base font-bold text-birth-black">{clp(item.total)}</span>
      </div>
    </div>
  )
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
      <td className="py-2 px-2 w-16">
        <input type="number" min="0" value={item.cantidad} onChange={e => set('cantidad', parseFloat(e.target.value) || 0)}
          className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm text-center focus:outline-none focus:border-birth-black" />
      </td>
      <td className="py-2 px-2 w-28">
        <input type="number" min="0" value={item.precioUnitario} onChange={e => set('precioUnitario', parseFloat(e.target.value) || 0)}
          className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm text-right focus:outline-none focus:border-birth-black" />
      </td>
      <td className="py-2 pl-2 w-28 text-right font-medium text-sm font-dm pr-2">{clp(item.total)}</td>
      <td className="py-2 w-8">
        <button onClick={() => onDelete(idx)} className="p-1 text-birth-gray-3 hover:text-birth-red"><X size={13} /></button>
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
  const agregarItem = () => set('items', [...form.items, { descripcion: '', cantidad: 1, precioUnitario: 0, total: 0 }])
  const updateItem = (idx, item) => { const items = [...form.items]; items[idx] = item; set('items', items) }
  const deleteItem = (idx) => set('items', form.items.filter((_, i) => i !== idx))

  const handleClienteChange = (id) => {
    const c = clientes.find(c => c.id === id)
    set('clienteId', id); set('clienteNombre', c ? c.nombre : '')
  }
  const crearCliente = () => {
    if (!ncForm.nombre.trim()) return
    const c = saveCliente(ncForm)
    handleClienteChange(c.id)
    setNuevoCliente(false)
  }
  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, ...totales, fechaVencimiento })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 overflow-auto">
      <div className="bg-white w-full md:max-w-2xl shadow-xl md:my-4 rounded-t-2xl md:rounded-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t-2xl md:rounded-t-2xl">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {cotizacion?.id ? `EDITAR #${cotizacion.numero}` : 'NUEVA COTIZACIÓN'}
          </h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1.5 font-dm uppercase tracking-wider">Cliente *</label>
            {!nuevoCliente ? (
              <div className="flex gap-2">
                <select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)}
                  className="flex-1 border border-birth-gray-2 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` — ${c.empresa}` : ''}</option>)}
                </select>
                <button type="button" onClick={() => setNuevoCliente(true)}
                  className="px-3 border border-birth-gray-2 rounded text-sm font-dm text-birth-gray-4 hover:border-birth-black whitespace-nowrap py-2.5">
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="border border-birth-gray-2 rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Nombre *" value={ncForm.nombre} onChange={e => setNcForm(f => ({ ...f, nombre: e.target.value }))}
                    className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
                  <input placeholder="Empresa" value={ncForm.empresa} onChange={e => setNcForm(f => ({ ...f, empresa: e.target.value }))}
                    className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={crearCliente}
                    className="bg-birth-black text-white px-4 py-2 rounded text-sm font-dm hover:bg-birth-red transition-colors">
                    Crear y seleccionar
                  </button>
                  <button type="button" onClick={() => setNuevoCliente(false)} className="text-sm font-dm text-birth-gray-4">Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Fecha', key: 'fecha', type: 'date' },
              { label: 'Validez (días)', key: 'validez', type: 'number' },
              { label: 'Inicio trabajo', key: 'fechaInicio', type: 'date' },
              { label: 'Fecha entrega', key: 'fechaEntrega', type: 'date' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">{label}</label>
                <input type={type} value={form[key]} onChange={e => set(key, type === 'number' ? parseInt(e.target.value) || 15 : e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
              </div>
            ))}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Descripción del proyecto</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2}
              className="w-full border border-birth-gray-2 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Ítems</label>
              <button type="button" onClick={agregarItem} className="flex items-center gap-1 text-xs font-dm text-birth-black hover:text-birth-red">
                <Plus size={12} /> Agregar ítem
              </button>
            </div>
            {/* Móvil: cards */}
            <div className="md:hidden space-y-2">
              {form.items.length === 0 ? (
                <p className="text-center py-5 text-birth-gray-3 text-sm font-dm">Sin ítems</p>
              ) : form.items.map((item, idx) => (
                <MobileItemCard key={idx} item={item} idx={idx} onChange={updateItem} onDelete={deleteItem} />
              ))}
            </div>
            {/* Desktop: tabla */}
            <div className="hidden md:block border border-birth-gray-2 rounded overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-birth-gray">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Descripción</th>
                    <th className="text-center px-2 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider w-16">Cant.</th>
                    <th className="text-right px-2 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider w-28">P. Unit.</th>
                    <th className="text-right px-2 py-2 text-xs text-birth-gray-4 font-medium uppercase tracking-wider w-28">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {form.items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-5 text-birth-gray-3 text-sm font-dm">Sin ítems</td></tr>
                  ) : form.items.map((item, idx) => (
                    <ItemRow key={idx} item={item} idx={idx} onChange={updateItem} onDelete={deleteItem} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forma pago, totales */}
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Forma de pago</label>
                <input value={form.formaPago} onChange={e => set('formaPago', e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
              </div>
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Plazo de entrega</label>
                <input value={form.plazoEntrega} onChange={e => set('plazoEntrega', e.target.value)} placeholder="5 días hábiles"
                  className="w-full border border-birth-gray-2 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
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
            <div className="w-full md:w-48 border border-birth-gray-2 rounded p-4 space-y-2 shrink-0">
              <label className="flex items-center gap-2 text-sm font-dm cursor-pointer mb-3">
                <input type="checkbox" checked={form.conIva} onChange={e => set('conIva', e.target.checked)} className="accent-birth-black" />
                <span className="text-birth-gray-4">IVA (19%)</span>
              </label>
              <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                <span>Subtotal</span><span>{clp(totales.subtotal)}</span>
              </div>
              {form.conIva && (
                <div className="flex justify-between text-sm font-dm text-birth-gray-4">
                  <span>IVA</span><span>{clp(totales.iva)}</span>
                </div>
              )}
              <div className="border-t border-birth-gray-2 pt-2 flex justify-between font-barlow text-lg font-bold text-birth-black">
                <span>TOTAL</span><span>{clp(totales.total)}</span>
              </div>
              <div>
                <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Estado</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value)}
                  className="w-full border border-birth-gray-2 rounded px-2 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
                  <option value="por_aceptar">Por aceptar</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-birth-gray-2">
            <button type="submit"
              className="flex-1 bg-birth-black text-white py-3 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
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

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function Cotizaciones() {
  const location = useLocation()
  const [cotizaciones, setCotizaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(null) // cotizacion id
  const [resumen, setResumen] = useState(null) // cotizacion obj
  const [pdfPreview, setPdfPreview] = useState(null) // { url, filename }
  const [envioEstado, setEnvioEstado] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = () => { setCotizaciones(getCotizaciones()); setClientes(getClientes()) }

  useEffect(() => {
    cargar()
    if (location.state?.items) {
      setModal({ items: location.state.items, clienteId: location.state.cliente?.id || '', clienteNombre: location.state.cliente?.nombre || '' })
    }
  }, [])

  const handleSave = (data) => { saveCotizacion(data); cargar(); setModal(null) }
  const handleDelete = (id) => { if (!confirm('¿Eliminar?')) return; deleteCotizacion(id); cargar(); setMenuAbierto(null) }

  const handlePDF = async (cot, modo = 'download') => {
    const cliente = getClienteById(cot.clienteId)
    const result = await generarCotizacionPDF(cot, cliente, modo)
    if (modo === 'preview' && result?.url) {
      setPdfPreview(result)
    }
  }

  const handleEstado = (cot, estado) => { saveCotizacion({ ...cot, estado }); cargar() }

  const handleEnviarEmail = async (cot) => {
    const cliente = getClienteById(cot.clienteId)
    const email = cliente?.correo || prompt('Email del cliente:')
    if (!email) return
    setMenuAbierto(null)
    setEnvioEstado({ tipo: 'enviando', mensaje: `Enviando cotización #${cot.numero} por correo...` })
    try {
      await enviarCotizacionEmailJS(cot, cliente, email)
      setEnvioEstado({ tipo: 'ok', mensaje: `Correo enviado a ${email}` })
      setTimeout(() => setEnvioEstado(null), 4200)
    } catch {
      abrirGmailCompose(cot, cliente, email)
      setEnvioEstado({ tipo: 'error', mensaje: 'EmailJS no respondió. Abrí Gmail con el correo listo para enviar.' })
    }
  }

  const handleEnviarWhatsApp = (cot) => {
    const cliente = getClienteById(cot.clienteId)
    window.open(buildWhatsAppUrl(cot, cliente), '_blank')
    setMenuAbierto(null)
  }

  const filtradas = cotizaciones
    .filter(c => !filtroEstado || c.estado === filtroEstado)
    .filter(c => !busqueda || c.numero?.includes(busqueda) || c.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const cotMenu = menuAbierto ? cotizaciones.find(c => c.id === menuAbierto) : null

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      <ToastEnvio estado={envioEstado} onClose={() => setEnvioEstado(null)} />

      {modal && (
        <ModalCotizacion
          cotizacion={modal.id ? modal : { ...EMPTY_COT, ...modal }}
          clientes={clientes}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {resumen && (
        <ModalResumen
          cotizacion={resumen}
          cliente={getClienteById(resumen.clienteId)}
          onClose={() => setResumen(null)}
        />
      )}

      {pdfPreview && (
        <ModalPreviewPDF
          url={pdfPreview.url}
          filename={pdfPreview.filename}
          onClose={() => { URL.revokeObjectURL(pdfPreview.url); setPdfPreview(null) }}
          onDownload={() => { const a = document.createElement('a'); a.href = pdfPreview.url; a.download = pdfPreview.filename; a.click() }}
        />
      )}

      {cotMenu && (
        <AccionesMenu
          cotizacion={cotMenu}
          onResumen={() => { setResumen(cotMenu); setMenuAbierto(null) }}
          onVerPDF={() => { handlePDF(cotMenu, 'preview'); setMenuAbierto(null) }}
          onDescargar={() => { handlePDF(cotMenu, 'download'); setMenuAbierto(null) }}
          onEnviarEmail={() => handleEnviarEmail(cotMenu)}
          onEnviarWhatsApp={() => handleEnviarWhatsApp(cotMenu)}
          onEditar={() => { setModal({ ...cotMenu }); setMenuAbierto(null) }}
          onEliminar={() => handleDelete(cotMenu.id)}
          onClose={() => setMenuAbierto(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-8 px-0.5 md:px-0">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-birth-black tracking-wide">COTIZACIONES</h1>
          <p className="text-birth-gray-3 text-xs md:text-sm font-dm mt-1">{cotizaciones.length} cotizaciones</p>
        </div>
        <button onClick={() => setModal({ ...EMPTY_COT })}
          className="flex items-center gap-2 bg-birth-black text-white px-4 py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
          <Plus size={15} /> <span className="hidden sm:inline">Nueva</span> cotización
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5 md:gap-3 mb-4 md:mb-5">
        <div className="relative flex-1 md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-birth-gray-3" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
            className="w-full pl-8 pr-4 py-2.5 border border-birth-gray-2 rounded text-sm font-dm focus:outline-none focus:border-birth-black bg-white" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {[{ v: '', l: 'Todas' }, { v: 'por_aceptar', l: 'Por aceptar' }, { v: 'aceptada', l: 'Aceptadas' }, { v: 'rechazada', l: 'Rechazadas' }].map(({ v, l }) => (
            <button key={v} onClick={() => setFiltroEstado(v)}
              className={`shrink-0 px-3 py-2 rounded text-xs font-dm border transition-colors ${filtroEstado === v ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white border border-birth-gray-2 rounded py-16 text-center text-birth-gray-3 text-sm font-dm">Sin cotizaciones</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-2.5">
            {filtradas.map(c => {
              const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
              return (
                <div key={c.id} className="bg-white border border-birth-gray-2 rounded-md overflow-hidden">
                  <div className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-barlow text-xl leading-none font-bold text-birth-black">#{c.numero}</p>
                        <p className="text-xs text-birth-gray-4 font-dm truncate mt-1">{c.clienteNombre || '—'}</p>
                        <p className="text-[11px] text-birth-gray-3 font-dm mt-0.5">{fechaCorta(c.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-barlow text-xl leading-none font-bold text-birth-red">{clp(c.total)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] rounded border ${est.color}`}>{est.label}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <ActionPill icon={MessageCircle} label="WhatsApp" tone="black" onClick={() => handleEnviarWhatsApp(c)} />
                      <ActionPill icon={Mail} label="Correo" tone="red" onClick={() => handleEnviarEmail(c)} />
                      <ActionPill icon={FileText} label="PDF" onClick={() => handlePDF(c, 'preview')} />
                      <ActionPill icon={MoreHorizontal} label="Más" onClick={() => setMenuAbierto(c.id)} />
                    </div>
                  </div>
                  <div className="px-3 pb-3 flex items-center justify-between gap-3">
                    <button onClick={() => setResumen(c)} className="text-xs font-dm text-birth-gray-4 underline-offset-2 active:text-birth-red">
                      Ver resumen
                    </button>
                    <select value={c.estado} onChange={e => handleEstado(c, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border font-dm focus:outline-none ${est.color} bg-transparent`}>
                      <option value="por_aceptar">Por aceptar</option>
                      <option value="aceptada">Aceptada</option>
                      <option value="rechazada">Rechazada</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block bg-white border border-birth-gray-2 rounded">
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
                        <select value={c.estado} onChange={e => handleEstado(c, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border font-dm cursor-pointer focus:outline-none ${est.color} bg-transparent`}>
                          <option value="por_aceptar">Por aceptar</option>
                          <option value="aceptada">Aceptada</option>
                          <option value="rechazada">Rechazada</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Ver resumen inline */}
                          <button onClick={() => setResumen(c)} title="Ver resumen"
                            className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                            <Eye size={14} />
                          </button>
                          {/* Ver PDF */}
                          <button onClick={() => handlePDF(c, 'preview')} title="Ver PDF"
                            className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                            <FileText size={14} />
                          </button>
                          {/* Descargar PDF */}
                          <button onClick={() => handlePDF(c, 'download')} title="Descargar PDF"
                            className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                            <Download size={14} />
                          </button>
                          <button onClick={() => handleEnviarWhatsApp(c)} title="Enviar por WhatsApp"
                            className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                            <MessageCircle size={14} />
                          </button>
                          <button onClick={() => handleEnviarEmail(c)} title="Enviar por correo"
                            className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray">
                            <Mail size={14} />
                          </button>
                          <button onClick={() => setMenuAbierto(c.id)} title="Más acciones"
                            className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                            <MoreHorizontal size={14} />
                          </button>
                          {/* Editar */}
                          <button onClick={() => setModal({ ...c })} title="Editar"
                            className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
                            <Edit2 size={14} />
                          </button>
                          {/* Eliminar */}
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
          </div>
        </>
      )}
    </div>
  )
}
