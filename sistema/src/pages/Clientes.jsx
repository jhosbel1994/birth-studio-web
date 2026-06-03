import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveCliente, deleteCliente, subscribeClientes, subscribeCotizaciones } from '../utils/storage'
import { generarCotizacionPDF } from '../utils/pdf'
import { fechaCorta, clp, ESTADOS } from '../utils/formatters'
import { Plus, Search, Trash2, Edit2, FileText, Phone, Mail, X, MoreVertical, Download } from 'lucide-react'

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function whatsappUrl(telefono) {
  const clean = telefono.replace(/[\s\-\(\)\+]/g, '')
  const num = clean.startsWith('56') ? clean : `56${clean.replace(/^0/, '')}`
  return `https://wa.me/${num}`
}

const EMPTY = { nombre: '', apellido: '', empresa: '', rut: '', direccion: '', correo: '', telefono: '', notas: '' }

// ─── MODAL EDITAR/CREAR CLIENTE ───────────────────────────────────────────────
function Modal({ cliente, onClose, onSave }) {
  const [form, setForm] = useState(cliente?.id ? { ...cliente } : { ...EMPTY })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t-2xl md:rounded-t">
          <h2 className="font-barlow text-xl font-bold tracking-wide">{cliente?.id ? 'MODIFICAR CLIENTE' : 'NUEVO CLIENTE'}</h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.nombre.trim()) return; onSave(form) }} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Apellido</label>
              <input value={form.apellido || ''} onChange={e => set('apellido', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Empresa</label>
              <input value={form.empresa} onChange={e => set('empresa', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">RUT empresa</label>
              <input value={form.rut} onChange={e => set('rut', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="76.123.456-7" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Dirección</label>
            <input value={form.direccion || ''} onChange={e => set('direccion', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="Av. O'Higgins 123, Talca" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Correo</label>
              <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="+56 9 1234 5678" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
          </div>
          <div className="flex gap-3 pt-2 pb-safe">
            <button type="submit" className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
              {cliente?.id ? 'Guardar cambios' : 'Crear cliente'}
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

// ─── MENÚ DE OPCIONES DE TARJETA ──────────────────────────────────────────────
function CardMenu({ cliente, onClose, onEditar, onEliminar }) {
  const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-xs rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-birth-gray-2">
          <p className="font-barlow font-bold text-birth-black">{nombreCompleto}</p>
          {cliente.empresa && <p className="text-xs text-birth-gray-3 font-dm">{cliente.empresa}</p>}
        </div>
        <button onClick={onEditar}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-birth-gray active:bg-birth-gray-2 transition-colors text-birth-black">
          <Edit2 size={16} className="text-birth-gray-4" />
          <span className="text-sm font-dm font-medium">Modificar contacto</span>
        </button>
        <button onClick={onEliminar}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-red-50 active:bg-red-100 transition-colors text-birth-red border-t border-birth-gray-2">
          <Trash2 size={16} />
          <span className="text-sm font-dm font-medium">Eliminar permanentemente</span>
        </button>
        <div className="pb-safe" />
      </div>
    </div>
  )
}

// ─── FICHA CLIENTE ────────────────────────────────────────────────────────────
function FichaCliente({ cliente, cotizaciones, onEdit, onDelete, onClose, onNuevaCotizacion }) {
  const historial = cotizaciones.filter(c => c.clienteId === cliente.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ')
  const [confirmEliminar, setConfirmEliminar] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded w-full md:max-w-lg max-h-[92vh] md:max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}>

        {/* Header: nombre + botones contacto + X */}
        <div className="px-4 pt-4 pb-3 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t-2xl md:rounded-t">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h2 className="font-barlow text-xl font-bold tracking-wide leading-tight">{nombreCompleto}</h2>
              {cliente.empresa && <p className="text-xs text-birth-gray-4 font-dm mt-0.5 truncate">{cliente.empresa}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(cliente)}
                className="p-2 text-birth-gray-3 hover:text-birth-black rounded-full hover:bg-birth-gray" title="Modificar">
                <Edit2 size={16} />
              </button>
              <button onClick={onClose}
                className="p-2 text-birth-gray-3 hover:text-birth-black rounded-full hover:bg-birth-gray">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Botones de contacto */}
          <div className="flex gap-2 flex-wrap">
            {cliente.telefono && (
              <a href={whatsappUrl(cliente.telefono)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-dm font-medium active:bg-[#25D366]/20">
                <WhatsAppIcon size={13} /> WhatsApp
              </a>
            )}
            {cliente.correo && (
              <a href={`mailto:${cliente.correo}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-birth-gray border border-birth-gray-2 text-birth-black text-xs font-dm font-medium active:bg-birth-gray-2">
                <Mail size={13} /> Correo
              </a>
            )}
            {cliente.telefono && (
              <a href={`tel:${cliente.telefono}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-birth-gray border border-birth-gray-2 text-birth-black text-xs font-dm font-medium active:bg-birth-gray-2">
                <Phone size={13} /> Llamar
              </a>
            )}
          </div>
        </div>

        <div className="p-4 md:p-5 space-y-5 pb-safe">
          {/* Datos */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-dm">
            {cliente.rut && <div><span className="text-birth-gray-4 text-[10px] uppercase tracking-wider block">RUT empresa</span><p className="mt-0.5">{cliente.rut}</p></div>}
            {(cliente.direccion || cliente.ciudad) && <div><span className="text-birth-gray-4 text-[10px] uppercase tracking-wider block">Dirección</span><p className="mt-0.5">{cliente.direccion || cliente.ciudad}</p></div>}
            {cliente.correo && <div className="col-span-2"><span className="text-birth-gray-4 text-[10px] uppercase tracking-wider block">Correo</span><p className="mt-0.5 truncate">{cliente.correo}</p></div>}
            {cliente.telefono && <div><span className="text-birth-gray-4 text-[10px] uppercase tracking-wider block">Teléfono</span><p className="mt-0.5">{cliente.telefono}</p></div>}
            {cliente.notas && <div className="col-span-2"><span className="text-birth-gray-4 text-[10px] uppercase tracking-wider block">Notas</span><p className="mt-0.5 text-birth-gray-4 text-sm">{cliente.notas}</p></div>}
          </div>

          {/* Historial de cotizaciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-barlow font-bold text-base tracking-wide">HISTORIAL</h3>
              <button onClick={() => onNuevaCotizacion(cliente)}
                className="flex items-center gap-1 text-xs bg-birth-black text-white px-3 py-1.5 rounded hover:bg-birth-red transition-colors font-dm">
                <Plus size={12} /> Nueva cotización
              </button>
            </div>
            {historial.length === 0 ? (
              <p className="text-sm text-birth-gray-3 font-dm">Sin cotizaciones aún.</p>
            ) : (
              <div className="space-y-2">
                {historial.map(c => {
                  const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-birth-gray rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium font-dm">#{c.numero}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${est.color}`}>{est.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-xs text-birth-gray-3 font-dm">{fechaCorta(c.createdAt)}</p>
                          <p className="text-sm font-medium font-dm">{clp(c.total)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => generarCotizacionPDF(c, cliente, 'download')}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-birth-gray-2 text-xs font-dm text-birth-black hover:border-birth-black active:bg-birth-gray transition-colors"
                        title="Descargar PDF">
                        <Download size={13} /> PDF
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Botón eliminar cliente */}
          <div className="pt-2 border-t border-birth-gray-2">
            {!confirmEliminar ? (
              <button onClick={() => setConfirmEliminar(true)}
                className="w-full py-3 rounded border border-birth-red text-birth-red text-sm font-dm font-medium hover:bg-red-50 active:bg-red-100 transition-colors flex items-center justify-center gap-2">
                <Trash2 size={15} /> Eliminar cliente
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-center font-dm text-birth-gray-4">¿Eliminar a <strong>{nombreCompleto}</strong> permanentemente?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmEliminar(false)}
                    className="flex-1 py-2.5 rounded border border-birth-gray-2 text-sm font-dm text-birth-gray-4 hover:border-birth-black">
                    Cancelar
                  </button>
                  <button onClick={() => onDelete(cliente.id)}
                    className="flex-1 py-2.5 rounded bg-birth-red text-white text-sm font-dm font-medium hover:bg-red-700">
                    Sí, eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [ficha, setFicha] = useState(null)
  const [editando, setEditando] = useState(null)
  const [cardMenu, setCardMenu] = useState(null) // cliente obj

  useEffect(() => {
    const u1 = subscribeClientes(setClientes)
    const u2 = subscribeCotizaciones(setCotizaciones)
    return () => { u1(); u2() }
  }, [])

  const filtrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.empresa?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleSave = async (form) => {
    await saveCliente(form)
    setModal(null)
    setEditando(null)
    if (ficha?.id === form.id) setFicha(form)
  }

  const handleDelete = async (id) => {
    await deleteCliente(id)
    setFicha(null)
  }

  const handleNuevaCotizacion = (cliente) => {
    setFicha(null)
    navigate('/cotizador', { state: { cliente } })
  }

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      {(modal || editando) && (
        <Modal
          cliente={editando}
          onClose={() => { setModal(null); setEditando(null) }}
          onSave={handleSave}
        />
      )}
      {ficha && (
        <FichaCliente
          cliente={ficha}
          cotizaciones={cotizaciones}
          onEdit={(c) => { setEditando(c); setFicha(null) }}
          onDelete={handleDelete}
          onClose={() => setFicha(null)}
          onNuevaCotizacion={handleNuevaCotizacion}
        />
      )}
      {cardMenu && (
        <CardMenu
          cliente={cardMenu}
          onClose={() => setCardMenu(null)}
          onEditar={() => { setEditando(cardMenu); setModal('edit'); setCardMenu(null) }}
          onEliminar={() => { if (confirm(`¿Eliminar a ${cardMenu.nombre} permanentemente?`)) { handleDelete(cardMenu.id); setCardMenu(null) } }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-birth-black tracking-wide">CLIENTES</h1>
          <p className="text-birth-gray-3 text-xs md:text-sm font-dm mt-1">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={() => setModal('nuevo')}
          className="flex items-center gap-2 bg-birth-black text-white px-3 md:px-5 py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
          <Plus size={16} /> <span className="hidden sm:inline">Nuevo</span> cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-birth-gray-3" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o empresa..."
          className="w-full pl-9 pr-4 py-2.5 border border-birth-gray-2 rounded text-sm font-dm focus:outline-none focus:border-birth-black bg-white" />
      </div>

      {/* Mobile cards */}
      {filtrados.length === 0 ? (
        <div className="md:hidden bg-white border border-birth-gray-2 rounded py-16 text-center">
          <p className="text-birth-gray-3 text-sm font-dm">{busqueda ? 'Sin resultados' : 'Aún no hay clientes.'}</p>
        </div>
      ) : (
        <div className="md:hidden space-y-3">
          {filtrados.map(c => {
            const nCot = cotizaciones.filter(ct => ct.clienteId === c.id).length
            const nombreCompleto = [c.nombre, c.apellido].filter(Boolean).join(' ')
            return (
              <div key={c.id} className="bg-white border border-birth-gray-2 rounded-xl overflow-hidden">
                {/* Info principal — clic abre ficha */}
                <button type="button" onClick={() => setFicha(c)}
                  className="w-full p-4 text-left active:bg-birth-gray transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-dm font-semibold text-birth-black truncate">{nombreCompleto}</p>
                      <p className="text-xs text-birth-gray-4 mt-0.5 truncate">{c.empresa || c.direccion || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-birth-gray text-birth-black px-2 py-0.5 rounded text-[11px] font-dm">
                        {nCot} cot.
                      </span>
                      {/* Botón 3 puntos */}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setCardMenu(c) }}
                        className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded active:bg-birth-gray">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                  {(c.telefono || c.correo) && (
                    <div className="mt-2 space-y-0.5">
                      {c.telefono && <p className="flex items-center gap-2 text-xs text-birth-gray-4 font-dm"><Phone size={11} className="text-birth-gray-3" />{c.telefono}</p>}
                      {c.correo && <p className="flex items-center gap-2 text-xs text-birth-gray-4 font-dm truncate"><Mail size={11} className="text-birth-gray-3 shrink-0" /><span className="truncate">{c.correo}</span></p>}
                    </div>
                  )}
                </button>

                {/* Botones de contacto rápido */}
                {(c.telefono || c.correo) && (
                  <div className={`border-t border-birth-gray-2 grid divide-x divide-birth-gray-2 ${
                    c.telefono && c.correo ? 'grid-cols-3' : 'grid-cols-2'
                  }`}>
                    {c.telefono && (
                      <a href={whatsappUrl(c.telefono)} target="_blank" rel="noopener noreferrer"
                        className="py-2.5 flex flex-col items-center gap-1 text-[#25D366] active:bg-birth-gray text-[10px] font-dm">
                        <WhatsAppIcon size={15} /><span>WhatsApp</span>
                      </a>
                    )}
                    {c.correo && (
                      <a href={`mailto:${c.correo}`}
                        className="py-2.5 flex flex-col items-center gap-1 text-birth-gray-4 active:bg-birth-gray text-[10px] font-dm">
                        <Mail size={15} /><span>Correo</span>
                      </a>
                    )}
                    {c.telefono && (
                      <a href={`tel:${c.telefono}`}
                        className="py-2.5 flex flex-col items-center gap-1 text-birth-gray-4 active:bg-birth-gray text-[10px] font-dm">
                        <Phone size={15} /><span>Llamar</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tabla desktop */}
      <div className="hidden md:block bg-white border border-birth-gray-2 rounded">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-birth-gray-3 text-sm font-dm">{busqueda ? 'Sin resultados' : 'Aún no hay clientes.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm font-dm">
            <thead>
              <tr className="border-b border-birth-gray-2">
                <th className="text-left px-5 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Nombre</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Empresa</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Dirección</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Teléfono</th>
                <th className="text-center px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Cot.</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const nCot = cotizaciones.filter(ct => ct.clienteId === c.id).length
                const nombreCompleto = [c.nombre, c.apellido].filter(Boolean).join(' ')
                return (
                  <tr key={c.id} className="border-b border-birth-gray-2 hover:bg-birth-gray cursor-pointer transition-colors" onClick={() => setFicha(c)}>
                    <td className="px-5 py-3 font-medium text-birth-black">{nombreCompleto}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{c.empresa || '—'}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{c.direccion || c.ciudad || '—'}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{c.telefono || '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block bg-birth-gray px-2 py-0.5 rounded text-xs font-medium">{nCot}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        {c.correo && (
                          <a href={`mailto:${c.correo}`} className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray" title="Correo">
                            <Mail size={14} />
                          </a>
                        )}
                        {c.telefono && (
                          <a href={whatsappUrl(c.telefono)} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-[#25D366] hover:opacity-70 rounded hover:bg-birth-gray" title="WhatsApp">
                            <WhatsAppIcon size={14} />
                          </a>
                        )}
                        <button onClick={() => { setEditando(c); setModal('edit') }} className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray" title="Modificar">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => { if (confirm('¿Eliminar?')) handleDelete(c.id) }} className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray" title="Eliminar">
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
