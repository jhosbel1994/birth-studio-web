import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeCotizaciones, subscribeGastos, subscribePagos, syncPublicStats } from '../utils/storage'
import { clp, fechaCorta, ESTADOS } from '../utils/formatters'
import {
  TrendingUp, FileText, Clock, CheckCircle, XCircle, DollarSign,
  Calculator, Users, ScrollText, Wallet,
} from 'lucide-react'

function StatCard({ label, value, sub, color, blob, icon: Icon }) {
  return (
    <div className="glass-panel rounded-widget p-5 md:p-6 flex flex-col justify-between h-32 md:h-40 relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl transition-colors ${blob || 'bg-primary/5 group-hover:bg-primary/10'}`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] text-on-surface-variant font-dm uppercase tracking-wider mb-1">{label}</p>
          <p className={`font-barlow text-2xl md:text-3xl font-bold ${color || 'text-on-surface'}`}>{value}</p>
        </div>
        {Icon && <Icon size={16} className="text-on-surface-variant" />}
      </div>
      {sub && <p className="relative z-10 text-[11px] text-on-surface-variant/80 font-dm">{sub}</p>}
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
          className={`h-12 rounded-full border flex items-center justify-center gap-2 text-sm font-dm font-medium ${
            primary
              ? 'col-span-2 bg-primary border-primary text-on-primary shadow-lg shadow-primary/20'
              : 'glass-panel border-white/50 text-on-surface active:border-primary'
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
  const [pagos, setPagos] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const u1 = subscribeCotizaciones((data) => { setCotizaciones(data); setLoaded(true) })
    const u2 = subscribeGastos(setGastos)
    const u3 = subscribePagos(setPagos)
    return () => { u1(); u2(); u3() }
  }, [])

  const mes = new Date().getMonth()
  const año = new Date().getFullYear()
  const enMes = (d) => { const x = new Date(d); return x.getMonth() === mes && x.getFullYear() === año }

  const porAceptar = cotizaciones.filter(c => c.estado === 'por_aceptar').length
  const aceptadas = cotizaciones.filter(c => c.estado === 'aceptada').length
  const rechazadas = cotizaciones.filter(c => c.estado === 'rechazada').length

  // Sincroniza el contador público que lee bspublicidad.cl ("+180 Proyectos
  // realizados" = 180 histórico + esta cifra). Se omite hasta que la
  // suscripción trae datos reales, para no pisar el contador con un 0
  // transitorio del primer render.
  useEffect(() => {
    if (loaded) syncPublicStats(aceptadas).catch(() => {})
  }, [loaded, aceptadas])

  // Ingresos = pagos/abonos realmente recibidos este mes (misma base que la
  // página Gastos & Finanzas, para que ambas cifras coincidan).
  const ingresosMes = pagos.filter(p => enMes(p.fecha)).reduce((s, p) => s + (p.monto || 0), 0)
  const gastosMes = gastos.filter(g => enMes(g.fecha)).reduce((s, g) => s + (g.monto || 0), 0)
  const gananciaNeta = ingresosMes - gastosMes

  // Pipeline: total comprometido en cotizaciones aceptadas este mes.
  const aceptadoMes = cotizaciones
    .filter(c => c.estado === 'aceptada' && enMes(c.createdAt))
    .reduce((s, c) => s + (c.total || 0), 0)

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
        <h1 className="font-barlow text-3xl md:text-4xl font-bold text-on-surface tracking-wide">DASHBOARD</h1>
        <p className="text-on-surface-variant text-xs md:text-sm font-dm mt-1">Resumen — Birth Studio SpA</p>
      </div>

      <MobileQuickNav navigate={navigate} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-5 md:mb-8">
        <StatCard label="Total cotizaciones" value={cotizaciones.length} icon={FileText} blob="bg-primary/5 group-hover:bg-primary/10" />
        <StatCard label="Por aceptar" value={porAceptar} color="text-yellow-600" icon={Clock} blob="bg-yellow-400/10 group-hover:bg-yellow-400/20" />
        <StatCard label="Aceptadas" value={aceptadas} color="text-green-600" sub={`Aceptado mes: ${clp(aceptadoMes)}`} icon={CheckCircle} blob="bg-green-400/10 group-hover:bg-green-400/20" />
        <StatCard label="Rechazadas" value={rechazadas} color="text-primary" icon={XCircle} blob="bg-primary/5 group-hover:bg-primary/10" />
        <StatCard label="Ingresos mes" value={clp(ingresosMes)} color="text-green-700" sub="pagos recibidos" icon={TrendingUp} blob="bg-secondary/5 group-hover:bg-secondary/10" />
        <StatCard
          label="Ganancia neta"
          value={clp(gananciaNeta)}
          color={gananciaNeta >= 0 ? 'text-green-700' : 'text-primary'}
          sub={`Gastos: ${clp(gastosMes)}`}
          icon={DollarSign}
          blob="bg-tertiary/5 group-hover:bg-tertiary/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Últimas cotizaciones */}
        <div className="lg:col-span-2 glass-panel rounded-widget overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-barlow text-base md:text-lg font-bold tracking-wide">ÚLTIMAS COTIZACIONES</h2>
            <button onClick={() => navigate('/cotizaciones')} className="text-xs text-primary font-dm hover:underline">Ver todas →</button>
          </div>
          {ultimas5.length === 0 ? (
            <p className="px-6 py-10 text-center text-on-surface-variant text-sm font-dm">Sin cotizaciones</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-white/40 px-2 pb-2">
                {ultimas5.map(c => {
                  const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                  return (
                    <div key={c.id} className="px-4 py-3 flex items-center justify-between rounded-2xl" onClick={() => navigate('/cotizaciones')}>
                      <div>
                        <p className="font-medium text-sm font-dm text-on-surface">#{c.numero}</p>
                        <p className="text-xs text-on-surface-variant">{c.clienteNombre || '—'} · {fechaCorta(c.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm font-dm">{clp(c.total)}</p>
                        <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full border ${est.color}`}>{est.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block px-2 pb-2">
                <table className="w-full text-sm font-dm">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Número</th>
                      <th className="text-left px-3 py-2.5 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Cliente</th>
                      <th className="text-right px-3 py-2.5 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-2.5 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimas5.map(c => {
                      const est = ESTADOS[c.estado] || ESTADOS.por_aceptar
                      return (
                        <tr key={c.id} className="hover:bg-white/50 cursor-pointer transition-colors rounded-2xl" onClick={() => navigate('/cotizaciones')}>
                          <td className="px-4 py-3 font-medium text-on-surface rounded-l-2xl">#{c.numero}</td>
                          <td className="px-3 py-3 text-on-surface-variant">{c.clienteNombre || '—'}</td>
                          <td className="px-3 py-3 text-right font-medium">{clp(c.total)}</td>
                          <td className="px-4 py-3 text-center rounded-r-2xl">
                            <span className={`inline-block px-3 py-0.5 text-xs rounded-full border ${est.color}`}>{est.label}</span>
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
        <div className="glass-panel rounded-widget overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="font-barlow text-base font-bold tracking-wide">PRÓXIMAS ENTREGAS</h2>
          </div>
          {proximas.length === 0 ? (
            <p className="px-6 py-10 text-center text-on-surface-variant text-sm font-dm">Sin fechas programadas</p>
          ) : (
            <div className="divide-y divide-white/40 px-2 pb-2">
              {proximas.map(c => {
                const dias = Math.ceil((new Date(c.fechaEntrega) - new Date()) / 86400000)
                return (
                  <div key={c.id} className="px-4 py-3 rounded-2xl">
                    <p className="font-medium text-sm font-dm text-on-surface">#{c.numero}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{c.clienteNombre || '—'}</p>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-on-surface-variant/70">{fechaCorta(c.fechaEntrega)}</p>
                      <span className={`text-xs font-medium ${dias <= 3 ? 'text-primary' : dias <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
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
