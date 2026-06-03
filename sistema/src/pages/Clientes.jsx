import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClientes, saveCliente, deleteCliente, getCotizaciones } from '../utils/storage'
import { fechaCorta, clp, ESTADOS } from '../utils/formatters'
import { Plus, Search, Trash2, Edit2, FileText, Phone, Mail, X } from 'lucide-react'

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

function Modal({ cliente, onClose, onSave }) {
  const [form, setForm] = useState(cliente?.id ? { ...cliente } : { ...EMPTY })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t-2xl md:rounded-t">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {cliente?.id ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
          </h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.nombre.trim()) return; onSave(form) }} className="p-5 md:p-6 space-y-3">
          {/* Nombre + Apellido */}
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
          {/* Empresa + RUT */}
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
          {/* Dirección */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Dirección</label>
            <input value={form.direccion || ''} onChange={e => set('direccion', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="Av. O'Higgins 123, Talca" />
          </div>
          {/* Correo + Teléfono */}
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
          {/* Notas */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
          </div>
          <div className="flex gap-3 pt-2 pb-safe">
            <button type="submit"
              className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
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

function FichaCliente({ cliente, cotizaciones, onEdit, onDelete, onClose, onNuevaCotizacion }) {
  const historial = cotizaciones.filter(c => c.clienteId === cliente.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded w-full max-w-2xl max-h-[92vh] md:max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t-2xl md:rounded-t">
          <div>
            <h2 className="font-barlow text-xl font-bold tracking-wide">{nombreCompleto}</h2>
            {cliente.empresa && <p className="text-sm text-birth-gray-4 font-dm">{cliente.empresa}</p>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(cliente)} className="p-2 text-birth-gray-3 hover:text-birth-black" title="Editar"><Edit2 size={16} /></button>
            <button onClick={() => { if (confirm('¿Eliminar este cliente?')) onDelete(cliente.id) }} className="p-2 text-birth-gray-3 hover:text-birth-red" title="Eliminar"><Trash2 size={16} /></button>
            <button onClick={onClose} className="p-2 text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-5 pb-safe">
          {/* Botones de contacto */}
          {(cliente.correo || cliente.telefono) && (
            <div className="flex gap-2 flex-wrap">
              {cliente.correo && (
                <a href={`mailto:${cliente.correo}`}
                  className="flex items-center gap-2 px-4 py-2 rounded border border-birth-gray-2 text-sm font-dm text-birth-black hover:border-birth-black hover:bg-birth-gray transition-colors">
                  <Mail size={14} /> Correo
                </a>
              )}
              {cliente.telefono && (
                <a href={`tel:${cliente.telefono}`}
                  className="flex items-center gap-2 px-4 py-2 rounded border border-birth-gray-2 text-sm font-dm text-birth-black hover:border-birth-black hover:bg-birth-gray transition-colors">
                  <Phone size={14} /> Llamar
                </a>
              )}
              {cliente.telefono && (
                <a href={whatsappUrl(cliente.telefono)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded border border-[#25D366] text-[#25D366] text-sm font-dm hover:bg-[#25D366]/10 transition-colors">
                  <WhatsAppIcon size={14} /> WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm font-dm">
            {cliente.rut && <div><span className="text-birth-gray-4 text-xs uppercase tracking-wider block">RUT empresa</span><p className="mt-0.5">{cliente.rut}</p></div>}
            {(cliente.direccion || cliente.ciudad) && <div><span className="text-birth-gray-4 text-xs uppercase tracking-wider block">Dirección</span><p className="mt-0.5">{cliente.direccion || cliente.ciudad}</p></div>}
            {cliente.correo && <div className="col-span-2 sm:col-span-1"><span className="text-birth-gray-4 text-xs uppercase tracking-wider block">Correo</span><p className="mt-0.5 truncate">{cliente.correo}</p></div>}
            {cliente.telefono && <div><span className="text-birth-gray-4 text-xs uppercase tracking-wider block">Teléfono</span><p className="mt-0.5">{cliente.telefono}</p></div>}
            {cliente.notas && <div className="col-span-2"><span className="text-birth-gray-4 text-xs uppercase tracking-wider block">Notas</span><p className="mt-0.5 text-birth-gray-4">{cliente.notas}</p></div>}
          </div>

          {/* Historial */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-barlow font-bold text-base tracking-wide">HISTORIAL DE COTIZACIONES</h3>
              <button onClick={() => onNuevaCotizacion(cliente)}
                className="flex items-center gap-1 text-xs bg-birth-black text-white px-3 py-1.5 rounded hover:bg-birth-red transition-colors font-dm">
                <Plus size={12} /> Nueva cotización
              </button>
            </div>
            {historial.length === 0 ? (
              <p className="text-sm text-birth-gray-3 font-dm">Sin cotizaciones</p>
            ) : (
              <div className="space-y-2">
                {historial.map(c => {
                  const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-birth-gray rounded">
                      <div className="flex items-center gap-3">
                        <FileText size={14} className="text-birth-gray-3" />
                        <div>
                          <p className="text-sm font-medium font-dm">#{c.numero}</p>
                          <p className="text-xs text-birth-gray-3">{fechaCorta(c.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium font-dm">{clp(c.total)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${est.color}`}>{est.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [ficha, setFicha] = useState(null)
  const [editando, setEditando] = useState(null)

  const cargar = async () => {
    const [c, cot] = await Promise.all([getClientes(), getCotizaciones()])
    setClientes(c); setCotizaciones(cot)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.empresa?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleSave = async (form) => {
    await saveCliente(form)
    cargar()
    setModal(null)
    setEditando(null)
    if (ficha?.id === form.id) setFicha(form)
  }

  const handleDelete = async (id) => {
    await deleteCliente(id)
    cargar()
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
      <div className="relative mb-5 md:mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-birth-gray-3" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o empresa..."
          className="w-full pl-9 pr-4 py-2.5 border border-birth-gray-2 rounded text-sm font-dm focus:outline-none focus:border-birth-black bg-white"
        />
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
                {/* Info principal */}
                <button type="button" onClick={() => setFicha(c)}
                  className="w-full p-4 text-left active:bg-birth-gray transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-dm font-semibold text-birth-black truncate">{nombreCompleto}</p>
                      <p className="text-xs text-birth-gray-4 mt-0.5 truncate">{c.empresa || c.direccion || '—'}</p>
                    </div>
                    <span className="shrink-0 bg-birth-gray text-birth-black px-2 py-1 rounded text-[11px] font-dm">
                      {nCot} cot.
                    </span>
                  </div>
                  {(c.telefono || c.correo) && (
                    <div className="mt-2 space-y-0.5">
                      {c.telefono && <p className="flex items-center gap-2 text-xs text-birth-gray-4 font-dm"><Phone size={11} className="text-birth-gray-3" />{c.telefono}</p>}
                      {c.correo && <p className="flex items-center gap-2 text-xs text-birth-gray-4 font-dm truncate"><Mail size={11} className="text-birth-gray-3 shrink-0" /><span className="truncate">{c.correo}</span></p>}
                    </div>
                  )}
                </button>

                {/* Botones de acción */}
                <div className="border-t border-birth-gray-2 grid grid-cols-4 divide-x divide-birth-gray-2">
                  <button type="button" onClick={() => { setEditando(c); setModal('edit') }}
                    className="py-2.5 flex flex-col items-center gap-1 text-birth-gray-4 active:bg-birth-gray text-[10px] font-dm">
                    <Edit2 size={15} />
                    <span>Editar</span>
                  </button>
                  <a href={c.correo ? `mailto:${c.correo}` : undefined}
                    className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-dm ${c.correo ? 'text-birth-gray-4 active:bg-birth-gray' : 'text-birth-gray-2 pointer-events-none'}`}>
                    <Mail size={15} />
                    <span>Correo</span>
                  </a>
                  <a href={c.telefono ? `tel:${c.telefono}` : undefined}
                    className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-dm ${c.telefono ? 'text-birth-gray-4 active:bg-birth-gray' : 'text-birth-gray-2 pointer-events-none'}`}>
                    <Phone size={15} />
                    <span>Llamar</span>
                  </a>
                  <a href={c.telefono ? whatsappUrl(c.telefono) : undefined} target="_blank" rel="noopener noreferrer"
                    className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-dm ${c.telefono ? 'text-[#25D366] active:bg-birth-gray' : 'text-birth-gray-2 pointer-events-none'}`}>
                    <WhatsAppIcon size={15} />
                    <span>WhatsApp</span>
                  </a>
                </div>
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
                          <a href={`mailto:${c.correo}`} className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray" title="Enviar correo">
                            <Mail size={14} />
                          </a>
                        )}
                        {c.telefono && (
                          <a href={whatsappUrl(c.telefono)} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-[#25D366] hover:opacity-70 rounded hover:bg-birth-gray" title="WhatsApp">
                            <WhatsAppIcon size={14} />
                          </a>
                        )}
                        <button onClick={() => { setEditando(c); setModal('edit') }} className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray" title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => { if (confirm('¿Eliminar cliente?')) handleDelete(c.id) }} className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray" title="Eliminar">
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
