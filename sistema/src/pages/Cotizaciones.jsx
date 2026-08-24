import { useState, useEffect } from 'react'
import { saveCotizacion, deleteCotizacion, saveCliente, getClienteById, subscribeCotizaciones, subscribeClientes, syncPublicStats } from '../utils/storage'
import { clp, fechaCorta, hoy, sumarDias, ESTADOS } from '../utils/formatters'
import { generarCotizacionPDF } from '../utils/pdf'
import { enviarCotizacionEmailJS, abrirGmailCompose, buildWhatsAppUrl, formatEmailJSError } from '../utils/email'
import { CATEGORIAS, PRODUCTOS } from '../data/productos'
import { useLocation } from 'react-router-dom'
import AdjuntarPrototipo from '../components/AdjuntarPrototipo'
import {
  Plus, Download, Trash2, Edit2, X, Search,
  Eye, Mail, MessageCircle, FileText, MoreHorizontal, CheckCircle, AlertCircle, Loader2,
  BookOpen,
} from 'lucide-react'

// Catálogo plano para el selector — excluye calculadoras complejas
const SKIP = new Set(['tarjetas', 'bastidor', 'bandera_vela', 'volantes', 'pendon', 'manual', 'miscelaneos'])
const CATALOGO_PLANO = CATEGORIAS
  .filter(c => !SKIP.has(c.id))
  .flatMap(cat => (PRODUCTOS[cat.id] || []).map(p => ({ ...p, catLabel: cat.label })))

// ─── SELECTOR DE PRODUCTOS DEL CATÁLOGO ──────────────────────────────────────
function CatalogoPicker({ onAgregar, onClose }) {
  const [buscar, setBuscar] = useState('')

  const filtrados = buscar.length >= 1
    ? CATALOGO_PLANO.filter(p =>
        p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
        p.catLabel.toLowerCase().includes(buscar.toLowerCase())
      )
    : CATALOGO_PLANO

  const handleSelect = (producto) => {
    const needsDims = ['m2', 'ml'].includes(producto.unidad)
    const desc = needsDims
      ? `${producto.nombre} (ingresar medidas)`
      : producto.nombre
    const total = needsDims || producto.unidad === 'libre' ? 0 : producto.precio

    onAgregar({
      descripcion: desc,
      cantidad: 1,
      precioUnitario: producto.precio,
      total,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}>
      <div className="glass-panel bg-white/90 w-full md:max-w-md rounded-t-[32px] md:rounded-widget shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/50 flex items-center gap-3 shrink-0">
          <div className="flex-1 flex items-center gap-2 bg-white/50 rounded px-3 py-2">
            <Search size={14} className="text-on-surface-variant shrink-0" />
            <input
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar producto o servicio..."
              autoFocus
              className="flex-1 bg-transparent text-sm font-dm focus:outline-none placeholder-on-surface-variant"
            />
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1"><X size={16} /></button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1">
          {filtrados.length === 0 ? (
            <p className="py-10 text-center text-on-surface-variant text-sm font-dm">Sin resultados</p>
          ) : (
            filtrados.map(p => (
              <button key={p.id} onClick={() => handleSelect(p)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-white/50 hover:bg-white/50 active:bg-white/70 text-left transition-colors">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-dm font-medium text-on-surface leading-snug">{p.nombre}</p>
                  <p className="text-[11px] text-on-surface-variant font-dm mt-0.5">{p.catLabel}</p>
                </div>
                <div className="text-right shrink-0">
                  {p.precio > 0 && (
                    <p className="text-sm font-dm font-semibold text-on-surface">
                      {clp(p.precio)}
                      <span className="text-[10px] text-on-surface-variant ml-1 font-normal">/{p.unidad}</span>
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="pb-safe shrink-0 h-2" />
      </div>
    </div>
  )
}

const EMPTY_COT = {
  clienteId: '', clienteNombre: '', descripcion: '',
  fecha: hoy(), validez: 15,
  items: [],
  formaPago: 'Transferencia bancaria — 50% anticipo, 50% contra entrega',
  plazoEntrega: '', incluye: '', noIncluye: '',
  conIva: true, estado: 'por_aceptar',
  fechaInicio: '', fechaEntrega: '',
  tipoProyecto: 'publicidad', // 'publicidad' (Birth Studio) | 'estructuras' (Tensión)
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
      <div className="glass-panel bg-white/90 w-full md:max-w-lg shadow-xl max-h-[92vh] overflow-y-auto rounded-t-[32px] md:rounded-widget">
        {/* Header */}
        <div className="sticky top-0 bg-on-surface px-5 py-4 flex items-center justify-between rounded-t-[32px] md:rounded-t-widget">
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
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">Cliente</p>
              <p className="font-medium text-on-surface">{cotizacion.clienteNombre || '—'}</p>
              {cliente?.empresa && <p className="text-xs text-on-surface-variant">{cliente.empresa}</p>}
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">Fecha</p>
              <p className="font-medium text-on-surface">{fechaCorta(cotizacion.fecha)}</p>
              {cotizacion.fechaVencimiento && <p className="text-xs text-on-surface-variant">Vence: {fechaCorta(cotizacion.fechaVencimiento)}</p>}
            </div>
          </div>

          {cotizacion.descripcion && (
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Proyecto</p>
              <p className="text-sm text-on-surface-variant font-dm">{cotizacion.descripcion}</p>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">Ítems</p>
            <div className="border border-white/50 rounded overflow-hidden">
              {(cotizacion.items || []).map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2.5 text-sm font-dm ${i > 0 ? 'border-t border-white/50' : ''}`}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-medium text-on-surface truncate">{item.descripcion}</p>
                    <p className="text-xs text-on-surface-variant">{item.cantidad} × {clp(item.precioUnitario)}</p>
                  </div>
                  <span className="font-bold shrink-0">{clp(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="bg-white/50 rounded p-4 space-y-1.5">
            <div className="flex justify-between text-sm font-dm text-on-surface-variant">
              <span>Subtotal neto</span><span>{clp(cotizacion.subtotal)}</span>
            </div>
            {cotizacion.iva > 0 && (
              <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                <span>IVA (19%)</span><span>{clp(cotizacion.iva)}</span>
              </div>
            )}
            <div className="flex justify-between font-barlow text-xl font-bold pt-1 border-t border-white/50">
              <span>TOTAL</span><span className="text-primary">{clp(cotizacion.total)}</span>
            </div>
            <div className="flex justify-between text-xs font-dm text-on-surface-variant">
              <span>Anticipo 50%</span><span>{clp(cotizacion.anticipo)}</span>
            </div>
          </div>

          {cotizacion.formaPago && (
            <div className="text-sm font-dm">
              <span className="text-on-surface-variant">Forma de pago: </span>
              <span className="text-on-surface">{cotizacion.formaPago}</span>
            </div>
          )}
          {cotizacion.plazoEntrega && (
            <div className="text-sm font-dm">
              <span className="text-on-surface-variant">Plazo: </span>
              <span className="text-on-surface">{cotizacion.plazoEntrega}</span>
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
      <div className="bg-on-surface px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-white font-barlow text-base font-bold tracking-wide">VISTA PREVIA</p>
          <p className="text-white/30 text-[10px] font-dm truncate max-w-[200px]">{filename}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDownload}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded text-xs font-dm hover:bg-red-700 transition-colors">
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
          ? 'bg-white border-primary text-on-surface'
          : 'bg-on-surface border-on-surface text-white'
      }`}>
        <Icon size={18} className={`${estado.tipo === 'enviando' ? 'animate-spin' : ''} ${estado.tipo === 'ok' ? 'text-primary' : ''}`} />
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
    neutral: 'bg-white/50 text-on-surface border-white/60 active:border-primary',
    black: 'bg-on-surface text-white border-on-surface active:bg-primary',
    red: 'bg-primary text-white border-primary active:bg-on-surface',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-10 px-3 rounded-full border flex items-center justify-center gap-2 text-xs font-dm font-medium transition-colors disabled:opacity-45 ${styles[tone]}`}
    >
      <Icon size={15} strokeWidth={2} />
      <span>{label}</span>
    </button>
  )
}

// ─── MENÚ DE ACCIONES ─────────────────────────────────────────────────────────
function AccionesMenu({ cotizacion, clientes, onResumen, onVerPDF, onDescargar, onEditar, onEliminar, onEnviarEmail, onEnviarWhatsApp, onClose }) {
  const cliente = clientes.find(c => c.id === cotizacion.clienteId) || null

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
        className="glass-panel bg-white/90 w-full md:max-w-xs rounded-t-[32px] md:rounded-widget shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header del menú — fijo arriba */}
        <div className="px-4 py-3 border-b border-white/50 flex items-center justify-between shrink-0">
          <div>
            <p className="font-barlow font-bold text-on-surface">#{cotizacion.numero}</p>
            <p className="text-xs text-on-surface-variant font-dm">{cotizacion.clienteNombre || '—'} · {clp(cotizacion.total)}</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1"><X size={16} /></button>
        </div>

        {/* Acciones con scroll si no caben */}
        <div className="overflow-y-auto flex-1">
          {acciones.map(grupo => (
            <div key={grupo.grupo}>
              <p className="px-4 pt-3 pb-1 text-[9px] font-dm uppercase tracking-widest text-on-surface-variant">{grupo.grupo}</p>
              {grupo.items.map(({ icon: Icon, label, desc, onClick, danger }) => (
                <button key={label} onClick={onClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/50 transition-colors active:bg-white/70 ${danger ? 'text-primary' : 'text-on-surface'}`}>
                  <Icon size={17} strokeWidth={1.75} className={danger ? 'text-primary' : 'text-on-surface-variant'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-dm font-medium">{label}</p>
                    {desc && <p className="text-[10px] text-on-surface-variant truncate">{desc}</p>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Botón eliminar fijo al fondo — siempre visible */}
        <div className="border-t border-white/50 shrink-0">
          <button onClick={onEliminar}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-primary hover:bg-red-50 active:bg-red-100 transition-colors">
            <Trash2 size={16} />
            <span className="text-sm font-dm font-semibold">Eliminar cotización</span>
          </button>
          <div className="pb-safe" />
        </div>
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
    <div className="border border-white/50 rounded p-3 space-y-2">
      <div className="flex gap-2">
        <input value={item.descripcion} onChange={e => set('descripcion', e.target.value)}
          placeholder="Descripción del ítem"
          className="flex-1 min-w-0 border border-white/50 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
        <button type="button" onClick={() => onDelete(idx)} className="shrink-0 p-1.5 text-on-surface-variant active:text-primary">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-on-surface-variant font-dm uppercase tracking-wider mb-0.5">Cant.</label>
          <input type="number" min="0" value={item.cantidad} onChange={e => set('cantidad', parseFloat(e.target.value) || 0)}
            className="w-full border border-white/50 rounded px-2 py-1.5 text-sm font-dm text-center focus:outline-none focus:border-on-surface" />
        </div>
        <div>
          <label className="block text-[10px] text-on-surface-variant font-dm uppercase tracking-wider mb-0.5">Precio unit.</label>
          <input type="number" min="0" value={item.precioUnitario} onChange={e => set('precioUnitario', parseFloat(e.target.value) || 0)}
            className="w-full border border-white/50 rounded px-2 py-1.5 text-sm font-dm text-right focus:outline-none focus:border-on-surface" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-0.5 border-t border-white/50">
        <span className="text-xs text-on-surface-variant font-dm">Total</span>
        <span className="font-barlow text-base font-bold text-on-surface">{clp(item.total)}</span>
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
    <tr className="border-b border-white/50">
      <td className="py-2 pr-2">
        <input value={item.descripcion} onChange={e => set('descripcion', e.target.value)}
          className="w-full border border-white/50 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
      </td>
      <td className="py-2 px-2 w-16">
        <input type="number" min="0" value={item.cantidad} onChange={e => set('cantidad', parseFloat(e.target.value) || 0)}
          className="w-full border border-white/50 rounded px-2 py-1.5 text-sm font-dm text-center focus:outline-none focus:border-on-surface" />
      </td>
      <td className="py-2 px-2 w-28">
        <input type="number" min="0" value={item.precioUnitario} onChange={e => set('precioUnitario', parseFloat(e.target.value) || 0)}
          className="w-full border border-white/50 rounded px-2 py-1.5 text-sm font-dm text-right focus:outline-none focus:border-on-surface" />
      </td>
      <td className="py-2 pl-2 w-28 text-right font-medium text-sm font-dm pr-2">{clp(item.total)}</td>
      <td className="py-2 w-8">
        <button onClick={() => onDelete(idx)} className="p-1 text-on-surface-variant hover:text-primary"><X size={13} /></button>
      </td>
    </tr>
  )
}

function ModalCotizacion({ cotizacion, clientes, onClose, onSave }) {
  const [form, setForm] = useState(cotizacion?.id ? { ...EMPTY_COT, ...cotizacion } : { ...EMPTY_COT })
  const [nuevoCliente, setNuevoCliente] = useState(false)
  const [ncForm, setNcForm] = useState({ nombre: '', empresa: '', rut: '', ciudad: '', correo: '', telefono: '' })
  const [showCatalog, setShowCatalog] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const totales = calcularTotales(form.items, form.conIva)
  const fechaVencimiento = sumarDias(form.fecha, parseInt(form.validez) || 15)
  const agregarItem = () => set('items', [...form.items, { descripcion: '', cantidad: 1, precioUnitario: 0, total: 0 }])
  const agregarDesde = (item) => set('items', [...form.items, { ...item }])
  const updateItem = (idx, item) => { const items = [...form.items]; items[idx] = item; set('items', items) }
  const deleteItem = (idx) => set('items', form.items.filter((_, i) => i !== idx))

  const handleClienteChange = (id) => {
    const c = clientes.find(c => c.id === id)
    set('clienteId', id); set('clienteNombre', c ? c.nombre : '')
  }
  const crearCliente = async () => {
    if (!ncForm.nombre.trim()) return
    const c = await saveCliente(ncForm)
    handleClienteChange(c.id)
    setNuevoCliente(false)
  }
  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, ...totales, fechaVencimiento })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 overflow-auto">
      <div className="glass-panel bg-white/90 w-full md:max-w-2xl shadow-xl md:my-4 rounded-t-[32px] md:rounded-widget max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-[32px] md:rounded-t-widget">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {cotizacion?.id ? `EDITAR #${cotizacion.numero}` : 'NUEVA COTIZACIÓN'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo de proyecto — define que marca sale en el PDF */}
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5 font-dm uppercase tracking-wider">¿Qué tipo de proyecto quieres realizar? *</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => set('tipoProyecto', 'publicidad')}
                className={`px-3 py-2.5 rounded border text-sm font-dm font-medium transition-colors ${
                  form.tipoProyecto === 'publicidad'
                    ? 'border-on-surface bg-on-surface text-white'
                    : 'border-white/50 text-on-surface-variant hover:border-on-surface'
                }`}>
                Publicidad — Birth Studio
              </button>
              <button type="button" onClick={() => set('tipoProyecto', 'estructuras')}
                className={`px-3 py-2.5 rounded border text-sm font-dm font-medium transition-colors ${
                  form.tipoProyecto === 'estructuras'
                    ? 'border-on-surface bg-on-surface text-white'
                    : 'border-white/50 text-on-surface-variant hover:border-on-surface'
                }`}>
                Estructuras — Tensión
              </button>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5 font-dm uppercase tracking-wider">Cliente *</label>
            {!nuevoCliente ? (
              <div className="flex gap-2">
                <select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)}
                  className="flex-1 border border-white/50 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-on-surface bg-white">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` — ${c.empresa}` : ''}</option>)}
                </select>
                <button type="button" onClick={() => setNuevoCliente(true)}
                  className="px-3 border border-white/50 rounded text-sm font-dm text-on-surface-variant hover:border-on-surface whitespace-nowrap py-2.5">
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="border border-white/50 rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Nombre *" value={ncForm.nombre} onChange={e => setNcForm(f => ({ ...f, nombre: e.target.value }))}
                    className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
                  <input placeholder="Empresa" value={ncForm.empresa} onChange={e => setNcForm(f => ({ ...f, empresa: e.target.value }))}
                    className="border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={crearCliente}
                    className="bg-on-surface text-white px-4 py-2 rounded text-sm font-dm hover:bg-primary transition-colors">
                    Crear y seleccionar
                  </button>
                  <button type="button" onClick={() => setNuevoCliente(false)} className="text-sm font-dm text-on-surface-variant">Cancelar</button>
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
                <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">{label}</label>
                <input type={type} value={form[key]} onChange={e => set(key, type === 'number' ? parseInt(e.target.value) || 15 : e.target.value)}
                  className="w-full border border-white/50 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
              </div>
            ))}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Descripción del proyecto</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2}
              className="w-full border border-white/50 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-on-surface resize-none" />
          </div>

          {/* Prototipo del letrero (opcional) */}
          <AdjuntarPrototipo value={form.prototipoImg || null} onChange={(v) => set('prototipoImg', v)} />

          {/* Ítems */}
          <div>
            {showCatalog && (
              <CatalogoPicker
                onAgregar={agregarDesde}
                onClose={() => setShowCatalog(false)}
              />
            )}
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-on-surface-variant font-dm uppercase tracking-wider">Ítems</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowCatalog(true)}
                  className="flex items-center gap-1 text-xs font-dm text-on-surface border border-white/50 rounded px-2.5 py-1 hover:border-on-surface hover:bg-white/50 transition-colors">
                  <BookOpen size={11} /> Catálogo
                </button>
                <button type="button" onClick={agregarItem}
                  className="flex items-center gap-1 text-xs font-dm text-on-surface hover:text-primary">
                  <Plus size={12} /> Manual
                </button>
              </div>
            </div>
            {/* Móvil: cards */}
            <div className="md:hidden space-y-2">
              {form.items.length === 0 ? (
                <p className="text-center py-5 text-on-surface-variant text-sm font-dm">Sin ítems</p>
              ) : form.items.map((item, idx) => (
                <MobileItemCard key={idx} item={item} idx={idx} onChange={updateItem} onDelete={deleteItem} />
              ))}
            </div>
            {/* Desktop: tabla */}
            <div className="hidden md:block border border-white/50 rounded overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-white/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Descripción</th>
                    <th className="text-center px-2 py-2 text-xs text-on-surface-variant font-medium uppercase tracking-wider w-16">Cant.</th>
                    <th className="text-right px-2 py-2 text-xs text-on-surface-variant font-medium uppercase tracking-wider w-28">P. Unit.</th>
                    <th className="text-right px-2 py-2 text-xs text-on-surface-variant font-medium uppercase tracking-wider w-28">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {form.items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-5 text-on-surface-variant text-sm font-dm">Sin ítems</td></tr>
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
                <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Forma de pago</label>
                <input value={form.formaPago} onChange={e => set('formaPago', e.target.value)}
                  className="w-full border border-white/50 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Plazo de entrega</label>
                <input value={form.plazoEntrega} onChange={e => set('plazoEntrega', e.target.value)} placeholder="5 días hábiles"
                  className="w-full border border-white/50 rounded px-3 py-2.5 text-sm font-dm focus:outline-none focus:border-on-surface" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Incluye</label>
                  <textarea value={form.incluye} onChange={e => set('incluye', e.target.value)} rows={2}
                    className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">No incluye</label>
                  <textarea value={form.noIncluye} onChange={e => set('noIncluye', e.target.value)} rows={2}
                    className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface resize-none" />
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="w-full md:w-48 border border-white/50 rounded p-4 space-y-2 shrink-0">
              <label className="flex items-center gap-2 text-sm font-dm cursor-pointer mb-3">
                <input type="checkbox" checked={form.conIva} onChange={e => set('conIva', e.target.checked)} className="accent-primary" />
                <span className="text-on-surface-variant">IVA (19%)</span>
              </label>
              <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                <span>Subtotal</span><span>{clp(totales.subtotal)}</span>
              </div>
              {form.conIva && (
                <div className="flex justify-between text-sm font-dm text-on-surface-variant">
                  <span>IVA</span><span>{clp(totales.iva)}</span>
                </div>
              )}
              <div className="border-t border-white/50 pt-2 flex justify-between font-barlow text-lg font-bold text-on-surface">
                <span>TOTAL</span><span>{clp(totales.total)}</span>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Estado</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value)}
                  className="w-full border border-white/50 rounded px-2 py-2 text-sm font-dm focus:outline-none focus:border-on-surface bg-white">
                  <option value="por_aceptar">Por aceptar</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-white/50">
            <button type="submit"
              className="flex-1 bg-on-surface text-white py-3 rounded text-sm font-dm font-medium hover:bg-primary transition-colors">
              {cotizacion?.id ? 'Guardar cambios' : 'Crear cotización'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 border border-white/50 rounded text-sm font-dm text-on-surface-variant hover:border-on-surface transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL CONFIRMAR BORRADO ──────────────────────────────────────────────────
function ConfirmDeleteModal({ cotizacion, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[80] p-0 md:p-4">
      <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full md:max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-barlow font-bold text-on-surface text-lg leading-tight">¿Eliminar cotización?</p>
            <p className="text-xs text-on-surface-variant font-dm mt-0.5">#{cotizacion.numero} · {cotizacion.clienteNombre || '—'}</p>
          </div>
        </div>
        <p className="text-sm text-on-surface-variant font-dm">Esta acción no se puede deshacer. La cotización se eliminará permanentemente.</p>
        <div className="flex gap-3 pt-1 pb-safe">
          <button onClick={onCancel}
            className="flex-1 border border-white/50 rounded py-2.5 text-sm font-dm text-on-surface-variant hover:border-on-surface transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-primary text-white rounded py-2.5 text-sm font-dm font-medium hover:bg-red-700 transition-colors">
            Sí, eliminar
          </button>
        </div>
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
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [cotizacionesCargadas, setCotizacionesCargadas] = useState(false)

  const clienteLocal = (id) => clientes.find(c => c.id === id) || null

  useEffect(() => {
    const u1 = subscribeCotizaciones((data) => { setCotizaciones(data); setCotizacionesCargadas(true) })
    const u2 = subscribeClientes(setClientes)
    if (location.state?.items) {
      setModal({ items: location.state.items, clienteId: location.state.cliente?.id || '', clienteNombre: location.state.cliente?.nombre || '' })
    }
    return () => { u1(); u2() }
  }, [])

  // Sincroniza el contador público en el momento exacto en que una
  // cotización pasa a "aceptada" (o cambia de estado) — no depende de que
  // alguien abra el Dashboard después.
  useEffect(() => {
    if (!cotizacionesCargadas) return
    const aceptadas = cotizaciones.filter(c => c.estado === 'aceptada').length
    syncPublicStats(aceptadas).catch(() => {})
  }, [cotizacionesCargadas, cotizaciones])

  const handleSave = async (data) => { await saveCotizacion(data); setModal(null) }
  const handleDelete = (cot) => { setMenuAbierto(null); setConfirmDelete(cot) }
  const handleConfirmDelete = async () => { await deleteCotizacion(confirmDelete.id); setConfirmDelete(null) }

  const handlePDF = async (cot, modo = 'download') => {
    const cliente = clienteLocal(cot.clienteId)
    const result = await generarCotizacionPDF(cot, cliente, modo)
    if (modo === 'preview' && result?.url) {
      setPdfPreview(result)
    }
  }

  const handleEstado = async (cot, estado) => { await saveCotizacion({ ...cot, estado }) }

  const handleEnviarEmail = async (cot) => {
    const cliente = clienteLocal(cot.clienteId)
    const email = cliente?.correo || prompt('Email del cliente:')
    if (!email) return
    setMenuAbierto(null)
    setEnvioEstado({ tipo: 'enviando', mensaje: `Enviando cotización #${cot.numero} por correo...` })
    try {
      await enviarCotizacionEmailJS(cot, cliente, email)
      setEnvioEstado({ tipo: 'ok', mensaje: `Correo enviado a ${email}` })
      setTimeout(() => setEnvioEstado(null), 2500)
    } catch (err) {
      abrirGmailCompose(cot, cliente, email)
      setEnvioEstado({ tipo: 'error', mensaje: `EmailJS falló: ${formatEmailJSError(err)}. Abrí Gmail con el correo listo.` })
    }
  }

  const handleEnviarWhatsApp = async (cot) => {
    const cliente = clienteLocal(cot.clienteId)
    setMenuAbierto(null)
    try {
      const { blob, filename } = await generarCotizacionPDF(cot, cliente, 'blob')
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Móvil: selector nativo del sistema — el usuario elige WhatsApp
        await navigator.share({
          files: [file],
          title: `Cotización #${cot.numero} — Birth Studio`,
          text: `Hola${cot.clienteNombre ? ' ' + cot.clienteNombre : ''}, adjunto la cotización #${cot.numero} de Birth Studio SpA por ${clp(cot.total)}.`,
        })
      } else {
        // Desktop: descarga el PDF y abre WhatsApp con el texto
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
        URL.revokeObjectURL(url)
        setTimeout(() => window.open(buildWhatsAppUrl(cot, cliente), '_blank'), 600)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        // Si algo falla, fallback al link de WhatsApp normal
        window.open(buildWhatsAppUrl(cot, cliente), '_blank')
      }
    }
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
          cliente={clienteLocal(resumen.clienteId)}
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

      {confirmDelete && (
        <ConfirmDeleteModal
          cotizacion={confirmDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {cotMenu && (
        <AccionesMenu
          cotizacion={cotMenu}
          clientes={clientes}
          onResumen={() => { setResumen(cotMenu); setMenuAbierto(null) }}
          onVerPDF={() => { handlePDF(cotMenu, 'preview'); setMenuAbierto(null) }}
          onDescargar={() => { handlePDF(cotMenu, 'download'); setMenuAbierto(null) }}
          onEnviarEmail={() => handleEnviarEmail(cotMenu)}
          onEnviarWhatsApp={() => handleEnviarWhatsApp(cotMenu)}
          onEditar={() => { setModal({ ...cotMenu }); setMenuAbierto(null) }}
          onEliminar={() => handleDelete(cotMenu)}
          onClose={() => setMenuAbierto(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-8 px-0.5 md:px-0">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-on-surface tracking-wide">COTIZACIONES</h1>
          <p className="text-on-surface-variant text-xs md:text-sm font-dm mt-1">{cotizaciones.length} cotizaciones</p>
        </div>
        <button onClick={() => setModal({ ...EMPTY_COT })}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
          <Plus size={15} /> <span className="hidden sm:inline">Nueva</span> cotización
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5 md:gap-3 mb-4 md:mb-5">
        <div className="relative flex-1 md:max-w-xs">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2.5 border border-white/60 rounded-full text-sm font-dm focus:outline-none focus:border-primary bg-white/50 focus:bg-white" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {[{ v: '', l: 'Todas' }, { v: 'por_aceptar', l: 'Por aceptar' }, { v: 'aceptada', l: 'Aceptadas' }, { v: 'rechazada', l: 'Rechazadas' }].map(({ v, l }) => (
            <button key={v} onClick={() => setFiltroEstado(v)}
              className={`shrink-0 px-3 py-2 rounded-full text-xs font-dm border transition-colors ${filtroEstado === v ? 'bg-primary text-on-primary border-primary' : 'bg-white/50 text-on-surface-variant border-white/60 hover:border-primary'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="glass-panel rounded-widget py-16 text-center text-on-surface-variant text-sm font-dm">Sin cotizaciones</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-2.5">
            {filtradas.map(c => {
              const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
              return (
                <div key={c.id} className="glass-panel rounded-widget overflow-hidden">
                  <div className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-barlow text-xl leading-none font-bold text-on-surface">#{c.numero}</p>
                        <p className="text-xs text-on-surface-variant font-dm truncate mt-1">{c.clienteNombre || '—'}</p>
                        <p className="text-[11px] text-on-surface-variant font-dm mt-0.5">{fechaCorta(c.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-barlow text-xl leading-none font-bold text-primary">{clp(c.total)}</p>
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
                    <button onClick={() => setResumen(c)} className="text-xs font-dm text-on-surface-variant underline-offset-2 active:text-primary">
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
          <div className="hidden md:block glass-panel rounded-widget overflow-hidden">
            <table className="w-full text-sm font-dm">
              <thead>
                <tr className="border-b border-white/50">
                  <th className="text-left px-5 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Número</th>
                  <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Fecha</th>
                  <th className="text-right px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Total</th>
                  <th className="text-center px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(c => {
                  const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                  return (
                    <tr key={c.id} className="border-b border-white/50 hover:bg-white/50">
                      <td className="px-5 py-3 font-medium text-on-surface">#{c.numero}</td>
                      <td className="px-3 py-3 text-on-surface-variant">{c.clienteNombre || '—'}</td>
                      <td className="px-3 py-3 text-on-surface-variant">{fechaCorta(c.createdAt)}</td>
                      <td className="px-3 py-3 text-right font-medium">{clp(c.total)}</td>
                      <td className="px-3 py-3 text-center">
                        <select value={c.estado} onChange={e => handleEstado(c, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border font-dm cursor-pointer focus:outline-none ${est.color} bg-transparent`}>
                          <option value="por_aceptar">Por aceptar</option>
                          <option value="aceptada">Aceptada</option>
                          <option value="rechazada">Rechazada</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => setResumen(c)} title="Ver resumen"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface transition-colors text-[11px] font-dm">
                            <Eye size={13} /> <span>Resumen</span>
                          </button>
                          <button onClick={() => handlePDF(c, 'download')} title="Descargar PDF"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface transition-colors text-[11px] font-dm">
                            <Download size={13} /> <span>PDF</span>
                          </button>
                          <button onClick={() => handleEnviarWhatsApp(c)} title="WhatsApp"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/50 text-on-surface-variant hover:border-green-600 hover:text-green-600 transition-colors text-[11px] font-dm">
                            <MessageCircle size={13} /> <span>WA</span>
                          </button>
                          <button onClick={() => handleEnviarEmail(c)} title="Correo"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/50 text-on-surface-variant hover:border-primary hover:text-primary transition-colors text-[11px] font-dm">
                            <Mail size={13} /> <span>Correo</span>
                          </button>
                          <button onClick={() => setModal({ ...c })} title="Editar"
                            className="p-1.5 rounded border border-white/50 text-on-surface-variant hover:border-on-surface hover:text-on-surface transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(c)} title="Eliminar"
                            className="p-1.5 rounded border border-red-200 text-primary hover:border-primary hover:bg-red-50 transition-colors">
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
