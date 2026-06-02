import { useState, useEffect } from 'react'
import { getGastos, saveGasto, deleteGasto, getPagos, savePago, deletePago, getCotizaciones } from '../utils/storage'
import { clp, fechaCorta, hoy, CATEGORIAS_GASTO } from '../utils/formatters'
import { Plus, Trash2, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

function ModalGasto({ gasto, onClose, onSave }) {
  const [form, setForm] = useState(gasto?.id ? { ...gasto } : {
    descripcion: '', monto: '', fecha: hoy(), categoria: 'Materiales', notas: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-birth-gray-2">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {gasto?.id ? 'EDITAR GASTO' : 'NUEVO GASTO'}
          </h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.descripcion || !form.monto) return; onSave(form) }} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Descripción *</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} required
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Monto *</label>
              <input type="number" min="0" value={form.monto} onChange={e => set('monto', parseFloat(e.target.value) || '')} required
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Categoría</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
              {gasto?.id ? 'Guardar cambios' : 'Registrar gasto'}
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

function ModalPago({ cotizaciones, onClose, onSave }) {
  const [form, setForm] = useState({ cotizacionId: '', monto: '', fecha: hoy(), tipo: 'anticipo', notas: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const cots = cotizaciones.filter(c => c.estado === 'aceptada')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-birth-gray-2">
          <h2 className="font-barlow text-xl font-bold tracking-wide">REGISTRAR PAGO</h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.monto) return; onSave(form) }} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Cotización (opcional)</label>
            <select value={form.cotizacionId} onChange={e => set('cotizacionId', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              <option value="">Sin vincular</option>
              {cots.map(c => <option key={c.id} value={c.id}>#{c.numero} — {c.clienteNombre} ({clp(c.total)})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Monto *</label>
              <input type="number" min="0" value={form.monto} onChange={e => set('monto', parseFloat(e.target.value) || '')} required
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black bg-white">
              <option value="anticipo">Anticipo</option>
              <option value="saldo">Saldo</option>
              <option value="total">Pago total</option>
              <option value="otro">Otro ingreso</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Notas</label>
            <input value={form.notas} onChange={e => set('notas', e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
              Registrar ingreso
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

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [pagos, setPagos] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [tab, setTab] = useState('gastos')
  const [modalGasto, setModalGasto] = useState(null)
  const [modalPago, setModalPago] = useState(false)
  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const cargar = () => {
    setGastos(getGastos())
    setPagos(getPagos())
    setCotizaciones(getCotizaciones())
  }

  useEffect(() => { cargar() }, [])

  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesFiltro))
  const pagosMes = pagos.filter(p => p.fecha?.startsWith(mesFiltro))

  const totalGastos = gastosMes.reduce((s, g) => s + (g.monto || 0), 0)
  const totalIngresos = pagosMes.reduce((s, p) => s + (p.monto || 0), 0)
  const ganancia = totalIngresos - totalGastos

  // Gastos por categoría
  const porCategoria = CATEGORIAS_GASTO.map(cat => ({
    cat,
    total: gastosMes.filter(g => g.categoria === cat).reduce((s, g) => s + (g.monto || 0), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const meses = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="p-8">
      {modalGasto !== null && (
        <ModalGasto
          gasto={modalGasto?.id ? modalGasto : null}
          onClose={() => setModalGasto(null)}
          onSave={(data) => { saveGasto(data); cargar(); setModalGasto(null) }}
        />
      )}
      {modalPago && (
        <ModalPago
          cotizaciones={cotizaciones}
          onClose={() => setModalPago(false)}
          onSave={(data) => { savePago(data); cargar(); setModalPago(false) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-barlow text-4xl font-bold text-birth-black tracking-wide">GASTOS & FINANZAS</h1>
          <p className="text-birth-gray-3 text-sm font-dm mt-1">Seguimiento de ingresos y gastos</p>
        </div>
        <div className="flex gap-2">
          <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
            className="border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm bg-white focus:outline-none focus:border-birth-black">
            {meses.map(m => {
              const [y, mo] = m.split('-')
              const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
              return <option key={m} value={m}>{label}</option>
            })}
          </select>
        </div>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-birth-gray-2 rounded p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-500" />
            <p className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Ingresos</p>
          </div>
          <p className="font-barlow text-3xl font-bold text-green-700">{clp(totalIngresos)}</p>
        </div>
        <div className="bg-white border border-birth-gray-2 rounded p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-birth-red" />
            <p className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Gastos</p>
          </div>
          <p className="font-barlow text-3xl font-bold text-birth-red">{clp(totalGastos)}</p>
        </div>
        <div className="bg-white border border-birth-gray-2 rounded p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className={ganancia >= 0 ? 'text-green-500' : 'text-birth-red'} />
            <p className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider">Ganancia neta</p>
          </div>
          <p className={`font-barlow text-3xl font-bold ${ganancia >= 0 ? 'text-green-700' : 'text-birth-red'}`}>{clp(ganancia)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla principal */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              <button onClick={() => setTab('gastos')}
                className={`px-4 py-2 rounded text-sm font-dm border transition-colors ${tab === 'gastos' ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                Gastos ({gastosMes.length})
              </button>
              <button onClick={() => setTab('ingresos')}
                className={`px-4 py-2 rounded text-sm font-dm border transition-colors ${tab === 'ingresos' ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                Ingresos ({pagosMes.length})
              </button>
            </div>
            <button
              onClick={() => tab === 'gastos' ? setModalGasto({}) : setModalPago(true)}
              className="flex items-center gap-2 bg-birth-black text-white px-4 py-2 rounded text-sm font-dm hover:bg-birth-red transition-colors">
              <Plus size={14} /> {tab === 'gastos' ? 'Nuevo gasto' : 'Nuevo ingreso'}
            </button>
          </div>

          <div className="bg-white border border-birth-gray-2 rounded">
            {tab === 'gastos' ? (
              gastosMes.length === 0 ? (
                <div className="py-16 text-center text-birth-gray-3 text-sm font-dm">Sin gastos este mes</div>
              ) : (
                <table className="w-full text-sm font-dm">
                  <thead>
                    <tr className="border-b border-birth-gray-2">
                      <th className="text-left px-5 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Descripción</th>
                      <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Categoría</th>
                      <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Fecha</th>
                      <th className="text-right px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Monto</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...gastosMes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(g => (
                      <tr key={g.id} className="border-b border-birth-gray-2 hover:bg-birth-gray">
                        <td className="px-5 py-3 font-medium">{g.descripcion}</td>
                        <td className="px-3 py-3">
                          <span className="bg-birth-gray px-2 py-0.5 rounded text-xs">{g.categoria}</span>
                        </td>
                        <td className="px-3 py-3 text-birth-gray-4">{fechaCorta(g.fecha)}</td>
                        <td className="px-3 py-3 text-right font-medium text-birth-red">{clp(g.monto)}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => { if (confirm('¿Eliminar?')) { deleteGasto(g.id); cargar() } }}
                            className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              pagosMes.length === 0 ? (
                <div className="py-16 text-center text-birth-gray-3 text-sm font-dm">Sin ingresos este mes</div>
              ) : (
                <table className="w-full text-sm font-dm">
                  <thead>
                    <tr className="border-b border-birth-gray-2">
                      <th className="text-left px-5 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Notas</th>
                      <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Cotización</th>
                      <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Fecha</th>
                      <th className="text-right px-3 py-3 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Monto</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...pagosMes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(p => {
                      const cot = cotizaciones.find(c => c.id === p.cotizacionId)
                      return (
                        <tr key={p.id} className="border-b border-birth-gray-2 hover:bg-birth-gray">
                          <td className="px-5 py-3 font-medium">{p.notas || '—'}</td>
                          <td className="px-3 py-3 text-birth-gray-4">{cot ? `#${cot.numero}` : '—'}</td>
                          <td className="px-3 py-3">
                            <span className="bg-birth-gray px-2 py-0.5 rounded text-xs capitalize">{p.tipo}</span>
                          </td>
                          <td className="px-3 py-3 text-birth-gray-4">{fechaCorta(p.fecha)}</td>
                          <td className="px-3 py-3 text-right font-medium text-green-700">{clp(p.monto)}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => { if (confirm('¿Eliminar?')) { deletePago(p.id); cargar() } }}
                              className="p-1.5 text-birth-gray-3 hover:text-birth-red rounded hover:bg-birth-gray">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="bg-white border border-birth-gray-2 rounded">
          <div className="px-5 py-4 border-b border-birth-gray-2">
            <h3 className="font-barlow font-bold text-base tracking-wide">GASTOS POR CATEGORÍA</h3>
          </div>
          {porCategoria.length === 0 ? (
            <div className="py-10 text-center text-birth-gray-3 text-sm font-dm">Sin datos</div>
          ) : (
            <div className="p-4 space-y-3">
              {porCategoria.map(({ cat, total }) => {
                const pct = totalGastos > 0 ? (total / totalGastos) * 100 : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm font-dm mb-1">
                      <span className="text-birth-gray-4">{cat}</span>
                      <span className="font-medium">{clp(total)}</span>
                    </div>
                    <div className="h-1.5 bg-birth-gray-2 rounded-full overflow-hidden">
                      <div className="h-full bg-birth-black rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
