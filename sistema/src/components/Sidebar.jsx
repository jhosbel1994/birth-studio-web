import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calculator, Users,
  FileText, ScrollText, Wallet, Image, Box, Frame,
  LogOut, KeyRound,
} from 'lucide-react'
import { doLogout, ModalCambiarPin } from '../pages/Login'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cotizador', icon: Calculator, label: 'Cotizador' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/contratos', icon: ScrollText, label: 'Contratos' },
  { to: '/gastos', icon: Wallet, label: 'Gastos & Finanzas' },
  { to: '/galeria', icon: Image, label: 'Galería' },
  { to: '/prototipo', icon: Box, label: 'Prototipo Logo' },
  { to: '/mockup-vitrina', icon: Frame, label: 'Mockup Vitrina' },
]

export default function Sidebar() {
  const [modalPin, setModalPin] = useState(false)

  const handleLogout = () => {
    if (!confirm('¿Cerrar sesión?')) return
    doLogout()
    window.location.reload()
  }

  return (
    <>
      {modalPin && <ModalCambiarPin onClose={() => setModalPin(false)} />}

      <aside className="w-72 h-full glass-sidebar rounded-r-widget flex flex-col fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="px-gutter py-8 flex flex-col items-center text-center">
          <img
            src="/cotizador/logo-birth-dark.png"
            alt="Birth Studio"
            className="h-12 w-auto object-contain mb-3"
          />
          <p className="font-dm text-[11px] text-on-surface-variant uppercase tracking-wider">Sistema interno</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-full text-sm font-dm transition-all duration-300 ${
                  isActive
                    ? 'bg-secondary-container/80 text-on-secondary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-white/40 hover:translate-x-1'
                }`
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer — acciones */}
        <div className="px-4 py-6 mt-auto space-y-1">
          <button
            onClick={() => setModalPin(true)}
            className="w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-full text-sm font-dm text-on-surface-variant hover:bg-white/40 hover:translate-x-1 transition-all duration-300"
            style={{ width: 'calc(100% - 1rem)' }}
          >
            <KeyRound size={16} strokeWidth={1.75} />
            Cambiar clave
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-full text-sm font-dm text-primary hover:bg-white/40 hover:translate-x-1 transition-all duration-300"
            style={{ width: 'calc(100% - 1rem)' }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            Cerrar sesión
          </button>
          <p className="text-on-surface-variant/50 text-xs font-dm px-6 pt-3 leading-relaxed">
            Birth Studio SpA
            <br />
            Talca, Chile
          </p>
        </div>
      </aside>
    </>
  )
}
