import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCotizaciones, getGastos } from '../utils/storage'
import { clp, fechaCorta, ESTADOS } from '../utils/formatters'
import {
  TrendingUp, FileText, Clock, CheckCircle, XCircle, DollarSign,
  Calculator, Users, ScrollText, Wallet,
} from 'lucide-react'

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-white border border-birth-gray-2 p-4 rounded">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-birth-gray-4 font-dm uppercase tracking-wider mb-1">{label}</p>
          <p className={`font-barlow text-2xl md:text-3xl font-bold ${color || 'text-birth-black'}`}>{value}</p>
          {sub && <p className="text-[11px] text-birth-gray-3 mt-0.5 font-dm">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-1.5 bg-birth-gray rounded">
            <Icon size={16} className="text-birth-gray-3" />
          </div>
        )}
      </div>
    </div>
  )
}

function MobileQuickNav({ navigate }) {
  const items = [
    { to: '/cotizador', label: 'Cotizador', icon: Calculator, primary: true },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
    { to: '/contratos', label: 'Contratos', icon: ScrollText },
    { to: '/gastos', label: 'Finanzas', icon: Wallet },
  ]

  return (
    <div className="md:hidden grid grid-cols-2 gap-2 mb-5">
      {items.map(({ to, label, icon: Icon, primary }) => (
        <button
          key={to}
          type="button"
          onClick={() => navigate(to)}
          className={`h-12 rounded-md border flex items-center justify-center gap-2 text-sm font-dm font-medium ${
            primary
              ? 'col-span-2 bg-birth-red border-birth-red text-white'
              : 'bg-white border-birth-gray-2 text-birth-black active:border-birth-black'
          }`}
        >
          <Icon size={17} strokeWidth={2} />
          {label}
        </button>
      ))}
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

  const mes = new Date().getMonth()
  const año = new Date().getFullYear()
  const enMes = (d) => { const x = new Date(d); return x.getMonth() === mes && x.getFullYear() === año }

  const porAceptar = cotizaciones.filter(c => c.estado === 'por_aceptar').length
  const aceptadas = cotizaciones.filter(c => c.estado === 'aceptada').length
  const rechazadas = cotizaciones.filter(c => c.estado === 'rechazada').length

  const ingresosMes = cotizaciones
    .filter(c => c.estado === 'aceptada' && enMes(c.createdAt))
    .reduce((s, c) => s + (c.total || 0), 0)

  const gastosMes = gastos.filter(g => enMes(g.fecha)).reduce((s, g) => s + (g.monto || 0), 0)
  const gananciaNeta = ingresosMes - gastosMes

  const ultimas5 = [...cotizaciones]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const proximas = cotizaciones
    .filter(c => c.estado === 'aceptada' && c.fechaEntrega && new Date(c.fechaEntrega) >= new Date())
    .sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))
    .slice(0, 4)

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      <div className="mb-5 md:mb-8">
        <h1 className="font-barlow text-3xl md:text-4xl font-bold text-birth-black tracking-wide">DASHBOARD</h1>
        <p className="text-birth-gray-3 text-xs md:text-sm font-dm mt-1">Resumen — Birth Studio SpA</p>
      </div>

      <MobileQuickNav navigate={navigate} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 md:mb-8">
        <StatCard label="Total cotizaciones" value={cotizaciones.length} icon={FileText} />
        <StatCard label="Por aceptar" value={porAceptar} color="text-yellow-600" icon={Clock} />
        <StatCard label="Aceptadas" value={aceptadas} color="text-green-600" icon={CheckCircle} />
        <StatCard label="Rechazadas" value={rechazadas} color="text-birth-red" icon={XCircle} />
        <StatCard label="Ingresos mes" value={clp(ingresosMes)} color="text-green-700" sub="aceptadas" icon={TrendingUp} />
        <StatCard
          label="Ganancia neta"
          value={clp(gananciaNeta)}
          color={gananciaNeta >= 0 ? 'text-green-700' : 'text-birth-red'}
          sub={`Gastos: ${clp(gastosMes)}`}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Últimas cotizaciones */}
        <div className="lg:col-span-2 bg-white border border-birth-gray-2 rounded">
          <div className="flex items-center justify-between px-4 py-3 border-b border-birth-gray-2">
            <h2 className="font-barlow text-base md:text-lg font-bold tracking-wide">ÚLTIMAS COTIZACIONES</h2>
            <button onClick={() => navigate('/cotizaciones')} className="text-xs text-birth-red font-dm">Ver todas →</button>
          </div>
          {ultimas5.length === 0 ? (
            <p className="px-4 py-10 text-center text-birth-gray-3 text-sm font-dm">Sin cotizaciones</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-birth-gray-2">
                {ultimas5.map(c => {
                  const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                  return (
                    <div key={c.id} className="px-4 py-3 flex items-center justify-between" onClick={() => navigate('/cotizaciones')}>
                      <div>
                        <p className="font-medium text-sm font-dm text-birth-black">#{c.numero}</p>
                        <p className="text-xs text-birth-gray-4">{c.clienteNombre || '—'} · {fechaCorta(c.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm font-dm">{clp(c.total)}</p>
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded border ${est.color}`}>{est.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm font-dm">
                  <thead>
                    <tr className="border-b border-birth-gray-2">
                      <th className="text-left px-4 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Número</th>
                      <th className="text-left px-3 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Cliente</th>
                      <th className="text-right px-3 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-2.5 text-xs text-birth-gray-4 font-medium uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimas5.map(c => {
                      const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                      return (
                        <tr key={c.id} className="border-b border-birth-gray-2 hover:bg-birth-gray cursor-pointer" onClick={() => navigate('/cotizaciones')}>
                          <td className="px-4 py-3 font-medium text-birth-black">#{c.numero}</td>
                          <td className="px-3 py-3 text-birth-gray-4">{c.clienteNombre || '—'}</td>
                          <td className="px-3 py-3 text-right font-medium">{clp(c.total)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-xs rounded border ${est.color}`}>{est.label}</span>
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

        {/* Próximas entregas */}
        <div className="bg-white border border-birth-gray-2 rounded">
          <div className="px-4 py-3 border-b border-birth-gray-2">
            <h2 className="font-barlow text-base font-bold tracking-wide">PRÓXIMAS ENTREGAS</h2>
          </div>
          {proximas.length === 0 ? (
            <p className="px-4 py-10 text-center text-birth-gray-3 text-sm font-dm">Sin fechas programadas</p>
          ) : (
            <div className="divide-y divide-birth-gray-2">
              {proximas.map(c => {
                const dias = Math.ceil((new Date(c.fechaEntrega) - new Date()) / 86400000)
                return (
                  <div key={c.id} className="px-4 py-3">
                    <p className="font-medium text-sm font-dm text-birth-black">#{c.numero}</p>
                    <p className="text-xs text-birth-gray-4 mt-0.5">{c.clienteNombre || '—'}</p>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-birth-gray-3">{fechaCorta(c.fechaEntrega)}</p>
                      <span className={`text-xs font-medium ${dias <= 3 ? 'text-birth-red' : dias <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias}d`}
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
