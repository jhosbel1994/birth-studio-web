import { useState, useEffect } from 'react'
import { getContratos, saveContrato, deleteContrato, getClientes, getCotizaciones } from '../utils/storage'
import { generarContratoLetras, generarContratoWeb } from '../utils/pdf'
import { clp, fechaCorta, hoy } from '../utils/formatters'
import { getClienteById } from '../utils/storage'
import { Plus, Download, Trash2, X, Building2, Globe } from 'lucide-react'

const EMPTY_LETRAS = {
  tipo: 'letras_corporeas',
  clienteId: '', clienteNombre: '',
  cotizacionId: '',
  fecha: hoy(),
  descripcionTrabajo: '',
  valorTotal: '',
  valorTexto: '',
  plazo: '',
}

const EMPTY_WEB = {
  tipo: 'desarrollo_web',
  clienteId: '', clienteNombre: '',
  cotizacionId: '',
  fecha: hoy(),
  descripcionProyecto: '',
  valorTotal: '',
  valorTexto: '',
  plazo: '',
}

function ModalContrato({ contrato, clientes, cotizaciones, onClose, onSave }) {
  const tipo = contrato.tipo
  const [form, setForm] = useState({ ...contrato })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleClienteChange = (id) => {
    const c = clientes.find(c => c.id === id)
    set('clienteId', id)
    set('clienteNombre', c?.nombre || '')
  }

  const handleCotChange = (id) => {
    set('cotizacionId', id)
    if (id) {
      const cot = cotizaciones.find(c => c.id === id)
      if (cot) {
        set('valorTotal', cot.total)
        if (!form.clienteId) handleClienteChange(cot.clienteId)
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  const isLetras = tipo === 'letras_corporeas'
  const cotsAceptadas = cotizaciones.filter(c => c.estado === 'aceptada')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded w-full max-w-xl shadow-xl max-h-[92vh] md:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-birth-gray-2 sticky top-0 bg-white rounded-t-2xl md:rounded-t">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {contrato.id ? 'EDITAR CONTRATO' : isLetras ? 'CONTRATO LETRAS CORPÓREAS' : 'CONTRATO DESARROLLO WEB'}
          </h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
          {/* Vincular cotización */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Vincular a cotización aceptada (opcional)</label>
            <select value={form.cotizacionId} onChange={e => handleCotChange(e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              <option value="">Sin vincular</option>
              {cotsAceptadas.map(c => <option key={c.id} value={c.id}>#{c.numero} — {c.clienteNombre} ({clp(c.total)})</option>)}
            </select>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cliente *</label>
            <select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)} required
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` — ${c.empresa}` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Fecha del contrato</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>

          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">
              {isLetras ? 'Descripción del trabajo' : 'Descripción del proyecto'}
            </label>
            <textarea
              value={isLetras ? form.descripcionTrabajo : form.descripcionProyecto}
              onChange={e => set(isLetras ? 'descripcionTrabajo' : 'descripcionProyecto', e.target.value)}
              rows={3}
              placeholder={isLetras
                ? 'Ej: instalación de letras corpóreas en acrílico 5mm, nombre BOUTIQUE, tamaño 80x40cm...'
                : 'Ej: sitio web corporativo con 5 páginas, formulario de contacto, responsive...'}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Valor total *</label>
              <input type="number" min="0" value={form.valorTotal} onChange={e => set('valorTotal', parseFloat(e.target.value) || '')} required
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Valor en palabras</label>
              <input value={form.valorTexto} onChange={e => set('valorTexto', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="ciento cincuenta mil" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Plazo de {isLetras ? 'ejecución' : 'desarrollo'}</label>
            <input value={form.plazo} onChange={e => set('plazo', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black"
              placeholder={isLetras ? '5 días hábiles' : '3 semanas hábiles'} />
          </div>

          <div className="flex gap-3 pt-2 border-t border-birth-gray-2 pb-safe">
            <button type="submit"
              className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
              {contrato.id ? 'Guardar cambios' : 'Crear contrato'}
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

export default function Contratos() {
  const [contratos, setContratos] = useState([])
  const [clientes, setClientes] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [modal, setModal] = useState(null)

  const cargar = async () => {
    const [c, cl, cot] = await Promise.all([getContratos(), getClientes(), getCotizaciones()])
    setContratos(c); setClientes(cl); setCotizaciones(cot)
  }

  useEffect(() => { cargar() }, [])

  const handleSave = async (data) => {
    await saveContrato(data)
    cargar()
    setModal(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contrato?')) return
    await deleteContrato(id)
    cargar()
  }

  const handlePDF = async (contrato) => {
    const cliente = await getClienteById(contrato.clienteId)
    if (contrato.tipo === 'letras_corporeas') await generarContratoLetras(contrato, cliente)
    else await generarContratoWeb(contrato, cliente)
  }

  const letras = contratos.filter(c => c.tipo === 'letras_corporeas').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const web = contratos.filter(c => c.tipo === 'desarrollo_web').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const TipoCard = ({ tipo, icono: Icono, titulo, descripcion, count, onClick }) => (
    <div className="bg-white border border-birth-gray-2 rounded p-4 md:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="p-3 bg-birth-gray rounded">
          <Icono size={22} className="text-birth-black" />
        </div>
        <div>
          <h3 className="font-barlow text-lg font-bold tracking-wide">{titulo}</h3>
          <p className="text-sm text-birth-gray-4 font-dm mt-0.5 max-w-xs">{descripcion}</p>
          <p className="text-xs text-birth-gray-3 font-dm mt-2">{count} contrato{count !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <button onClick={onClick}
        className="flex items-center justify-center gap-2 bg-birth-black text-white px-4 py-2.5 rounded text-sm font-dm hover:bg-birth-red transition-colors whitespace-nowrap">
        <Plus size={14} /> Nuevo
      </button>
    </div>
  )

  const ContratoRow = ({ contrato }) => {
    const cliente = clientes.find(c => c.id === contrato.clienteId)
    return (
      <tr className="border-b border-birth-gray-2 hover:bg-birth-gray">
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            {contrato.tipo === 'letras_corporeas' ? <Building2 size={14} className="text-birth-gray-3" /> : <Globe size={14} className="text-birth-gray-3" />}
            <span className="text-xs bg-birth-gray px-2 py-0.5 rounded font-dm">
              {contrato.tipo === 'letras_corporeas' ? 'Letras corpóreas' : 'Web'}
            </span>
          </div>
        </td>
        <td className="px-3 py-3 font-medium font-dm">{contrato.clienteNombre || '—'}</td>
        <td className="px-3 py-3 text-birth-gray-4 font-dm">{fechaCorta(contrato.fecha)}</td>
        <td className="px-3 py-3 text-right font-medium font-dm">{clp(contrato.valorTotal)}</td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => handlePDF(contrato)} title="Descargar PDF"
              className="p-1.5 text-birth-gray-3 hover:text-birth-black rounded hover:bg-birth-gray">
              <Download size={14} />
            </button>
            <button onClick={() => handleDelete(contrato.id)} title="Eliminar"
              className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      {modal && (
        <ModalContrato
          contrato={modal}
          clientes={clientes}
          cotizaciones={cotizaciones}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div className="mb-5 md:mb-8">
        <h1 className="font-barlow text-3xl md:text-4xl font-bold text-birth-black tracking-wide">CONTRATOS</h1>
        <p className="text-birth-gray-3 text-xs md:text-sm font-dm mt-1">Genera contratos para tus proyectos</p>
      </div>

      {/* Cards de tipo de contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
        <TipoCard
          tipo="letras_corporeas"
          icono={Building2}
          titulo="Letras Corpóreas"
          descripcion="Contrato de instalación de letras corpóreas y señalética"
          count={letras.length}
          onClick={() => setModal({ ...EMPTY_LETRAS })}
        />
        <TipoCard
          tipo="desarrollo_web"
          icono={Globe}
          titulo="Desarrollo Web"
          descripcion="Contrato de desarrollo y entrega de sitio web"
          count={web.length}
          onClick={() => setModal({ ...EMPTY_WEB })}
        />
      </div>

      {/* Lista de contratos */}
      {contratos.length > 0 && (
        <div className="bg-white border border-birth-gray-2 rounded">
          <div className="px-5 py-4 border-b border-birth-gray-2">
            <h2 className="font-barlow text-lg font-bold tracking-wide">HISTORIAL DE CONTRATOS</h2>
          </div>
          <div className="md:hidden divide-y divide-birth-gray-2">
            {[...letras, ...web].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(contrato => {
              const isLetras = contrato.tipo === 'letras_corporeas'
              return (
                <div key={contrato.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isLetras ? <Building2 size={14} className="text-birth-gray-3" /> : <Globe size={14} className="text-birth-gray-3" />}
                        <span className="text-[11px] bg-birth-gray px-2 py-0.5 rounded font-dm text-birth-gray-4">
                          {isLetras ? 'Letras corpóreas' : 'Web'}
                        </span>
                      </div>
                      <p className="text-sm font-dm font-semibold text-birth-black truncate">{contrato.clienteNombre || 'Sin cliente'}</p>
                      <p className="text-xs text-birth-gray-3 font-dm mt-0.5">{fechaCorta(contrato.fecha)}</p>
                    </div>
                    <p className="font-barlow text-lg font-bold text-birth-black shrink-0">{clp(contrato.valorTotal)}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => handlePDF(contrato)}
                      className="h-10 rounded border border-birth-gray-2 text-xs font-dm text-birth-black flex items-center justify-center gap-2 active:border-birth-black"
                    >
                      <Download size={14} /> Descargar PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(contrato.id)}
                      className="h-10 w-11 rounded border border-birth-gray-2 text-birth-red flex items-center justify-center active:border-birth-red"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-birth-gray-2">
                <th className="text-left px-5 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Tipo</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Cliente</th>
                <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Fecha</th>
                <th className="text-right px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Valor</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {[...letras, ...web].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(c => (
                <ContratoRow key={c.id} contrato={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contratos.length === 0 && (
        <div className="bg-white border border-birth-gray-2 rounded py-16 text-center">
          <p className="text-birth-gray-3 text-sm font-dm">Sin contratos aún. Crea uno desde los botones de arriba.</p>
        </div>
      )}
    </div>
  )
}
