import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calculator, Users, FileText, ScrollText, Wallet } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/cotizador', icon: Calculator, label: 'Cotizador' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/contratos', icon: ScrollText, label: 'Contratos' },
  { to: '/gastos', icon: Wallet, label: 'Finanzas' },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-birth-black border-t border-white/10 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-6 px-1.5 pt-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex min-w-0 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${
                isActive ? 'text-white' : 'text-white/38 active:text-white/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-8 items-center justify-center rounded-md ${
                  isActive ? 'bg-birth-red text-white' : 'bg-transparent'
                }`}>
                  <Icon size={17} strokeWidth={2} />
                </span>
                <span className={`max-w-full truncate text-[8.5px] font-dm leading-none ${isActive ? 'text-white' : 'text-white/38'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
