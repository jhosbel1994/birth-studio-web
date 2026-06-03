import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClientes, saveCliente, deleteCliente, getCotizaciones } from '../utils/storage'
import { fechaCorta, clp, ESTADOS } from '../utils/formatters'
import { Plus, Search, Trash2, Edit2, FileText, Phone, Mail, X, ChevronDown } from 'lucide-react'

const EMPTY = { nombre: '', empresa: '', rut: '', ciudad: '', correo: '', telefono: '', notas: '' }

function Modal({ cliente, onClose, onSave }) {
  const [form, setForm] = useState(cliente?.id ? { ...cliente } : { ...EMPTY })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-birth-gray-2">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {cliente?.id ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
          </h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Empresa</label>
              <input value={form.empresa} onChange={e => set('empresa', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">RUT</label>
              <input value={form.rut} onChange={e => set('rut', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="12.345.678-9" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Ciudad</label>
              <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="Talca" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="flex gap-3 pt-2">
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-birth-gray-2 sticky top-0 bg-white">
          <div>
            <h2 className="font-barlow text-xl font-bold tracking-wide">{cliente.nombre}</h2>
            {cliente.empresa && <p className="text-sm text-birth-gray-4 font-dm">{cliente.empresa}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(cliente)} className="p-2 text-birth-gray-3 hover:text-birth-black"><Edit2 size={16} /></button>
            <button onClick={() => { if (confirm('¿Eliminar este cliente?')) onDelete(cliente.id) }} className="p-2 text-birth-gray-3 hover:text-birth-red"><Trash2 size={16} /></button>
            <button onClick={onClose} className="p-2 text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm font-dm">
            {cliente.rut && <div><span className="text-birth-gray-4 text-xs uppercase tracking-wider">RUT</span><p className="mt-0.5">{cliente.rut}</p></div>}
            {cliente.ciudad && <div><span className="text-birth-gray-4 text-xs uppercase tracking-wider">Ciudad</span><p className="mt-0.5">{cliente.ciudad}</p></div>}
            {cliente.correo && (
              <div><span className="text-birth-gray-4 text-xs uppercase tracking-wider">Correo</span>
                <p className="mt-0.5 flex items-center gap-1"><Mail size={12} className="text-birth-gray-3" />{cliente.correo}</p></div>
            )}
            {cliente.telefono && (
              <div><span className="text-birth-gray-4 text-xs uppercase tracking-wider">Teléfono</span>
                <p className="mt-0.5 flex items-center gap-1"><Phone size={12} className="text-birth-gray-3" />{cliente.telefono}</p></div>
            )}
            {cliente.notas && (
              <div className="col-span-2"><span className="text-birth-gray-4 text-xs uppercase tracking-wider">Notas</span><p className="mt-0.5 text-birth-gray-4">{cliente.notas}</p></div>
            )}
          </div>

          {/* Historial cotizaciones */}
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
  const [modal, setModal] = useState(null) // null | 'nuevo' | cliente_obj
  const [ficha, setFicha] = useState(null)
  const [editando, setEditando] = useState(null)

  const cargar = () => {
    setClientes(getClientes())
    setCotizaciones(getCotizaciones())
  }

  useEffect(() => { cargar() }, [])

  const filtrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.empresa?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleSave = (form) => {
    saveCliente(form)
    cargar()
    setModal(null)
    setEditando(null)
    if (ficha?.id === form.id) setFicha(form)
  }

  const handleDelete = (id) => {
    deleteCliente(id)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-barlow text-4xl font-bold text-birth-black tracking-wide">CLIENTES</h1>
          <p className="text-birth-gray-3 text-sm font-dm mt-1">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={() => setModal('nuevo')}
          className="flex items-center gap-2 bg-birth-black text-white px-5 py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-birth-gray-3" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o empresa..."
          className="w-full pl-9 pr-4 py-2.5 border border-birth-gray-2 rounded text-sm font-dm focus:outline-none focus:border-birth-black bg-white"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white border border-birth-gray-2 rounded">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-birth-gray-3 text-sm font-dm">
              {busqueda ? 'Sin resultados' : 'Aún no hay clientes. Crea el primero.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm font-dm">
            <thead>
              <tr className="border-b border-birth-gray-2">
                <th className="text-left px-5 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Nombre</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Empresa</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Ciudad</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Teléfono</th>
                <th className="text-center px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Cotizaciones</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const nCot = cotizaciones.filter(ct => ct.clienteId === c.id).length
                return (
                  <tr key={c.id}
                    className="border-b border-birth-gray-2 hover:bg-birth-gray cursor-pointer transition-colors"
                    onClick={() => setFicha(c)}>
                    <td className="px-5 py-3 font-medium text-birth-black">{c.nombre}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{c.empresa || '—'}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{c.ciudad || '—'}</td>
                    <td className="px-3 py-3 text-birth-gray-4">{c.telefono || '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block bg-birth-gray px-2 py-0.5 rounded text-xs font-medium">{nCot}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditando(c); setModal('edit') }} className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray"><Edit2 size={14} /></button>
                        <button onClick={() => { if (confirm('¿Eliminar cliente?')) handleDelete(c.id) }} className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray"><Trash2 size={14} /></button>
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
