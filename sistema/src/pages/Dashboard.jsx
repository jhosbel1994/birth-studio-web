import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCotizaciones } from '../utils/storage'
import { getGastos } from '../utils/storage'
import { clp, fechaCorta, ESTADOS } from '../utils/formatters'
import { TrendingUp, FileText, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react'

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-white border border-birth-gray-2 p-5 rounded">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-birth-gray-4 font-dm uppercase tracking-wider mb-1">{label}</p>
          <p className={`font-barlow text-3xl font-bold ${color || 'text-birth-black'}`}>{value}</p>
          {sub && <p className="text-xs text-birth-gray-3 mt-1 font-dm">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-birth-gray rounded">
            <Icon size={18} className="text-birth-gray-3" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [cotizaciones, setCotizaciones] = useState([])
  const [gastos, setGastos] = useState([])

  useEffect(() => {
    setCotizaciones(getCotizaciones())
    setGastos(getGastos())
  }, [])

  const mesActual = new Date().getMonth()
  const añoActual = new Date().getFullYear()

  const enMes = (dateStr) => {
    const d = new Date(dateStr)
    return d.getMonth() === mesActual && d.getFullYear() === añoActual
  }

  const porAceptar = cotizaciones.filter(c => c.estado === 'por_aceptar').length
  const aceptadas = cotizaciones.filter(c => c.estado === 'aceptada').length
  const rechazadas = cotizaciones.filter(c => c.estado === 'rechazada').length
  const total = cotizaciones.length

  const ingresosMes = cotizaciones
    .filter(c => c.estado === 'aceptada' && enMes(c.createdAt))
    .reduce((s, c) => s + (c.total || 0), 0)

  const gastosMes = gastos
    .filter(g => enMes(g.fecha))
    .reduce((s, g) => s + (g.monto || 0), 0)

  const gananciaNeta = ingresosMes - gastosMes

  const ultimas5 = [...cotizaciones]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const proximas = cotizaciones
    .filter(c => c.estado === 'aceptada' && c.fechaEntrega && new Date(c.fechaEntrega) >= new Date())
    .sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))
    .slice(0, 5)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-barlow text-4xl font-bold text-birth-black tracking-wide">DASHBOARD</h1>
        <p className="text-birth-gray-3 text-sm font-dm mt-1">Resumen de actividad — Birth Studio SpA</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total cotizaciones" value={total} icon={FileText} />
        <StatCard label="Por aceptar" value={porAceptar} color="text-yellow-600" icon={Clock} />
        <StatCard label="Aceptadas" value={aceptadas} color="text-green-600" icon={CheckCircle} />
        <StatCard label="Rechazadas" value={rechazadas} color="text-birth-red" icon={XCircle} />
        <StatCard
          label="Ingresos del mes"
          value={clp(ingresosMes)}
          color="text-green-700"
          sub="cotizaciones aceptadas"
          icon={TrendingUp}
        />
        <StatCard
          label="Ganancia neta"
          value={clp(gananciaNeta)}
          color={gananciaNeta >= 0 ? 'text-green-700' : 'text-birth-red'}
          sub={`Gastos: ${clp(gastosMes)}`}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas cotizaciones */}
        <div className="lg:col-span-2 bg-white border border-birth-gray-2 rounded">
          <div className="flex items-center justify-between px-5 py-4 border-b border-birth-gray-2">
            <h2 className="font-barlow text-lg font-bold text-birth-black tracking-wide">ÚLTIMAS COTIZACIONES</h2>
            <button
              onClick={() => navigate('/cotizaciones')}
              className="text-xs text-birth-red hover:underline font-dm"
            >
              Ver todas →
            </button>
          </div>
          {ultimas5.length === 0 ? (
            <div className="px-5 py-10 text-center text-birth-gray-3 text-sm font-dm">
              Sin cotizaciones aún
            </div>
          ) : (
            <table className="w-full text-sm font-dm">
              <thead>
                <tr className="border-b border-birth-gray-2">
                  <th className="text-left px-5 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Número</th>
                  <th className="text-left px-3 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Cliente</th>
                  <th className="text-right px-3 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Total</th>
                  <th className="text-center px-5 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimas5.map((c) => {
                  const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                  return (
                    <tr key={c.id} className="border-b border-birth-gray-2 hover:bg-birth-gray cursor-pointer" onClick={() => navigate('/cotizaciones')}>
                      <td className="px-5 py-3 font-medium text-birth-black">#{c.numero}</td>
                      <td className="px-3 py-3 text-birth-gray-4">{c.clienteNombre || '—'}</td>
                      <td className="px-3 py-3 text-right font-medium">{clp(c.total)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${est.color}`}>
                          {est.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Próximas entregas */}
        <div className="bg-white border border-birth-gray-2 rounded">
          <div className="px-5 py-4 border-b border-birth-gray-2">
            <h2 className="font-barlow text-lg font-bold text-birth-black tracking-wide">PRÓXIMAS ENTREGAS</h2>
          </div>
          {proximas.length === 0 ? (
            <div className="px-5 py-10 text-center text-birth-gray-3 text-sm font-dm">
              Sin fechas programadas
            </div>
          ) : (
            <div className="divide-y divide-birth-gray-2">
              {proximas.map((c) => {
                const dias = Math.ceil((new Date(c.fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={c.id} className="px-5 py-3">
                    <p className="font-medium text-sm text-birth-black font-dm">#{c.numero}</p>
                    <p className="text-xs text-birth-gray-4 mt-0.5">{c.clienteNombre || '—'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-birth-gray-3">{fechaCorta(c.fechaEntrega)}</p>
                      <span className={`text-xs font-medium ${dias <= 3 ? 'text-birth-red' : dias <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`}
                      </span>
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
